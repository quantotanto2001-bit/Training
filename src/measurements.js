import { TYPES } from './plan.js';

// The convention is stored with each new set. Old kg entries are never silently
// converted from two dumbbells to one dumbbell (or vice versa).
export function loadSpec(ex) {
  const id = ex.id || '', slot = ex.slotId || id.split('~')[0];
  if (/bench-guided|rdl-guided/.test(id)) return { kind: 'total', label: 'Gesamtgewicht (kg)', short: 'kg gesamt', required: true, confirmLegacy: true, hint: 'Gesamte bewegte Last einschließlich Stange eintragen.' };
  if (/cable-row/.test(id) || (['sa-cablerow', 'mo-extrot', 'sa-rotpower'].includes(slot) && !id.includes('ring-row'))) return { kind: 'machine', label: 'Gewicht am Kabel (kg)', short: 'kg Kabel', required: true, confirmLegacy: true, hint: 'Die angezeigte Last am Kabelzug eintragen; gleiche Station und Übersetzung verwenden.' };
  if (/bench-db|~db$|~stepup$|~bulgarian$|~split-squat$|~reverse$/.test(id) || ['mo-splitsquat', 'do-ohp'].includes(slot)) return { kind: 'per-dumbbell', label: 'Gewicht je Hantel (kg)', short: 'kg/Hantel', required: true, confirmLegacy: true, hint: 'Bei zwei Hanteln mit je 10 kg: 10 eintragen.' + (ex.perSide ? ' 0 = ohne Hanteln.' : '') };
  if (['mo-gobletsquat', 'do-hipthrust', 'mo-calf'].includes(slot) || ex.type === TYPES.MOBILITY_LOADED) return { kind: 'total', label: 'Zusatzlast gesamt (kg)', short: 'kg gesamt', required: true, confirmLegacy: true, hint: 'Alle zusätzlich bewegten Gewichte zusammenzählen. 0 = ohne Zusatzlast.' };
  if (ex.type === TYPES.STRENGTH) return { kind: 'added', label: 'Zusatzgewicht (kg, optional)', short: 'Zusatz-kg', required: false, confirmLegacy: false, hint: 'Nur zusätzliches Gewicht eintragen. Leer oder 0 = Körpergewicht; Unterstützung und Aufbau unter Notizen festhalten.' };
  return null;
}

export function validWeight(ex, value) {
  const spec = loadSpec(ex);
  if (!spec) return true;
  if (value == null) return !spec.required;
  if (!Number.isFinite(value) || value < 0) return false;
  // Bench, presses, hinges and cable exercises need an actual external load.
  const zeroAllowed = spec.kind === 'added' || (spec.kind === 'total' && !/guided/.test(ex.id || '')) || (spec.kind === 'per-dumbbell' && ex.perSide);
  return value > 0 || zeroAllowed;
}

export function effectiveValue(ex, set, key = 'reps') {
  if (ex.perSide) {
    const left = set[key + 'Left'], right = set[key + 'Right'];
    if (left != null || right != null) return Number.isFinite(left) && Number.isFinite(right) ? Math.min(left, right) : null;
  }
  return Number.isFinite(set[key]) ? set[key] : null;
}

export function splitSides(ex, set) {
  return !!ex.perSide && ['reps', 'holdSec'].some(key => set[key + 'Left'] != null || set[key + 'Right'] != null);
}

export function validateSet(ex, values, { legacySides = false, legacyWeight = false } = {}) {
  if (!legacyWeight && !validWeight(ex, values.weightKg)) return 'Bitte das Gewicht gemäß der Angabe über den Sätzen eintragen.';
  for (const key of ['reps', 'holdSec']) {
    if (!ex[key]) continue;
    const keys = ex.perSide && !legacySides ? [key + 'Left', key + 'Right'] : [key];
    for (const k of keys) if (!Number.isFinite(values[k]) || values[k] <= 0 || (key === 'reps' && !Number.isInteger(values[k]))) return ex.perSide && !legacySides ? 'Bitte die tatsächlich absolvierten Werte für links und rechts eintragen.' : 'Bitte tatsächliche Wiederholungen bzw. Haltezeit eintragen.';
  }
  return null;
}

export function historicalLoads(ex, history, confirmedKind = null) {
  const spec = loadSpec(ex);
  return history.map(row => {
    const sets = row.sets.filter(s => !s.isWarmup);
    const compatible = !spec || sets.every(s => !s.weightConvention ? !spec.confirmLegacy || confirmedKind === spec.kind : s.weightConvention === spec.kind);
    return { ...row, loadCompatible: compatible, sets: row.sets.map(s => !s.weightConvention && compatible && spec ? { ...s, weightConvention: spec.kind } : s) };
  });
}

export function loadText(ex, kg, kind = loadSpec(ex)?.kind) {
  return `${kg} ${kind === 'per-dumbbell' ? 'kg je Hantel' : kind === 'machine' ? 'kg am Kabel' : kind === 'added' ? 'kg Zusatzgewicht' : 'kg gesamt'}`;
}
