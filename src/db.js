// Minimale IndexedDB-Persistenzschicht. Keine externen Abhängigkeiten.

const DB_NAME = 'universal-athlete-db';
const DB_VERSION = 2;
const STORE_LOGS = 'sessionLogs';
const STORE_ACTIVE = 'activeSession';
const STORE_PROGRAM = 'programState';

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
  return all.filter((s) => s.status === 'completed' || (!s.status && s.finishedAt));
}

// Rückwärtskompatibler Alias.
export const getFinishedSessionLogs = getCompletedSessionLogs;

export async function saveSessionLog(log) {
  const store = await tx(STORE_LOGS, 'readwrite');
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

export async function setActiveSession(session) {
  const store = await tx(STORE_ACTIVE, 'readwrite');
  await reqToPromise(store.clear());
  if (session) await reqToPromise(store.put({ ...session, id: 'active' }));
}

export async function clearActiveSession() {
  await setActiveSession(null);
}

// Liefert alle geloggten Sätze einer Übung über alle abgeschlossenen Sessions,
// neueste zuerst (jede Session-Historie einzeln, damit "letztes Training" klar bleibt).
export async function getExerciseHistory(exerciseId) {
  const logs = await getFinishedSessionLogs();
  const out = [];
  for (const log of logs) {
    const entry = log.entries && log.entries[exerciseId];
    if (entry && entry.sets && entry.sets.length) {
      out.push({ date: log.finishedAt || log.startedAt, dayId: log.dayId, sets: entry.sets });
    }
  }
  return out; // bereits neueste zuerst, da logs sortiert
}

export async function getLastPerformance(exerciseId) {
  const history = await getExerciseHistory(exerciseId);
  return history[0] || null;
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

// --- Backup: Export/Import, da alle Daten sonst nur lokal auf dem Gerät liegen ---

export async function exportAllData() {
  const [logs, programState] = await Promise.all([getAllSessionLogs(), getProgramState()]);
  return {
    app: 'universal-athlete', exportVersion: 1, exportedAt: new Date().toISOString(),
    programState, sessionLogs: logs,
  };
}

// Fügt importierte Sessions additiv hinzu (upsert nach id, überschreibt lokale
// Duplikate nicht mit älteren Daten) und stellt den Programmzustand wieder her.
export async function importAllData(data) {
  if (!data || !Array.isArray(data.sessionLogs)) throw new Error('Ungültige Backup-Datei');
  const store = await tx(STORE_LOGS, 'readwrite');
  for (const log of data.sessionLogs) {
    await reqToPromise(store.put(log));
  }
  if (data.programState) {
    await setProgramState(data.programState);
  }
  return { importedCount: data.sessionLogs.length };
}
