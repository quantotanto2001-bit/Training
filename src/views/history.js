import { h, fmtDateTime, fmtDate } from '../ui.js';
import { getFinishedSessionLogs, getAllSessionLogs, deleteSessionLog } from '../db.js';
import { PLAN } from '../plan.js';
import { formatLoggedSet } from '../setForms.js';

export async function renderHistoryList() {
  const logs = await getFinishedSessionLogs();
  const wrap = h('div', { class: 'view' });
  wrap.appendChild(h('div', { class: 'header' }, [h('h1', {}, 'Trainingshistorie')]));

  if (!logs.length) {
    wrap.appendChild(h('div', { class: 'card muted-card' }, 'Noch keine abgeschlossenen Einheiten.'));
    return wrap;
  }

  for (const log of logs) {
    const day = PLAN.find((d) => d.id === log.dayId);
    const exCount = Object.values(log.entries || {}).filter((e) => e.sets && e.sets.some((s) => !s.isWarmup)).length;
    wrap.appendChild(h('a', { href: `#/history/${log.id}`, class: 'card card-link' }, [
      h('div', { class: 'card-label' }, fmtDateTime(log.finishedAt || log.startedAt)),
      h('h2', {}, day ? day.name + (day.subtitle ? ' — ' + day.subtitle : '') : log.dayId),
      h('p', { class: 'muted small' }, `${exCount} Uebung(en) geloggt`),
    ]));
  }
  return wrap;
}

export async function renderHistoryDetail(id) {
  const logs = await getAllSessionLogs();
  const log = logs.find((l) => l.id === id);
  const wrap = h('div', { class: 'view' });
  if (!log) {
    wrap.appendChild(h('div', { class: 'card' }, 'Eintrag nicht gefunden.'));
    return wrap;
  }
  const day = PLAN.find((d) => d.id === log.dayId);

  wrap.appendChild(h('div', { class: 'header' }, [
    h('a', { href: '#/history', class: 'back-link' }, '← Verlauf'),
    h('h1', {}, day ? day.name : log.dayId),
    h('p', { class: 'muted small' }, fmtDate(log.finishedAt || log.startedAt)),
  ]));

  const allExercises = day ? day.blocks.flatMap((b) => b.exercises) : [];
  for (const exx of allExercises) {
    const entry = log.entries[exx.id];
    if (!entry || !entry.sets || !entry.sets.length) continue;
    const card = h('div', { class: 'card' });
    card.appendChild(h('h3', {}, exx.name));
    entry.sets.filter((s) => !s.isWarmup).forEach((s, i) => {
      card.appendChild(h('p', { class: 'small' }, `Satz ${i + 1}: ${formatLoggedSet(exx, s)}`));
    });
    wrap.appendChild(card);
  }

  wrap.appendChild(h('button', {
    class: 'btn btn-ghost',
    onclick: async () => {
      if (!window.confirm('Diese Trainingseinheit endgueltig loeschen?')) return;
      await deleteSessionLog(log.id);
      window.location.hash = '#/history';
    },
  }, 'Eintrag loeschen'));

  return wrap;
}
