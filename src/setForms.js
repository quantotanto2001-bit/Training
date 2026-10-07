import { h, fmtRepRange } from './ui.js';
import { TYPES } from './plan.js';
import { loadSpec, loadText, splitSides } from './measurements.js';

// Baut das Eingabeformular für einen neuen Satz, passend zum Übungstyp.
// Gibt { el, read } zurück. read() liefert das Satz-Objekt oder null (ungültig).

function numInput({ id, label, placeholder, step = 'any', value }) {
  return h('label', { class: 'field' }, [
    h('span', {}, label),
    h('input', {
      type: 'number', id, step, inputmode: 'decimal',
      placeholder: placeholder != null ? String(placeholder) : '',
      value: value != null ? String(value) : '',
    }),
  ]);
}

function textInput({ id, label, placeholder, value }) {
  return h('label', { class: 'field' }, [
    h('span', {}, label),
    h('input', { type: 'text', id, placeholder: placeholder || '', value: value || '' }),
  ]);
}

function selectInput({ id, label, options, value }) {
  return h('label', { class: 'field' }, [
    h('span', {}, label),
    h('select', { id }, options.map((o) => h('option', { value: o, selected: o === value ? '' : null }, o || 'Keine Angabe'))),
  ]);
}

function readNum(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return null;
  const n = Number(el.value);
  return Number.isFinite(n) ? n : null;
}

function readText(id) {
  const el = document.getElementById(id);
  return el && el.value ? el.value.trim() : null;
}

export function buildSetForm(exercise, defaults = {}, { legacy = false } = {}) {
  const uidBase = 'f_' + Math.random().toString(36).slice(2, 8);
  const ids = {
    weight: uidBase + '_w', reps: uidBase + '_r', rir: uidBase + '_rir', tech: uidBase + '_tech',
    hold: uidBase + '_h', support: uidBase + '_sup', rom: uidBase + '_rom',
    duration: uidBase + '_dur', hr: uidBase + '_hr', dist: uidBase + '_dist', pace: uidBase + '_pace',
    rounds: uidBase + '_rounds', note: uidBase + '_note',
  };

  let fields = [];
  let read = () => ({});

  switch (exercise.type) {
    case TYPES.STRENGTH:
    case TYPES.POWER: {
      fields = [
        numInput({ id: ids.weight, label: 'Gewicht (kg)', step: '0.5', value: defaults.weightKg }),
        numInput({ id: ids.reps, label: 'Wiederholungen', step: '1', value: defaults.reps, placeholder: fmtRepRange(exercise.reps) }),
        ...(exercise.type === TYPES.STRENGTH ? [selectInput({ id: ids.rir, label: 'RIR', options: ['', '0', '1', '2', '3', '4+', 'Versagen'], value: defaults.rir != null ? String(defaults.rir) : '' })] : []),
        h('label', { class: 'field field-checkbox' }, [
          h('input', { type: 'checkbox', id: ids.tech, checked: defaults.technikverlust ? '' : null }),
          h('span', {}, 'Technik-/ROM-Verlust'),
        ]),
      ];
      read = () => ({
        weightKg: readNum(ids.weight), reps: readNum(ids.reps),
        rir: readText(ids.rir), technikverlust: document.getElementById(ids.tech).checked,
      });
      break;
    }
    case TYPES.MOBILITY_ACTIVE: {
      // Nur Felder zeigen, die für diese Übung laut Plan tatsächlich gemessen werden -
      // eine reine Halteübung (nur holdSec) braucht kein leeres "Wiederholungen"-Feld.
      if (exercise.reps) fields.push(numInput({ id: ids.reps, label: 'Wiederholungen', step: '1', value: defaults.reps }));
      if (exercise.holdSec) fields.push(numInput({ id: ids.hold, label: 'Haltezeit (s)', step: '1', value: defaults.holdSec }));
      fields.push(
        textInput({ id: ids.support, label: 'Unterstützung', placeholder: 'z.B. keine / Band / Stütze', value: defaults.support }),
        textInput({ id: ids.rom, label: 'ROM-Position', placeholder: 'z.B. voll / 3/4 / leicht limitiert', value: defaults.romPosition }),
      );
      read = () => ({
        reps: readNum(ids.reps), holdSec: readNum(ids.hold),
        support: readText(ids.support), romPosition: readText(ids.rom),
      });
      break;
    }
    case TYPES.MOBILITY_LOADED: {
      fields.push(numInput({ id: ids.weight, label: 'Gewicht (kg, optional)', step: '0.5', value: defaults.weightKg }));
      if (exercise.reps) fields.push(numInput({ id: ids.reps, label: 'Wiederholungen', step: '1', value: defaults.reps }));
      if (exercise.holdSec) fields.push(numInput({ id: ids.hold, label: 'Haltezeit (s)', step: '1', value: defaults.holdSec }));
      fields.push(
        textInput({ id: ids.support, label: 'Unterstützung', placeholder: 'z.B. keine / Stütze', value: defaults.support }),
        textInput({ id: ids.rom, label: 'ROM-Position', placeholder: 'z.B. voll / 3/4', value: defaults.romPosition }),
      );
      read = () => ({
        weightKg: readNum(ids.weight), reps: readNum(ids.reps), holdSec: readNum(ids.hold),
        support: readText(ids.support), romPosition: readText(ids.rom),
      });
      break;
    }
    case TYPES.STRETCH_STATIC: {
      fields = [
        numInput({ id: ids.hold, label: 'Haltezeit (s)', step: '1', value: defaults.holdSec }),
        textInput({ id: ids.support, label: 'Unterstützung', placeholder: 'z.B. Blocks / keine', value: defaults.support }),
        textInput({ id: ids.rom, label: 'ROM-Position', placeholder: 'z.B. Tiefe/Winkel', value: defaults.romPosition }),
      ];
      read = () => ({
        holdSec: readNum(ids.hold), support: readText(ids.support), romPosition: readText(ids.rom),
      });
      break;
    }
    case TYPES.SKILL: {
      fields = [
        numInput({ id: ids.hold, label: 'Haltezeit (s, optional)', step: '1', value: defaults.holdSec }),
        numInput({ id: ids.reps, label: 'Versuche/Wdh. (optional)', step: '1', value: defaults.reps }),
        textInput({ id: ids.note, label: 'Notiz (z.B. Variante/Qualität)', placeholder: 'z.B. Tuck L-Sit, sauber', value: defaults.note }),
      ];
      read = () => ({ holdSec: readNum(ids.hold), reps: readNum(ids.reps), note: readText(ids.note) });
      break;
    }
    case TYPES.CARDIO: {
      fields = [
        numInput({ id: ids.duration, label: 'Dauer (min)', step: '1', value: defaults.durationMin }),
        numInput({ id: ids.hr, label: 'Schnitt-HF (bpm, optional)', step: '1', value: defaults.avgHr }),
        numInput({ id: ids.dist, label: 'Distanz (km, optional)', step: '0.1', value: defaults.distanceKm }),
        textInput({ id: ids.pace, label: 'Tempo (optional)', placeholder: 'z.B. 5:30 min/km', value: defaults.pace }),
      ];
      read = () => {
        const min = readNum(ids.duration);
        return {
          durationSec: min != null ? Math.round(min * 60) : null,
          avgHr: readNum(ids.hr), distanceKm: readNum(ids.dist), pace: readText(ids.pace),
        };
      };
      break;
    }
    case TYPES.FINISHER: {
      fields = [
        numInput({ id: ids.rounds, label: 'Runden', step: '1', value: defaults.rounds }),
        textInput({ id: ids.note, label: 'Notiz', placeholder: 'z.B. Übungen/Reps pro Runde', value: defaults.note }),
      ];
      read = () => ({ rounds: readNum(ids.rounds), note: readText(ids.note) });
      break;
    }
    default: {
      fields = [textInput({ id: ids.note, label: 'Notiz', value: defaults.note })];
      read = () => ({ note: readText(ids.note) });
    }
  }

  const el = h('div', { class: 'set-form-fields' }, fields);
  const legacySides = legacy && exercise.perSide && !splitSides(exercise, defaults);
  const sideIds = {};
  if (exercise.perSide && !legacySides) for (const [key, id, label] of [['reps', ids.reps, 'Wiederholungen'], ['holdSec', ids.hold, 'Haltezeit (s)']]) {
    if (!exercise[key]) continue;
    const original = fields.find(field => field.querySelector?.('input')?.id === id);
    if (!original) continue;
    sideIds[key] = [id + '_left', id + '_right'];
    original.replaceWith(...['Left', 'Right'].map((side,i) => numInput({ id: sideIds[key][i], label: label + (i ? ' rechts' : ' links'), step: '1', value: defaults[key + side] })));
  }
  const spec = loadSpec(exercise);
  const weightField = el.querySelector(`#${ids.weight}`);
  if (weightField) {
    if (!spec) weightField.parentElement.remove();
    else weightField.parentElement.querySelector('span').textContent = spec.label;
  }
  const readFields = read;
  read = () => {
    const values = readFields();
    for (const [key, ids] of Object.entries(sideIds)) { values[key] = null; values[key + 'Left'] = readNum(ids[0]); values[key + 'Right'] = readNum(ids[1]); }
    if (spec && (!legacy || defaults.weightConvention)) values.weightConvention = defaults.weightConvention || spec.kind;
    if (!spec) delete values.weightKg;
    return values;
  };
  if (legacySides) el.prepend(h('p', { class: 'muted small' }, 'Dieser ältere Satz enthält einen gemeinsamen Wert je Seite; er bleibt in dieser Form erhalten. Neue Sätze erfassen links und rechts getrennt.'));
  return { el, read, legacySides };
}

export function formatLoggedSet(exercise, set) {
  const parts = [];
  if (set.weightKg != null) parts.push(set.weightConvention ? loadText(exercise, set.weightKg, set.weightConvention) : `${set.weightKg} kg (frühere Angabe)`);
  if (set.repsLeft != null || set.repsRight != null) parts.push(`L ${set.repsLeft ?? '–'} / R ${set.repsRight ?? '–'} Wdh`);
  else if (set.reps != null) parts.push(`${set.reps} Wdh${exercise.perSide ? ' je Seite (gemeinsam erfasst)' : ''}`);
  if (set.direction) parts.push(set.direction);
  if (set.resistance) parts.push('Widerstand: ' + set.resistance);
  if (set.effort) parts.push('Anstrengung: ' + set.effort);
  if (set.rir) parts.push(`RIR ${set.rir}`);
  if (set.holdSecLeft != null || set.holdSecRight != null) parts.push(`L ${set.holdSecLeft ?? '–'} / R ${set.holdSecRight ?? '–'} s halten`);
  else if (set.holdSec != null) parts.push(`${set.holdSec}s halten${exercise.perSide ? ' je Seite (gemeinsam erfasst)' : ''}`);
  if (set.support) parts.push(set.support);
  if (set.romPosition) parts.push(`ROM ${set.romPosition}`);
  if (set.durationSec != null) parts.push(`${Math.round(set.durationSec / 60)} min`);
  if (set.avgHr != null) parts.push(`${set.avgHr} bpm`);
  if (set.distanceKm != null) parts.push(`${set.distanceKm} km`);
  if (set.pace) parts.push(set.pace);
  if (set.rounds != null) parts.push(`${set.rounds} Runden`);
  if (set.note) parts.push(set.note);
  if (set.technikverlust) parts.push('⚠ Technikverlust');
  return parts.join(' · ') || '—';
}
