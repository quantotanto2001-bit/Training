import { TYPES } from './plan.js';
import { plannedSets } from './training.js';
import { effectiveValue, loadSpec, loadText, validWeight, splitSides } from './measurements.js';

// No invented RIR, no power-to-failure rule, no comparison across variants/setup.
export function progressionFor(exercise, last, increment = null, history = []) {
  if (exercise.type === TYPES.POWER) return { status: 'quality', text: 'Höhe, Geschwindigkeit und saubere Ausführung zählen. Bei Qualitätsverlust erholen oder beenden; keine automatische Laststeigerung.' };
  if (exercise.tracking === 'neck' || exercise.directions) return { status: 'hold', text: 'Gleiche Kopf-/Handposition und Richtung verwenden. Haltezeit, Widerstand und Anstrengung vergleichen. Kontrolliert steigern, wenn alle Richtungen bei gleicher Position sicher gelingen.' };
  if (exercise.type === TYPES.SKILL) return { status: 'skill', text: 'Gleiche Variante vergleichen: saubere Versuche und kontrollierte Haltezeit. Erst bei stabiler Ausführung eine schwierigere Variante wählen.' };
  if (exercise.type === TYPES.CARDIO) return { status: 'cardio', text: 'Dauer und Strecke bei vergleichbarer Ausdauerform und Intensität betrachten. Locker: zusammenhängende Sätze sprechen können.' };
  if (exercise.type !== TYPES.STRENGTH) return { status: 'mobility', text: 'Bewegungsumfang und Kontrolle vergleichen. Ruhig arbeiten; zusätzliche Last oder tiefere Position nur kontrolliert steigern.' };
  if (!last) return { status: 'no-data', text: 'Erste Vergleichseinheit: ein gut kontrollierbares Arbeitsgewicht wählen und die tatsächlichen Wiederholungen eintragen.' };
  const spec = loadSpec(exercise);
  if (last.loadCompatible === false || (spec?.confirmLegacy && last.sets.some(s => !s.isWarmup && s.weightConvention !== spec.kind))) return { status: 'confirm-load', text: 'Frühere kg-Werte haben noch keine bestätigte Gewichtsangabe. Für eine Empfehlung müssen die Werte eindeutig zur angegebenen Last gehören. Alte Angaben bleiben erhalten.' };
  const sets = last.sets.filter(s => !s.isWarmup && effectiveValue(exercise, s) != null);
  if (!sets.length) return { status: 'no-data', text: 'Noch keine vergleichbaren Arbeitssätze gespeichert.' };
  const lastWeight = sets.at(-1).weightKg;
  const keep = text => ({ status: 'keep', lastWeight, text });
  if (sets.some(s => !validWeight(exercise, s.weightKg))) return { status: 'no-data', text: 'In der letzten Einheit fehlt ein gültiges Arbeitsgewicht. Heute das tatsächlich verwendete Gewicht eintragen; daraus wird die nächste Empfehlung berechnet.' };
  const adaptive = adaptationFor(exercise, history, increment);
  if (adaptive) return adaptive;
  if (sets.some(s => s.technikverlust) || last.feedback === 'limit' || last.quality === 'loss') return keep('Gewicht beibehalten und Ausführung prüfen. Letztes Mal wurde eine Grenze oder Qualitätsverlust gemeldet.');
  // A shorter past session is useful history, but cannot establish mastery of
  // today's larger prescription. Do not increase load and set count together.
  const required = Math.max(plannedSets(exercise), last.plannedSets || 0);
  if (sets.length < required || (last.status === 'partial' && !last.plannedSets)) return keep('Zuerst die heute vorgesehenen Arbeitssätze schaffen. Die letzte Einheit liefert noch keine vollständige Grundlage für eine Laststeigerung.');
  if (!sets.every(s => s.weightKg === lastWeight)) return keep('Die letzten Sätze hatten unterschiedliche Gewichte. Arbeitsgewicht bewusst wählen; keine automatische Steigerung.');
  if (last.rirReliable && sets.some(s => s.rir === '0' || s.rir === 'Versagen')) return keep('Letztes Mal wurde bis ans Limit trainiert. Gewicht zunächst beibehalten und sauber bestätigen.');
  if (exercise.perSide && sets.some(s => !splitSides(exercise, s))) return keep('Die früheren Werte wurden gemeinsam je Seite erfasst. Heute links und rechts getrennt bestätigen; für Steigerungen zählt die schwächere Seite.');
  if (exercise.reps && sets.every(s => effectiveValue(exercise, s) >= exercise.reps.max)) {
    if (lastWeight == null || lastWeight === 0) return { status: 'difficulty', text: 'Zielwiederholungen in allen Sätzen erreicht. Gleiche Ausführung bestätigen; anschließend Unterstützung oder Schwierigkeit gezielt anpassen.' };
    if (!Number.isFinite(increment) || increment <= 0) return { status: 'increase', lastWeight, text: 'Zielwiederholungen in allen vorgesehenen Sätzen erreicht. Bei gleicher sauberer Ausführung nächstes Mal den kleinsten verfügbaren Gewichtsschritt versuchen. Für einen konkreten kg-Vorschlag einmal deinen Gewichtsschritt hinterlegen.' };
    const step = increment;
    const suggestedWeight = Math.round((lastWeight + step) * 100) / 100;
    return { status: 'increase', lastWeight, suggestedWeight, text: `Alle vorgesehenen Sätze${exercise.perSide ? ' auf beiden Seiten' : ''} an der oberen Wiederholungsgrenze. Bei gleicher sauberer Ausführung ${loadText(exercise, suggestedWeight)} versuchen; deinen verfügbaren Gewichtsschritt beachten.` };
  }
  return keep('Gewicht beibehalten und zunächst Wiederholungen innerhalb des Zielbereichs steigern.');
}

export function setDefaults(exercise, currentSets, last) {
  const work = currentSets.filter(s => !s.isWarmup);
  const previous = work.at(-1) || (last?.loadCompatible !== false ? last?.sets.filter(s => !s.isWarmup)[0] : null) || {};
  // History is a reference, not a newly performed set or a fresh effort rating.
  const spec = loadSpec(exercise), unconfirmed = spec?.confirmLegacy && previous.weightConvention !== spec.kind;
  return { weightKg: unconfirmed ? null : previous.weightKg ?? null, resistance: previous.resistance || '', setup: previous.setup || '',
    durationMin: previous.durationSec ? previous.durationSec / 60 : null };
}

function comparableRows(ex, history) {
  const spec = loadSpec(ex);
  return history.filter(row => row.loadCompatible !== false).map(row => ({ ...row, work: row.sets.filter(s => !s.isWarmup) }))
    .filter(row => row.work.length >= Math.max(plannedSets(ex), row.plannedSets || 0) && (row.status !== 'partial' || row.plannedSets) && row.work.every(s => effectiveValue(ex, s) != null && validWeight(ex, s.weightKg) && (!spec?.confirmLegacy || s.weightConvention === spec.kind) && (!ex.perSide || splitSides(ex, s))));
}
const sameLoad = (a,b) => a.length === b.length && a.every((s,i) => s.weightKg === b[i].weightKg && (s.weightConvention || '') === (b[i].weightConvention || ''));
const qualityLost = row => row.quality === 'loss' || row.feedback === 'limit' || row.work.some(s => s.technikverlust);

// Explainable heuristics, not a diagnosis or a supposedly optimal recovery score.
export function adaptationFor(ex, history, increment = null) {
  if (ex.type !== TYPES.STRENGTH || !ex.reps || history.length < 2) return null;
  const rows = comparableRows(ex, history).slice(0, 3);
  if (rows.length < 2 || !sameLoad(rows[0].work, rows[1].work)) return null;
  const recent = rows.slice(0,2), weight = rows[0].work.at(-1).weightKg;
  const failed = recent.every(row => qualityLost(row) || row.work.some(s => effectiveValue(ex, s) < ex.reps.min));
  if (failed) {
    const reduceLoad = Number.isFinite(increment) && increment > 0 && rows[0].work.every(s => s.weightKg === weight) && validWeight(ex, weight - increment);
    return { status: 'adjust', lastWeight: weight, ...(reduceLoad ? { suggestedWeight: Math.round((weight - increment) * 100) / 100 } : ex.sets >= 3 ? { suggestedSets: ex.sets - 1 } : {}), text: `In zwei vergleichbaren Einheiten wurde die Untergrenze verfehlt oder Ausführungsverlust gemeldet. ${reduceLoad ? 'Heute einen verfügbaren Gewichtsschritt leichter testen.' : ex.sets >= 3 ? 'Heute versuchsweise einen Arbeitssatz weniger wählen und die Ausführung bestätigen.' : 'Aufbau, Unterstützung und Erholung prüfen; heute sauber bestätigen.'} Das ist eine vorsichtige Anpassungsregel, keine Diagnose.` };
  }
  if (rows.length < 3 || rows.some(qualityLost) || !sameLoad(rows[1].work, rows[2].work)) return null;
  const totals = rows.map(row => row.work.reduce((n,s) => n + effectiveValue(ex,s), 0));
  if (totals[0] <= totals[1] && totals[1] <= totals[2] && !rows[0].work.every(s => effectiveValue(ex,s) >= ex.reps.max)) return { status: 'plateau', lastWeight: weight, text: 'In drei vergleichbaren Einheiten kam bei gleicher Last und Satzzahl keine Wiederholung hinzu. Für heute eine zusätzliche saubere Wiederholung insgesamt anstreben. Falls Ermüdung der Grund ist, kannst du einmal einen Satz weniger testen; Schlaf, Pausen und Aufbau prüfen.', ...(ex.sets >= 3 ? { suggestedSets: ex.sets - 1 } : {}) };
  return null;
}

export function comparePerformance(ex, newer, older) {
  if (!newer || !older || newer.loadCompatible === false || older.loadCompatible === false) return null;
  const a = newer.sets.filter(s => !s.isWarmup), b = older.sets.filter(s => !s.isWarmup);
  if (!a.length || a.length !== b.length || qualityLost({ ...newer, work: a }) || qualityLost({ ...older, work: b })) return null;
  if (ex.perSide && [...a,...b].some(s => !splitSides(ex,s))) return null;
  if (a.some((s,i) => (s.weightConvention || '') !== (b[i].weightConvention || '') || (ex.perSide && splitSides(ex,s) !== splitSides(ex,b[i])))) return null;
  if (ex.type === TYPES.STRENGTH && ex.reps && a.every((s,i) => validWeight(ex,s.weightKg) && validWeight(ex,b[i].weightKg) && effectiveValue(ex,s) != null && effectiveValue(ex,b[i]) != null)) {
    if (a.every((s,i) => Number.isFinite(s.weightKg) && Number.isFinite(b[i].weightKg) && s.weightKg > b[i].weightKg && effectiveValue(ex,s) >= ex.reps.min)) return { kind: 'load', text: `Laststeigerung bestätigt: ${loadText(ex, b[0].weightKg)} → ${loadText(ex, a[0].weightKg)} bei gleicher Satzzahl und Wiederholungen im Zielbereich.` };
    if (sameLoad(a,b)) {
      const delta = a.reduce((n,s) => n + effectiveValue(ex,s),0) - b.reduce((n,s) => n + effectiveValue(ex,s),0);
      return { kind: 'reps', delta, text: `Bei gleichen Gewichten und gleicher Satzzahl: ${delta > 0 ? '+' : ''}${delta} Wiederholungen${ex.perSide ? ' auf der jeweils schwächeren Seite' : ''} gegenüber der vorherigen Einheit.` };
    }
  }
  if (ex.holdSec && sameLoad(a,b) && a.every((s,i) => effectiveValue(ex,s,'holdSec') != null && effectiveValue(ex,b[i],'holdSec') != null)) {
    const delta = a.reduce((n,s) => n + effectiveValue(ex,s,'holdSec'),0) - b.reduce((n,s) => n + effectiveValue(ex,s,'holdSec'),0);
    return { kind: 'hold', text: `Bei gleichem Aufbau und gleicher Satzzahl: ${delta > 0 ? '+' : ''}${delta} Sekunden Haltezeit${ex.perSide ? ' auf der jeweils schwächeren Seite' : ''}. Gleichen Bewegungsumfang und Widerstand selbst bestätigen.` };
  }
  return null;
}
