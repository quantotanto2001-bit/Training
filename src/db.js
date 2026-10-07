import { DEFAULT_SETTINGS, historyKey, entryExercise } from './training.js';
// Minimale IndexedDB-Persistenzschicht. Keine externen Abhängigkeiten.

const DB_NAME = 'universal-athlete-db';
const DB_VERSION = 3;
const STORE_LOGS = 'sessionLogs';
const STORE_ACTIVE = 'activeSession';
const STORE_PROGRAM = 'programState';
const STORE_EX_NOTES = 'exerciseNotes';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        const s = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
        s.createIndex('finishedAt', 'finishedAt');
        s.createIndex('dayId', 'dayId');
      }
      if (!db.objectStoreNames.contains(STORE_ACTIVE)) {
        db.createObjectStore(STORE_ACTIVE, { keyPath: 'id' });
      }
      // Expliziter Programmzustand (current_training_day / current_cycle), getrennt
      // von der Historie einzelner Sessions -> Skip/Recovery/Zyklus brauchen einen
      // Zeiger, der NICHT jedes Mal aus der Historie neu abgeleitet wird.
      if (!db.objectStoreNames.contains(STORE_PROGRAM)) {
        db.createObjectStore(STORE_PROGRAM, { keyPath: 'id' });
      }
      // Dauerhafte Notiz + "Nächstes Mal"-Absicht pro Übung, unabhängig von
      // einzelnen Sessions (z.B. "Sitzposition 3", "nächstes Mal 82.5kg").
      if (!db.objectStoreNames.contains(STORE_EX_NOTES)) {
        db.createObjectStore(STORE_EX_NOTES, { keyPath: 'exerciseId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getAllSessionLogs() {
  const store = await tx(STORE_LOGS, 'readonly');
  const all = await reqToPromise(store.getAll());
  return all.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
}

// Nur wirklich abgeschlossene (nicht übersprungene) Sessions -> Basis für
// Übungshistorie, Fortschritt und Progressionsempfehlung.
export async function getCompletedSessionLogs() {
  const all = await getAllSessionLogs();
  return all.filter((s) => s.status === 'completed' || s.status === 'partial' || (!s.status && s.finishedAt));
}

// Rückwärtskompatibler Alias.
export const getFinishedSessionLogs = getCompletedSessionLogs;

export async function saveSessionLog(log) {
  const store = await tx(STORE_LOGS, 'readwrite');
  log.updatedAt = new Date().toISOString();
  await reqToPromise(store.put(log));
  return log;
}

export async function deleteSessionLog(id) {
  const store = await tx(STORE_LOGS, 'readwrite');
  await reqToPromise(store.delete(id));
}

export async function getActiveSession() {
  const store = await tx(STORE_ACTIVE, 'readonly');
  const all = await reqToPromise(store.getAll());
  return all[0] || null;
}

let activeWrites = Promise.resolve();
export function setActiveSession(session) {
  const snapshot = session ? JSON.parse(JSON.stringify({ ...session, id: 'active' })) : null;
  const task = activeWrites.catch(() => {}).then(async () => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ACTIVE, 'readwrite');
      const store = transaction.objectStore(STORE_ACTIVE);
      if (snapshot) store.put(snapshot); else store.clear();
      transaction.oncomplete = resolve;
      transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('Speichern fehlgeschlagen'));
    });
  });
  activeWrites = task;
  return task;
}
export function clearActiveSession() { return setActiveSession(null); }

// Finish and advance in one transaction: a retry must never skip another day.
export function finishSession(log, expectedState, nextState) {
  const snapshot = JSON.parse(JSON.stringify(log));
  const task = activeWrites.catch(() => {}).then(async () => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_LOGS, STORE_ACTIVE, STORE_PROGRAM], 'readwrite');
      let problem;
      const fail = message => { problem = new Error(message); transaction.abort(); };
      const logs = transaction.objectStore(STORE_LOGS);
      const existing = logs.get(snapshot.id);
      existing.onsuccess = () => {
        if (existing.result) return; // Already committed, including its advance.
        const program = transaction.objectStore(STORE_PROGRAM);
        const request = program.get('program');
        request.onsuccess = () => {
          const state = request.result || DEFAULT_PROGRAM_STATE;
          if (state.currentDayOrder !== expectedState.currentDayOrder || state.currentCycle !== expectedState.currentCycle) {
            fail('Der Programmstand wurde inzwischen geändert.'); return;
          }
          logs.put({ ...snapshot, updatedAt: new Date().toISOString() });
          transaction.objectStore(STORE_ACTIVE).clear();
          program.put({ ...nextState, id: 'program' });
        };
      };
      transaction.oncomplete = resolve;
      transaction.onabort = transaction.onerror = () => reject(problem || transaction.error || new Error('Abschluss fehlgeschlagen'));
    });
  });
  activeWrites = task;
  return task;
}

// Liefert alle geloggten Sätze einer Übung über alle abgeschlossenen Sessions,
// neueste zuerst (jede Session-Historie einzeln, damit "letztes Training" klar bleibt).
export async function getExerciseHistory(exerciseId, setup = null) {
  const logs = await getFinishedSessionLogs();
  const out = [];
  for (const log of logs) {
    for (const [key, entry] of Object.entries(log.entries || {})) {
      if (historyKey(key, entry) !== exerciseId || !entry.sets?.length) continue;
      if (setup != null && (entry.setup || '') !== setup) continue;
      out.push({ date: log.finishedAt || log.startedAt, dayId: log.dayId, sets: entry.sets, status: log.status,
        plannedSets: entry.plannedSets, setup: entry.setup || '', feedback: entry.feedback, quality: entry.quality,
        rirReliable: ['4.0', '4.1'].includes(log.planVersion), exercise: entryExercise(key, entry, log) });
    }
  }
  return out;
}
export async function getLastPerformance(exerciseId, setup = '') {
  return (await getExerciseHistory(exerciseId, setup))[0] || null;
}

// --- Programmzustand: current_training_day (0-basiert) + current_cycle ---

const DEFAULT_PROGRAM_STATE = { id: 'program', currentDayOrder: 0, currentCycle: 1 };

export async function getProgramState() {
  const store = await tx(STORE_PROGRAM, 'readonly');
  const existing = await reqToPromise(store.get('program'));
  return existing || { ...DEFAULT_PROGRAM_STATE };
}

export async function setProgramState(state) {
  const store = await tx(STORE_PROGRAM, 'readwrite');
  await reqToPromise(store.put({ ...state, id: 'program' }));
}

// --- Übungsnotizen: dauerhafte Notiz + "Nächstes Mal"-Absicht pro Übung ---

export async function getExerciseNote(exerciseId) {
  const store = await tx(STORE_EX_NOTES, 'readonly');
  const existing = await reqToPromise(store.get(exerciseId));
  return existing || { exerciseId, note: '', nextTimeIntent: '' };
}

export async function getAllExerciseNotes() {
  const store = await tx(STORE_EX_NOTES, 'readonly');
  return reqToPromise(store.getAll());
}

export async function setExerciseNote(exerciseId, { note, nextTimeIntent, setup = '', increment = null, legacyWeightConventions = {} }) {
  const store = await tx(STORE_EX_NOTES, 'readwrite');
  await reqToPromise(store.put({ exerciseId, note: note || '', nextTimeIntent: nextTimeIntent || '', setup, increment, legacyWeightConventions, updatedAt: new Date().toISOString() }));
}

export async function getSettings() {
  const store = await tx(STORE_PROGRAM, 'readonly');
  return { ...DEFAULT_SETTINGS, ...((await reqToPromise(store.get('settings'))) || {}) };
}
export async function saveSettings(settings) {
  const old = await getSettings();
  const store = await tx(STORE_PROGRAM, 'readwrite');
  await reqToPromise(store.put({ ...old, ...settings, id: 'settings' }));
}

export async function exportAllData() {
  await activeWrites;
  const [sessionLogs, programState, exerciseNotes, settings, activeSession] = await Promise.all([
    getAllSessionLogs(), getProgramState(), getAllExerciseNotes(), getSettings(), getActiveSession(),
  ]);
  return { app: 'universal-athlete', exportVersion: 3, exportedAt: new Date().toISOString(),
    programState, sessionLogs, exerciseNotes, settings, activeSession };
}

export async function importAllData(data) {
  if (!data || !Array.isArray(data.sessionLogs) || (data.app && data.app !== 'universal-athlete')) throw new Error('Ungültige Backup-Datei');
  for (const log of data.sessionLogs) {
    if (!log || typeof log.id !== 'string' || !log.dayId || !log.entries || typeof log.entries !== 'object') throw new Error('Ungültiger Trainingseintrag');
    for (const entry of Object.values(log.entries)) if (!Array.isArray(entry.sets)) throw new Error('Ungültige Sätze');
  }
  if (data.exerciseNotes && (!Array.isArray(data.exerciseNotes) || data.exerciseNotes.some(n => typeof n.exerciseId !== 'string'))) throw new Error('Ungültige Notizen');
  if (data.programState && (!Number.isInteger(data.programState.currentDayOrder) || data.programState.currentDayOrder < 0 || data.programState.currentDayOrder > 5 || !Number.isInteger(data.programState.currentCycle) || data.programState.currentCycle < 1)) throw new Error('Ungültiger Programmstand');
  if (data.activeSession && (!data.activeSession.dayId || !data.activeSession.entries)) throw new Error('Ungültige laufende Einheit');
  await activeWrites;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LOGS, STORE_EX_NOTES, STORE_PROGRAM, STORE_ACTIVE], 'readwrite');
    const merge = (storeName, key, record) => {
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => {
        const old = request.result;
        if (!old || (record.updatedAt || record.finishedAt || '') > (old.updatedAt || old.finishedAt || '')) store.put(record);
      };
    };
    for (const log of data.sessionLogs) merge(STORE_LOGS, log.id, log);
    for (const note of data.exerciseNotes || []) merge(STORE_EX_NOTES, note.exerciseId, note);
    if (data.programState) {
      const currentActive = transaction.objectStore(STORE_ACTIVE).get('active');
      currentActive.onsuccess = () => { if (!currentActive.result) transaction.objectStore(STORE_PROGRAM).put({ ...data.programState, id: 'program' }); };
    }
    if (data.settings) transaction.objectStore(STORE_PROGRAM).put({ ...DEFAULT_SETTINGS, ...data.settings, id: 'settings' });
    if (data.activeSession) {
      const activeStore = transaction.objectStore(STORE_ACTIVE);
      const request = activeStore.get('active');
      request.onsuccess = () => { if (!request.result) activeStore.put({ ...data.activeSession, id: 'active' }); };
    }
    transaction.oncomplete = resolve;
    transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('Import fehlgeschlagen'));
  });
  return { importedCount: data.sessionLogs.length };
}
