import { PLAN, TYPES } from './plan.js';
import { getFinishedSessionLogs, getLastPerformance } from './db.js';

// Kernidee: Der Plan ist eine fixe Reihenfolge von 6 Einheiten, die Wochentage
// im PDF sind nur Beispielverteilung. Die App rotiert einfach durch die Reihenfolge,
// unabhaengig davon, an welchem Kalendertag trainiert wird.
export async function getNextDay() {
  const logs = await getFinishedSessionLogs();
  if (!logs.length) return PLAN[0];
  const last = logs[0];
  const lastDay = PLAN.find((d) => d.id === last.dayId);
  const lastOrder = lastDay ? lastDay.order : -1;
  const nextOrder = (lastOrder + 1) % PLAN.length;
  return PLAN.find((d) => d.order === nextOrder) || PLAN[0];
}

export async function getLastCompletedInfo() {
  const logs = await getFinishedSessionLogs();
  if (!logs.length) return null;
  const last = logs[0];
  const day = PLAN.find((d) => d.id === last.dayId);
  return { day, finishedAt: last.finishedAt };
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
// "obere Wiederholungsgrenze in allen Arbeitssaetzen erreicht -> Last moderat erhoehen,
// sonst Gewicht beibehalten." Keine erfundenen Scores, keine KI-Einschaetzung.
export async function getProgressionSuggestion(exercise) {
  if (![TYPES.STRENGTH, TYPES.POWER].includes(exercise.type)) return null;
  const last = await getLastPerformance(exercise.id);
  if (!last) {
    return { status: 'no-data', text: 'Noch keine Daten. Waehle ein Gewicht, mit dem du die Zielwiederholungen bei 1-2 RIR gerade so schaffst.' };
  }
  const workSets = last.sets.filter((s) => !s.isWarmup && typeof s.reps === 'number');
  if (!workSets.length) {
    return { status: 'no-data', text: 'Keine Arbeitssaetze im letzten Log gefunden.' };
  }
  const repMax = exercise.reps ? exercise.reps.max : null;
  const lastWeight = workSets[workSets.length - 1].weightKg;
  const allAtTop = repMax != null && workSets.every((s) => s.reps >= repMax);
  const anyTechLoss = workSets.some((s) => s.technikverlust);

  if (anyTechLoss) {
    return {
      status: 'keep',
      lastWeight,
      text: 'Letztes Mal Technik-/ROM-Verlust vermerkt. Gewicht beibehalten und Ausfuehrung priorisieren.',
    };
  }
  if (allAtTop) {
    const inc = suggestedIncrement(lastWeight);
    if (inc == null) {
      return {
        status: 'increase-difficulty',
        lastWeight,
        text: 'Obere Wiederholungsgrenze in allen Arbeitssaetzen erreicht. Da koerpergewichtsbasiert: schwerere Variante oder mehr ROM erwaegen.',
      };
    }
    const suggested = roundToIncrement(lastWeight + inc, inc);
    return {
      status: 'increase',
      lastWeight,
      suggestedWeight: suggested,
      text: `Letztes Mal obere Wiederholungsgrenze (${repMax}) in allen Saetzen erreicht -> Last moderat erhoehen, z.B. auf ${suggested} kg.`,
    };
  }
  return {
    status: 'keep',
    lastWeight,
    text: `Gewicht beibehalten (${lastWeight != null ? lastWeight + ' kg' : 'wie zuletzt'}), bis obere Wiederholungsgrenze in allen Saetzen erreicht wird.`,
  };
}
