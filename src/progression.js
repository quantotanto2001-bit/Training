import { TYPES } from './plan.js';
import { plannedSets } from './training.js';

// No invented RIR, no power-to-failure rule, no comparison across variants/setup.
export function progressionFor(exercise, last, increment = null) {
  if (exercise.type === TYPES.POWER) return { status: 'quality', text: 'Höhe, Geschwindigkeit und saubere Ausführung zählen. Bei Qualitätsverlust erholen oder beenden; keine automatische Laststeigerung.' };
  if (exercise.tracking === 'neck' || exercise.directions) return { status: 'hold', text: 'Gleiche Kopf-/Handposition und Richtung verwenden. Haltezeit, Widerstand und Anstrengung vergleichen. Kontrolliert steigern, wenn alle Richtungen bei gleicher Position sicher gelingen.' };
  if (exercise.type === TYPES.SKILL) return { status: 'skill', text: 'Gleiche Variante vergleichen: saubere Versuche und kontrollierte Haltezeit. Erst bei stabiler Ausführung eine schwierigere Variante wählen.' };
  if (exercise.type === TYPES.CARDIO) return { status: 'cardio', text: 'Dauer und Strecke bei vergleichbarer Ausdauerform und Intensität betrachten. Locker: zusammenhängende Sätze sprechen können.' };
  if (exercise.type !== TYPES.STRENGTH) return { status: 'mobility', text: 'Bewegungsumfang und Kontrolle vergleichen. Ruhig arbeiten; zusätzliche Last oder tiefere Position nur kontrolliert steigern.' };
  if (!last) return { status: 'no-data', text: 'Erste Vergleichseinheit: ein gut kontrollierbares Arbeitsgewicht wählen und die tatsächlichen Wiederholungen eintragen.' };
  const sets = last.sets.filter(s => !s.isWarmup && Number.isFinite(s.reps));
  if (!sets.length) return { status: 'no-data', text: 'Noch keine vergleichbaren Arbeitssätze gespeichert.' };
  const lastWeight = sets.at(-1).weightKg;
  const keep = text => ({ status: 'keep', lastWeight, text });
  if (sets.some(s => s.technikverlust) || last.feedback === 'limit' || last.quality === 'loss') return keep('Gewicht beibehalten und Ausführung prüfen. Letztes Mal wurde eine Grenze oder Qualitätsverlust gemeldet.');
  // A shorter past session is useful history, but cannot establish mastery of
  // today's larger prescription. Do not increase load and set count together.
  const required = Math.max(plannedSets(exercise), last.plannedSets || 0);
  if (last.status === 'partial' || sets.length < required) return keep('Zuerst die heute vorgesehenen Arbeitssätze schaffen. Die letzte Einheit liefert noch keine vollständige Grundlage für eine Laststeigerung.');
  if (!sets.every(s => s.weightKg === lastWeight)) return keep('Die letzten Sätze hatten unterschiedliche Gewichte. Arbeitsgewicht bewusst wählen; keine automatische Steigerung.');
  if (last.rirReliable && sets.some(s => s.rir === '0' || s.rir === 'Versagen')) return keep('Letztes Mal wurde bis ans Limit trainiert. Gewicht zunächst beibehalten und sauber bestätigen.');
  if (exercise.reps && sets.every(s => s.reps >= exercise.reps.max)) {
    if (lastWeight == null || lastWeight === 0) return { status: 'difficulty', text: 'Zielwiederholungen in allen Sätzen erreicht. Gleiche Ausführung bestätigen; anschließend Unterstützung oder Schwierigkeit gezielt anpassen.' };
    const step = Number.isFinite(increment) && increment > 0 ? increment : (lastWeight >= 20 ? 2.5 : 1);
    const suggestedWeight = Math.round((lastWeight + step) * 100) / 100;
    return { status: 'increase', lastWeight, suggestedWeight, text: `Alle vorgesehenen Sätze an der oberen Wiederholungsgrenze. Bei gleicher sauberer Ausführung ${suggestedWeight} kg versuchen; deinen verfügbaren Gewichtsschritt beachten.` };
  }
  return keep('Gewicht beibehalten und zunächst Wiederholungen innerhalb des Zielbereichs steigern.');
}

export function setDefaults(exercise, currentSets, last) {
  const work = currentSets.filter(s => !s.isWarmup);
  const previous = work.at(-1) || last?.sets.filter(s => !s.isWarmup)[0] || {};
  // History is a reference, not a newly performed set or a fresh effort rating.
  return { weightKg: previous.weightKg ?? null, resistance: previous.resistance || '', setup: previous.setup || '',
    durationMin: previous.durationSec ? previous.durationSec / 60 : null };
}
