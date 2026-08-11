// Minimale IndexedDB-Persistenzschicht. Keine externen Abhaengigkeiten.

const DB_NAME = 'universal-athlete-db';
const DB_VERSION = 1;
const STORE_LOGS = 'sessionLogs';
const STORE_ACTIVE = 'activeSession';

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

export async function getFinishedSessionLogs() {
  const all = await getAllSessionLogs();
  return all.filter((s) => s.finishedAt);
}

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

// Liefert alle geloggten Saetze einer Uebung ueber alle abgeschlossenen Sessions,
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
