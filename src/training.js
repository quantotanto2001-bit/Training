import { PLAN, TYPES, allExercises } from './plan.js';

// Versioned prescriptions; the original catalogue remains available for old logs.
export const PLAN_VERSION = '4.0';
export const DEFAULT_SETTINGS = { strengthMinutes: 60, otherMinutes: 30, focus: 'allround', variants: {}, increments: {} };
export const GROUP_LABELS = {
  verticalPull: 'Vertikales Ziehen', row: 'Rudern', chestPush: 'Brust / Trizeps',
  shoulderPush: 'Schulterdrücken', knee: 'Knie / Gesäß', hinge: 'Hüftbeuge',
  kneeFlexion: 'Kniebeugung / Beinrückseite', calf: 'Waden', shin: 'Schienbein',
  core: 'Rumpf', neck: 'Nacken', rotation: 'Schulterrotation', power: 'Schnellkraft',
  mobility: 'Beweglichkeit', cardio: 'Ausdauer', skill: 'Fertigkeit', conditioning: 'Conditioning',
};
const GROUPS = {
  verticalPull: ['mo-pullup'], row: ['do-ringrow', 'sa-cablerow'],
  chestPush: ['mo-dip', 'do-bench', 'sa-ringpushup'], shoulderPush: ['do-ohp'],
  knee: ['mo-splitsquat', 'mo-gobletsquat', 'do-pistol', 'do-revnordic', 'sa-revlunge'],
  hinge: ['mo-rdl', 'do-hipthrust'], kneeFlexion: ['mo-nordic', 'do-nordic'],
  calf: ['mo-calf'], shin: ['sa-tibialis'], core: ['sa-leraise'],
  neck: ['mo-neck', 'do-neck', 'sa-neck'], rotation: ['mo-extrot', 'do-scappullup'],
};
const original = new Map(allExercises().map(e => [e.id, e]));
const copy = value => JSON.parse(JSON.stringify(value));

export function groupFor(exercise) {
  const id = exercise.slotId || exercise.id.split('~')[0];
  return Object.entries(GROUPS).find(([, ids]) => ids.includes(id))?.[0]
    || ({ power: 'power', cardio: 'cardio', skill: 'skill', finisher: 'conditioning' })[exercise.type] || 'mobility';
}

// Only same-purpose replacements are offered. Hip thrust never replaces knee
// flexion; ordinary rows never replace vertical pulls or explosive pull-ups.
const CHOICES = {
  'mo-dip': [{ key: 'bench-db', source: 'do-bench', name: 'Kurzhantel-Bankdrücken', note: 'Gleicher Schwerpunkt Brust/Trizeps; anderer Druckwinkel. Bankdrücken und Ring-Dips getrennt vergleichen.' }],
  'do-bench': [{ key: 'bench-guided', source: 'do-bench', name: 'Geführtes Bankdrücken', note: 'Nutze die bereits vorhandene geführte Variante. Sitzposition und Griff festhalten.' }, { key: 'ring-pushup', source: 'sa-ringpushup', name: 'Ringliegestütz', note: 'Brust/Trizeps bleiben der Schwerpunkt. Ringhöhe und Fußposition festhalten; Stabilität kann begrenzen.' }],
  'sa-ringpushup': [{ key: 'bench-db', source: 'do-bench', name: 'Kurzhantel-Bankdrücken', note: 'Brust/Trizeps bleiben der Schwerpunkt. Eine eigene Gewichtsreihe beginnt.' }],
  'mo-splitsquat': [{ key: 'stepup', source: 'do-pistol', name: 'Step-up mit Kurzhanteln', note: 'Beide Beine gleich trainieren. Eine stabile Auflage wie im bisherigen Plan nutzen; Höhe und Unterstützung gleich halten.' }],
  'do-pistol': [{ key: 'stepup', source: 'do-pistol', name: 'Step-up mit Kurzhanteln', note: 'Stabile Auflage aus deinem bisherigen Aufbau; Höhe und Unterstützung dokumentieren. Mit dem oberen Bein hochdrücken.' }, { key: 'bulgarian', source: 'mo-splitsquat', name: 'Bulgarian Split Squat mit Kurzhanteln', note: 'Einbeinige Knie-/Hüftstreckung. Standlänge und kontrollierte Tiefe gleich halten.' }],
  'sa-revlunge': [{ key: 'split-squat', source: 'mo-splitsquat', name: 'Split Squat mit Kurzhanteln', note: 'Hinterer Fuß bleibt am Boden. Beide Seiten gleich trainieren; Standlänge und Tiefe konstant halten.' }],
  'do-ringrow': [{ key: 'cable-row', source: 'sa-cablerow', name: 'Kabelrudern', note: 'Horizontaler Zug bleibt erhalten. Gleicher Griff und Sitzabstand; Kabelgewichte nicht mit Ringrudern vergleichen.' }],
  'sa-cablerow': [{ key: 'ring-row', source: 'do-ringrow', name: 'Ringrudern', note: 'Horizontaler Zug bleibt erhalten. Ringhöhe, Körperwinkel und Fußposition dokumentieren.' }],
  'mo-rdl': [{ key: 'rdl-guided', source: 'mo-rdl', name: 'RDL an vorhandener geführter Station', note: 'Nur verwenden, wenn deine Station die Hüftbeuge zulässt. Knie leicht gebeugt, Hüfte nach hinten; eigene Lastreihe.' }],
};

function baseExercise(id) {
  const source = id === 'mi-cardio' ? { ...original.get('di-cardio'), id, name: 'Kurze lockere Ausdauer', durationSec: { min: 900, max: 1200 } } : original.get(id);
  if (!source) throw new Error('Unbekannte Übung: ' + id);
  const ex = { ...copy(source), slotId: id, iconId: id === 'mi-cardio' ? 'di-cardio' : id };
  ex.group = groupFor(ex);
  if (id === 'do-bench') { ex.name = 'Kurzhantel-Bankdrücken'; ex.id = id + '~db'; }
  if (id === 'mo-rdl') { ex.name = 'RDL mit Kurzhanteln'; ex.id = id + '~db'; }
  if (id === 'sa-revlunge') { ex.name = 'Reverse Lunge mit Kurzhanteln'; ex.id = id + '~reverse'; }
  if (id === 'sa-rotpower') ex.name = 'Explosive Kabelrotation';
  if (ex.group === 'neck') {
    ex.tracking = 'neck';
    ex.note = 'Kopf neutral und still. Widerstand mit der Hand allmählich aufbauen. Gleiche Handposition, Richtung und Anstrengung dokumentieren. Nur kontrolliert und beschwerdefrei steigern; Sekunden allein messen keine Nackenkraft.';
  }
  if (ex.type === TYPES.POWER) {
    ex.targetRIR = null;
    ex.note = 'Schnell und sauber ausführen. Bei deutlich geringerer Höhe/Geschwindigkeit den Satz beenden und erholen.' + (id === 'sa-rotpower' ? ' Kabelgriff festhalten, nicht loslassen.' : '');
  }
  return ex;
}

export function alternativesFor(slotId) {
  return (CHOICES[slotId] || []).map(choice => ({ ...choice }));
}

export function resolveExercise(slotId, variant = '') {
  const base = baseExercise(slotId);
  const choice = (CHOICES[slotId] || []).find(c => c.key === variant);
  if (!choice) return base;
  const source = baseExercise(choice.source);
  return { ...source, id: slotId + '~' + choice.key, slotId, variant: choice.key, name: choice.name,
    group: base.group, alternativeNote: choice.note,
    // A tutorial for a different variant must not be labelled as the exact exercise.
    video: source.video ? { ...source.video, match: 'ähnlich', note: choice.note + ' ' + (source.video.note || '') } : null };
}

const CORE = {
  mo: ['mo-pullup', 'mo-dip', 'mo-splitsquat', 'mo-rdl', 'mo-nordic'],
  do: ['do-pistol', 'do-bench', 'do-ringrow', 'do-ohp', 'do-neck'],
  sa: ['sa-pogo', 'sa-explosivepullup', 'sa-revlunge', 'sa-ringpushup', 'sa-cablerow', 'sa-leraise'],
  di: ['di-cardio', 'di-aslr', 'di-hipflexor'],
  mi: ['mi-cardio', 'mi-shouldercars', 'mi-9090', 'mo-extrot'],
  fr: ['fr-cossack', 'fr-adductor', 'fr-frog', 'mo-calf'],
};
const EXTRAS = {
  mo: ['mo-calf', 'mo-extrot', 'mo-jump', 'mo-neck', 'mo-gobletsquat'],
  do: ['do-lsit', 'do-handstand', 'do-hipthrust', 'do-nordic', 'do-revnordic', 'do-scappullup', 'do-wallshoulder', 'do-pikelift', 'do-straddlegm', 'do-pancake', 'do-latstretch'],
  sa: ['sa-tibialis', 'sa-rotpower', 'sa-neck', 'sa-finisher'],
  di: ['di-frontsplit', 'di-atg', 'di-rdl-light'],
  mi: ['mi-thoracic', 'mi-wrist', 'mi-hang', 'mi-cossack', 'mi-squatpry', 'mi-catcow'],
  fr: ['fr-middlesplit', 'fr-laterallunge', 'fr-horsestance'],
};

export function timeOptions(day) { return day.isFullBody ? [45, 60, 90] : [20, 30, 45, 60]; }
export function defaultMinutes(day, settings = DEFAULT_SETTINGS) {
  return day.isFullBody ? (settings.strengthMinutes || 60) : (settings.otherMinutes || 30);
}
export function plannedSets(ex) { return (ex.sets || 1) * (ex.directions?.length || 1); }
export function prescription(ex) {
  if (ex.durationSec) return `${Math.round(ex.durationSec.min / 60)} Min${ex.type === TYPES.SKILL ? ' saubere Versuche inkl. Pausen' : ''}`;
  const amount = ex.reps ? `${ex.reps.min}–${ex.reps.max} Wdh.` : ex.holdSec ? `${ex.holdSec.min}–${ex.holdSec.max} Sek.` : '';
  return `${ex.sets || 1} × ${amount}${ex.perSide ? ' je Seite' : ''}${ex.directions ? ' je Richtung' : ''}`;
}
export function exerciseSeconds(ex) {
  if (ex.durationSec) return ex.durationSec.min + 30;
  const n = plannedSets(ex);
  const repTime = ex.type === TYPES.POWER ? 2 : 4;
  const work = ((ex.reps?.max || 0) * repTime + (ex.holdSec?.max || 0)) * (ex.perSide ? 2 : 1);
  const warmup = { heavy: 180, moderate: 90, power: 90, light: 30 }[ex.warmup] || 0;
  return n * Math.max(work, 15) + Math.max(0, n - 1) * (ex.restSec?.min || 30) + warmup + 45;
}
export function sessionMinutes(exercises, fullBody = false) {
  return Math.ceil(((fullBody ? 420 : 120) + exercises.reduce((s, ex) => s + exerciseSeconds(ex), 0)) / 60);
}

export function buildSessionPlan(day, minutes = defaultMinutes(day), settings = DEFAULT_SETTINGS) {
  const coreIds = [...CORE[day.id]];
  let extras = [...EXTRAS[day.id]];
  if (settings.focus === 'splits') {
    const id = day.id === 'di' ? 'di-frontsplit' : day.id === 'fr' ? 'fr-middlesplit' : null;
    if (id) { coreIds.push(id); extras = extras.filter(x => x !== id); }
  }
  if (settings.focus === 'skills' && day.id === 'do') {
    coreIds.push('do-handstand'); extras = extras.filter(x => x !== 'do-handstand');
  }
  const prepare = (id, core) => {
    const chosen = settings.variants?.[id] || (id === 'do-pistol' ? 'stepup' : '');
    const e = resolveExercise(id, chosen);
    e.core = core;
    e.targetSets = e.sets;
    if (e.sets) e.sets = Math.min(e.sets, day.isFullBody ? 2 : 1);
    if (e.type === TYPES.CARDIO) e.durationSec = { min: (day.id === 'di' ? 15 : 10) * 60, max: (day.id === 'di' ? 15 : 10) * 60 };
    if (e.type === TYPES.SKILL && e.durationSec) e.durationSec = { min: 300, max: 300 };
    e.dosage = prescription(e);
    return e;
  };
  const selected = coreIds.map(id => prepare(id, true));
  const baseMinutes = sessionMinutes(selected, day.isFullBody);
  const fits = list => sessionMinutes(list, day.isFullBody) <= minutes;
  // Dose the complete core first; extra exercises never displace a main pattern.
  for (let pass = 0; pass < 3; pass++) {
    for (const e of selected) {
      if (e.sets && e.sets < e.targetSets) { e.sets++; if (!fits(selected)) e.sets--; }
    }
  }
  if (day.id === 'di' || day.id === 'mi') {
    const cardio = selected.find(e => e.type === TYPES.CARDIO);
    const target = day.id === 'di' ? 40 : 20;
    while (cardio.durationSec.min < target * 60) {
      cardio.durationSec.min += 300;
      if (!fits(selected)) { cardio.durationSec.min -= 300; break; }
    }
    cardio.durationSec.max = cardio.durationSec.min;
  }
  const omitted = [];
  for (const id of extras) {
    const e = prepare(id, false);
    if (fits([...selected, e])) selected.push(e); else omitted.push(e);
  }
  const rank = e => e.type === TYPES.POWER ? 0 : e.type === TYPES.SKILL ? 1 : e.type === TYPES.STRENGTH ? 2 : 3;
  if (day.isFullBody) selected.sort((a, b) => rank(a) - rank(b));
  for (const e of [...selected, ...omitted]) e.dosage = prescription(e);
  return { version: PLAN_VERSION, dayId: day.id, budgetMinutes: minutes, estimatedMinutes: sessionMinutes(selected, day.isFullBody),
    minimumMinutes: baseMinutes, exercises: selected, optional: omitted,
    warning: baseMinutes > minutes ? `Für den vollständigen Grundblock sind ungefähr ${baseMinutes} Minuten nötig. Wähle mehr Zeit oder speichere die Einheit bei Bedarf als verkürzt. Pausen bleiben erhalten.` : null };
}

export function sessionExercises(session) {
  return session.planSnapshot?.exercises || PLAN.find(d => d.id === session.dayId)?.blocks.flatMap(b => b.exercises) || [];
}
export function entryExercise(key, entry, session) {
  return entry.exercise || sessionExercises(session).find(e => e.id === key) || original.get(key)
    || { id: key, name: entry.substituteName || key, type: TYPES.STRENGTH };
}
export function historyKey(key, entry) {
  // Older free-text replacements are kept, but cannot contaminate base records.
  return entry.exercise?.id || (entry.substituteName ? `${key}~legacy-${encodeURIComponent(entry.substituteName)}` : key);
}

export const SCIENCE_LINKS = [
  { label: 'ACSM 2026: Krafttraining und Individualisierung', url: 'https://acsm.org/resistance-training-guidelines-update-2026/' },
  { label: 'Trainingsumfang: Nutzen und abnehmender Zusatznutzen', url: 'https://link.springer.com/article/10.1007/s40279-025-02344-w' },
  { label: 'Wiederholungsreserve und Muskelaufbau', url: 'https://link.springer.com/article/10.1007/s40279-024-02069-2' },
  { label: 'Kraft- und Ausdauertraining kombinieren', url: 'https://link.springer.com/article/10.1007/s40279-021-01587-7' },
  { label: 'Nackenkraft: systematische Übersicht', url: 'https://pubmed.ncbi.nlm.nih.gov/39242177/' },
];
