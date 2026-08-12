import { PLAN, TYPES } from './plan.js';
import {
  getCompletedSessionLogs, getAllSessionLogs, getLastPerformance,
  getProgramState, setProgramState, saveSessionLog, clearActiveSession, uid,
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

async function advance() {
  const state = await getProgramState();
  const completedCycleNumber = state.currentCycle;
  const nextOrder = (state.currentDayOrder + 1) % PLAN.length;
  const cycleJustCompleted = nextOrder === 0; // Tag 6 -> Tag 1 gewechselt
  const nextCycle = cycleJustCompleted ? state.currentCycle + 1 : state.currentCycle;
  await setProgramState({ currentDayOrder: nextOrder, currentCycle: nextCycle });
  return { cycleJustCompleted, completedCycleNumber };
}

// Wird aufgerufen, wenn eine gestartete Einheit bewusst vollständig abgeschlossen wird.
export async function completeCurrentDay(activeSession) {
  const state = await getProgramState();
  const day = PLAN.find((d) => d.order === state.currentDayOrder);
  const log = {
    ...activeSession,
    id: activeSession.id || uid(),
    dayId: day.id,
    status: 'completed',
    cycle: state.currentCycle,
    // Beim nachtraeglichen Eintragen setzt die Workout-Ansicht finishedAt bereits
    // bewusst auf ein vergangenes Datum -> dann nicht mit "jetzt" ueberschreiben.
    finishedAt: activeSession.finishedAt || new Date().toISOString(),
  };
  await saveSessionLog(log);
  await clearActiveSession();
  return advance();
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
  await saveSessionLog(log);
  return advance();
}

function roundToIncrement(value, increment) {
  return Math.round(value / increment) * increment;
}

function suggestedIncrement(weightKg) {
  if (weightKg == null) return null;
  if (weightKg >= 20) return 2.5;
  if (weightKg > 0) return 1.25;
  return null;
}

// Implementiert exakt die im Plan genannte Regel (Progression & Sicherheitsregeln):
// "obere Wiederholungsgrenze in allen Arbeitssätzen erreicht -> Last moderat
// erhöhen, sonst Gewicht beibehalten." Keine erfundenen Scores, keine KI-Einschätzung.
// Historie (was tatsächlich war) und Empfehlung (was als Nächstes sinnvoll wäre)
// bleiben getrennt - die App übernimmt nichts automatisch.
export async function getProgressionSuggestion(exercise) {
  if (![TYPES.STRENGTH, TYPES.POWER].includes(exercise.type)) return null;
  const last = await getLastPerformance(exercise.id);
  if (!last) {
    return { status: 'no-data', text: 'Noch keine Daten. Wähle ein Gewicht, mit dem du die Zielwiederholungen bei 1-2 RIR gerade so schaffst.' };
  }
  const workSets = last.sets.filter((s) => !s.isWarmup && typeof s.reps === 'number');
  if (!workSets.length) {
    return { status: 'no-data', text: 'Keine Arbeitssätze im letzten Log gefunden.' };
  }
  const repMax = exercise.reps ? exercise.reps.max : null;
  const lastWeight = workSets[workSets.length - 1].weightKg;
  const allAtTop = repMax != null && workSets.every((s) => s.reps >= repMax);
  const anyTechLoss = workSets.some((s) => s.technikverlust);

  if (anyTechLoss) {
    return {
      status: 'keep', lastWeight,
      text: 'Letztes Mal Technik-/ROM-Verlust vermerkt. Gewicht beibehalten und Ausführung priorisieren.',
    };
  }
  if (allAtTop) {
    const inc = suggestedIncrement(lastWeight);
    if (inc == null) {
      return {
        status: 'increase-difficulty', lastWeight,
        text: 'Obere Wiederholungsgrenze in allen Arbeitssätzen erreicht. Da körpergewichtsbasiert: schwerere Variante oder mehr ROM erwägen.',
      };
    }
    const suggested = roundToIncrement(lastWeight + inc, inc);
    return {
      status: 'increase', lastWeight, suggestedWeight: suggested,
      text: `Letztes Mal obere Wiederholungsgrenze (${repMax}) in allen Sätzen erreicht -> Empfehlung: Gewicht moderat erhöhen, z.B. auf ${suggested} kg.`,
    };
  }
  return {
    status: 'keep', lastWeight,
    text: `Empfehlung: Gewicht beibehalten (${lastWeight != null ? lastWeight + ' kg' : 'wie zuletzt'}), bis obere Wiederholungsgrenze in allen Sätzen erreicht wird.`,
  };
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
  return { cycleNumber, completedCount: completed.length, skippedCount: skipped.length, durationDays };
}
