import { PLAN, TYPES } from './plan.js';
import { progressionFor } from './progression.js';
import {
  getCompletedSessionLogs, getAllSessionLogs, getLastPerformance,
  getProgramState, finishSession, uid,
} from './db.js';

// Kernidee: current_training_day/current_cycle sind ein expliziter Zeiger,
// getrennt von der Historie. Kalendertage ändern daran nichts - nur ein
// bewusstes "abschliessen" oder "überspringen" bewegt den Zeiger.

export async function getCurrentDay() {
  const state = await getProgramState();
  return PLAN.find((d) => d.order === state.currentDayOrder) || PLAN[0];
}

export async function getCurrentProgramState() {
  return getProgramState();
}

async function finishAndAdvance(log, state) {
  const completedCycleNumber = state.currentCycle;
  const nextOrder = (state.currentDayOrder + 1) % PLAN.length;
  const cycleJustCompleted = nextOrder === 0; // Tag 6 -> Tag 1 gewechselt
  const nextCycle = cycleJustCompleted ? state.currentCycle + 1 : state.currentCycle;
  await finishSession(log, state, { currentDayOrder: nextOrder, currentCycle: nextCycle });
  return { cycleJustCompleted, completedCycleNumber };
}

// Wird aufgerufen, wenn eine gestartete Einheit bewusst vollständig abgeschlossen wird.
export async function completeCurrentDay(activeSession, status = 'completed') {
  const state = await getProgramState();
  const day = PLAN.find((d) => d.order === state.currentDayOrder);
  if (activeSession.dayId !== day.id) throw new Error('Laufende Einheit und Programmstand stimmen nicht überein.');
  const log = {
    ...activeSession,
    id: activeSession.sessionId || (activeSession.id !== 'active' && activeSession.id) || uid(),
    dayId: day.id,
    status,
    cycle: state.currentCycle,
    // Beim nachtraeglichen Eintragen setzt die Workout-Ansicht finishedAt bereits
    // bewusst auf ein vergangenes Datum -> dann nicht mit "jetzt" ueberschreiben.
    finishedAt: activeSession.finishedAt || new Date().toISOString(),
  };
  return finishAndAdvance(log, state);
}

// Bewusstes Überspringen einer noch nicht gestarteten Einheit (kein aktives Training nötig).
export async function skipCurrentDay(reason) {
  const state = await getProgramState();
  const day = PLAN.find((d) => d.order === state.currentDayOrder);
  const now = new Date().toISOString();
  const log = {
    id: uid(), dayId: day.id, status: 'skipped', skipReason: reason || null,
    cycle: state.currentCycle, startedAt: now, finishedAt: now, entries: {},
  };
  return finishAndAdvance(log, state);
}

export async function getProgressionSuggestion(exercise, setup = '', increment = null) {
  return progressionFor(exercise, await getLastPerformance(exercise.id, setup), increment);
}

const RECOVERY_THRESHOLD_HOURS = 18;

// Reiner Regel-Hinweis (kein Recovery-Score, keine KI): wenn die nächste
// Einheit selbst eine intensive Full-Body-Einheit ist UND die letzte
// abgeschlossene Full-Body-Einheit erst vor kurzem war, wird ein Hinweis
// angeboten. Die Entscheidung bleibt beim Nutzer, der Plan wird nicht verändert.
export async function getRecoveryHint(day) {
  if (!day.isFullBody) return null;
  const fullBodyIds = new Set(PLAN.filter((d) => d.isFullBody).map((d) => d.id));
  const logs = await getCompletedSessionLogs();
  const lastFullBody = logs.find((l) => fullBodyIds.has(l.dayId));
  if (!lastFullBody || !lastFullBody.finishedAt) return null;
  const hoursSince = (Date.now() - new Date(lastFullBody.finishedAt).getTime()) / 3600000;
  if (hoursSince < 0 || hoursSince >= RECOVERY_THRESHOLD_HOURS) return null;
  return 'Du hast vor kurzer Zeit bereits eine intensive Ganzkörpereinheit absolviert. Etwas zusätzliche Erholung wäre sinnvoll.';
}

export async function computeCycleSummary(cycleNumber) {
  const logs = await getAllSessionLogs();
  const inCycle = logs.filter((l) => l.cycle === cycleNumber);
  const completed = inCycle.filter((l) => l.status === 'completed');
  const partial = inCycle.filter((l) => l.status === 'partial');
  const skipped = inCycle.filter((l) => l.status === 'skipped');
  const dates = inCycle.map((l) => l.startedAt).filter(Boolean).sort();
  let durationDays = null;
  if (dates.length >= 2) {
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    durationDays = Math.max(1, Math.round((last - first) / (1000 * 60 * 60 * 24)) + 1);
  } else if (dates.length === 1) {
    durationDays = 1;
  }
  return { cycleNumber, completedCount: completed.length, skippedCount: skipped.length, partialCount: partial.length, durationDays };
}
