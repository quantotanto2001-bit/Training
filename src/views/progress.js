import { h, fmtDate } from '../ui.js';
import { PLAN, TYPES, TYPE_LABELS, allExercises } from '../plan.js';
import { getExerciseHistory } from '../db.js';
import { formatLoggedSet } from '../setForms.js';

export async function renderProgressList() {
  const wrap = h('div', { class: 'view' });
  wrap.appendChild(h('div', { class: 'header' }, [h('h1', {}, 'Fortschritt'), h('p', { class: 'muted' }, 'Uebung waehlen')]));

  for (const day of PLAN) {
    wrap.appendChild(h('h3', { class: 'section-title' }, day.name));
    const list = h('div', { class: 'exercise-list' });
    for (const block of day.blocks) {
      for (const exx of block.exercises) {
        list.appendChild(h('a', { href: `#/progress/${exx.id}`, class: 'exercise-row exercise-row-link' }, [
          h('div', { class: 'exercise-name' }, exx.name),
          h('span', { class: 'badge badge-neutral' }, TYPE_LABELS[exx.type]),
        ]));
      }
    }
    wrap.appendChild(list);
  }
  return wrap;
}

function computePB(exercise, history) {
  let best = null;
  for (const entry of history) {
    for (const s of entry.sets.filter((x) => !x.isWarmup)) {
      const candidateVal = pbValue(exercise, s);
      if (candidateVal == null) continue;
      if (!best || candidateVal > best.val) best = { val: candidateVal, set: s, date: entry.date };
    }
  }
  return best;
}

function pbValue(exercise, s) {
  switch (exercise.type) {
    case TYPES.STRENGTH:
    case TYPES.POWER:
    case TYPES.MOBILITY_LOADED:
      if (s.weightKg != null) return s.weightKg;
      if (s.reps != null) return s.reps / 1000; // Fallback falls koerpergewichtsbasiert
      return null;
    case TYPES.MOBILITY_ACTIVE:
      return s.holdSec != null ? s.holdSec : (s.reps != null ? s.reps / 1000 : null);
    case TYPES.STRETCH_STATIC:
    case TYPES.SKILL:
      return s.holdSec != null ? s.holdSec : (s.reps != null ? s.reps / 1000 : null);
    case TYPES.FINISHER:
      return s.rounds != null ? s.rounds : null;
    case TYPES.CARDIO:
      return s.durationSec != null ? s.durationSec : null;
    default:
      return null;
  }
}

export async function renderProgressDetail(exerciseId) {
  const exercise = allExercises().find((e) => e.id === exerciseId);
  const wrap = h('div', { class: 'view' });
  if (!exercise) {
    wrap.appendChild(h('div', { class: 'card' }, 'Uebung nicht gefunden.'));
    return wrap;
  }
  const history = await getExerciseHistory(exerciseId);

  wrap.appendChild(h('div', { class: 'header' }, [
    h('a', { href: '#/progress', class: 'back-link' }, '← Fortschritt'),
    h('h1', {}, exercise.name),
    h('span', { class: 'badge badge-neutral' }, TYPE_LABELS[exercise.type]),
  ]));

  if (!history.length) {
    wrap.appendChild(h('div', { class: 'card muted-card' }, 'Noch keine Daten fuer diese Uebung.'));
    return wrap;
  }

  const pb = computePB(exercise, history);
  if (pb) {
    wrap.appendChild(h('div', { class: 'card card-accent' }, [
      h('div', { class: 'card-label' }, 'Persoenliche Bestleistung'),
      h('p', {}, formatLoggedSet(exercise, pb.set)),
      h('p', { class: 'muted small' }, fmtDate(pb.date)),
    ]));
  }

  wrap.appendChild(h('h3', { class: 'section-title' }, 'Verlauf'));
  for (const h_ of history) {
    const card = h('div', { class: 'card' });
    card.appendChild(h('div', { class: 'card-label' }, fmtDate(h_.date)));
    h_.sets.filter((s) => !s.isWarmup).forEach((s, i) => {
      card.appendChild(h('p', { class: 'small' }, `Satz ${i + 1}: ${formatLoggedSet(exercise, s)}`));
    });
    wrap.appendChild(card);
  }
  return wrap;
}
