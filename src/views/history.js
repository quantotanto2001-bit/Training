import { h, fmtDateTime, fmtDate } from '../ui.js';
import { getAllSessionLogs, getActiveSession, deleteSessionLog } from '../db.js';
import { PLAN } from '../plan.js';
import { formatLoggedSet } from '../setForms.js';

function statusLabel(status) {
  if (status === 'completed') return 'Abgeschlossen';
  if (status === 'skipped') return 'Uebersprungen';
  if (status === 'in_progress') return 'Begonnen, nicht abgeschlossen';
  return status;
}

function statusBadgeClass(status) {
  if (status === 'completed') return 'badge-green';
  if (status === 'skipped') return 'badge-neutral';
  return 'badge-yellow';
}

export async function renderHistoryList() {
  const [logs, active] = await Promise.all([getAllSessionLogs(), getActiveSession()]);
  const wrap = h('div', { class: 'view' });
  wrap.appendChild(h('div', { class: 'header' }, [h('h1', {}, 'Trainingshistorie')]));

  const entries = [...logs];
  if (active) {
    entries.unshift({ ...active, id: active.id || 'active', status: 'in_progress', startedAt: active.startedAt });
  }

  if (!entries.length) {
    wrap.appendChild(h('div', { class: 'card muted-card' }, 'Noch keine Trainingsereignisse.'));
    return wrap;
  }

  for (const log of entries) {
    const day = PLAN.find((d) => d.id === log.dayId);
    const exCount = Object.values(log.entries || {}).filter((e) => e.sets && e.sets.some((s) => !s.isWarmup)).length;
    const isActive = log.status === 'in_progress';
    wrap.appendChild(h('a', { href: isActive ? '#/workout' : `#/history/${log.id}`, class: 'card card-link' }, [
      h('div', { class: 'card-label-row' }, [
        h('span', { class: 'card-label' }, fmtDateTime(log.finishedAt || log.startedAt)),
        h('span', { class: `badge ${statusBadgeClass(log.status)}` }, statusLabel(log.status)),
      ]),
      h('h2', {}, day ? day.name + (day.subtitle ? ' — ' + day.subtitle : '') : log.dayId),
      log.status === 'skipped' && log.skipReason ? h('p', { class: 'muted small' }, 'Grund: ' + log.skipReason) : null,
      log.status !== 'skipped' ? h('p', { class: 'muted small' }, `${exCount} Uebung(en) geloggt`) : null,
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
    h('div', { class: 'card-label-row' }, [
      h('p', { class: 'muted small' }, fmtDate(log.finishedAt || log.startedAt)),
      h('span', { class: `badge ${statusBadgeClass(log.status)}` }, statusLabel(log.status)),
    ]),
  ]));

  if (log.status === 'skipped') {
    wrap.appendChild(h('div', { class: 'card' }, [
      h('p', {}, 'Diese Einheit wurde bewusst uebersprungen.'),
      log.skipReason ? h('p', { class: 'muted small' }, 'Grund: ' + log.skipReason) : null,
    ]));
  }

  const allExercises = day ? day.blocks.flatMap((b) => b.exercises) : [];
  for (const exx of allExercises) {
    const entry = log.entries && log.entries[exx.id];
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
      if (!window.confirm('Diesen Eintrag endgueltig loeschen?')) return;
      await deleteSessionLog(log.id);
      window.location.hash = '#/history';
    },
  }, 'Eintrag loeschen'));

  return wrap;
}
