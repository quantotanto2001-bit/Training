import { h, fmtDate, renderBarChart, typeIcon } from '../ui.js';
import { PLAN, TYPES, TYPE_LABELS, allExercises, iconFor } from '../plan.js';
import { getExerciseHistory, getAllSessionLogs } from '../db.js';
import { getCurrentProgramState } from '../state.js';
import { formatLoggedSet } from '../setForms.js';

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function computeLast7DaysChart(logs) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ date: d, label: WEEKDAY_LABELS[d.getDay()], value: 0 });
  }
  for (const log of logs) {
    if (log.status !== 'completed' || !log.entries) continue;
    const logDate = new Date(log.finishedAt || log.startedAt);
    logDate.setHours(0, 0, 0, 0);
    const bucket = days.find((d) => d.date.getTime() === logDate.getTime());
    if (!bucket) continue;
    for (const entry of Object.values(log.entries)) {
      if (entry.sets) bucket.value += entry.sets.filter((s) => !s.isWarmup).length;
    }
  }
  return days;
}

function bentoTile(value, label) {
  return h('div', { class: 'bento-tile' }, [
    h('div', { class: 'bento-value' }, String(value)),
    h('div', { class: 'bento-label' }, label),
  ]);
}

async function computeOverviewStats() {
  const [programState, logs] = await Promise.all([getCurrentProgramState(), getAllSessionLogs()]);
  const completedCount = logs.filter((l) => l.status === 'completed').length;

  let currentPrCount = 0;
  for (const exercise of allExercises()) {
    const history = await getExerciseHistory(exercise.id);
    if (!history.length) continue;
    const pb = computePB(exercise, history);
    if (!pb) continue;
    const latestBest = Math.max(...history[0].sets.filter((s) => !s.isWarmup).map((s) => pbValue(exercise, s)).filter((v) => v != null), -Infinity);
    if (latestBest === pb.val) currentPrCount += 1;
  }

  const chart = computeLast7DaysChart(logs);

  let weekDurationMin = 0;
  const weekStart = chart[0].date.getTime();
  for (const log of logs) {
    if (log.status !== 'completed') continue;
    const logDate = new Date(log.finishedAt || log.startedAt);
    logDate.setHours(0, 0, 0, 0);
    if (logDate.getTime() < weekStart) continue;
    if (log.startedAt && log.finishedAt) {
      weekDurationMin += Math.round((new Date(log.finishedAt) - new Date(log.startedAt)) / 60000);
    }
  }
  const weekDurationLabel = weekDurationMin > 0
    ? (weekDurationMin >= 60 ? `${Math.floor(weekDurationMin / 60)} h ${weekDurationMin % 60} min` : `${weekDurationMin} min`)
    : '–';

  return {
    cycle: programState.currentCycle,
    dayPosition: `${programState.currentDayOrder + 1}/${PLAN.length}`,
    completedCount,
    currentPrCount,
    chart,
    weekDurationLabel,
  };
}

export async function renderProgressList() {
  const wrap = h('div', { class: 'view' });
  wrap.appendChild(h('div', { class: 'header' }, [h('h1', {}, 'Fortschritt')]));

  const stats = await computeOverviewStats();
  wrap.appendChild(h('div', { class: 'bento-grid' }, [
    bentoTile(stats.cycle, 'Aktueller Zyklus'),
    bentoTile(stats.dayPosition, 'Trainingstag'),
    bentoTile(stats.completedCount, 'Einheiten absolviert'),
    bentoTile(stats.currentPrCount, 'Aktuelle Bestleistungen'),
  ]));

  wrap.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'card-label' }, 'Trainingsverlauf (letzte 7 Tage)'),
    renderBarChart(stats.chart),
    h('p', { class: 'muted small' }, `Trainingszeit diese 7 Tage: ${stats.weekDurationLabel}`),
  ]));

  wrap.appendChild(h('p', { class: 'muted small' }, 'Übung wählen'));

  for (const day of PLAN) {
    wrap.appendChild(h('h3', { class: 'section-title' }, day.name));
    const list = h('div', { class: 'exercise-list' });
    for (const block of day.blocks) {
      for (const exx of block.exercises) {
        list.appendChild(h('a', { href: `#/progress/${exx.id}`, class: 'exercise-row exercise-row-link' }, [
          h('div', { class: 'exercise-icon-row' }, [
            h('div', { class: 'exercise-icon-badge' }, typeIcon(iconFor(exx))),
            h('div', { class: 'exercise-name' }, exx.name),
          ]),
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
      if (s.reps != null) return s.reps / 1000; // Fallback falls körpergewichtsbasiert
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
    wrap.appendChild(h('div', { class: 'card' }, 'Übung nicht gefunden.'));
    return wrap;
  }
  const history = await getExerciseHistory(exerciseId);

  wrap.appendChild(h('div', { class: 'header' }, [
    h('a', { href: '#/progress', class: 'back-link' }, '← Fortschritt'),
    h('h1', {}, exercise.name),
    h('span', { class: 'badge badge-neutral' }, TYPE_LABELS[exercise.type]),
  ]));

  if (!history.length) {
    wrap.appendChild(h('div', { class: 'card muted-card' }, 'Noch keine Daten für diese Übung.'));
    return wrap;
  }

  const pb = computePB(exercise, history);
  if (pb) {
    wrap.appendChild(h('div', { class: 'card card-accent' }, [
      h('div', { class: 'card-label' }, 'Persönliche Bestleistung'),
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
