import { h, fmtDateTime, fmtDate, fmtDuration } from '../ui.js';
import { getAllSessionLogs, getActiveSession, deleteSessionLog, saveSessionLog, exportAllData, importAllData } from '../db.js';
import { PLAN } from '../plan.js';
import { formatLoggedSet, buildSetForm } from '../setForms.js';
import { rerender } from '../app.js';

function statusLabel(status) {
  if (status === 'completed') return 'Abgeschlossen';
  if (status === 'skipped') return 'Übersprungen';
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

  if (entries.length) {
    wrap.appendChild(renderCalendar(entries));
  }

  if (!entries.length) {
    wrap.appendChild(h('div', { class: 'card muted-card' }, 'Noch keine Trainingsereignisse.'));
    wrap.appendChild(renderBackupSection());
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
      log.status !== 'skipped' ? h('p', { class: 'muted small' }, [
        `${exCount} Übung(en) geloggt`,
        fmtDuration(log.startedAt, log.finishedAt) ? ` · ${fmtDuration(log.startedAt, log.finishedAt)}` : '',
      ].join('')) : null,
    ]));
  }

  wrap.appendChild(renderBackupSection());
  return wrap;
}

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderCalendar(entries) {
  const byDay = new Map();
  for (const log of entries) {
    const raw = log.finishedAt || log.startedAt;
    if (!raw) continue;
    const key = dateKey(new Date(raw));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(log);
  }

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedKey = null;

  const card = h('div', { class: 'card calendar-card' });
  const navEl = h('div', { class: 'calendar-nav' });
  const gridEl = h('div', { class: 'calendar-grid' });
  const selectedEl = h('div', { class: 'calendar-selected-day-list' });
  card.appendChild(navEl);
  card.appendChild(gridEl);
  card.appendChild(selectedEl);

  function renderNav() {
    navEl.innerHTML = '';
    navEl.appendChild(h('button', { class: 'calendar-nav-btn', onclick: () => { changeMonth(-1); } }, '←'));
    navEl.appendChild(h('span', { class: 'calendar-month-label' }, `${MONTH_NAMES[viewMonth]} ${viewYear}`));
    navEl.appendChild(h('button', { class: 'calendar-nav-btn', onclick: () => { changeMonth(1); } }, '→'));
  }

  function changeMonth(delta) {
    viewMonth += delta;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderNav();
    renderGrid();
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    WEEKDAY_HEADERS.forEach((wd) => gridEl.appendChild(h('div', { class: 'calendar-weekday' }, wd)));

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Montag = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      gridEl.appendChild(h('div', { class: 'calendar-day calendar-day-empty' }));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(viewYear, viewMonth, d);
      const key = dateKey(cellDate);
      const dayLogs = byDay.get(key) || [];
      const isToday = dateKey(today) === key;
      const classes = ['calendar-day'];
      if (isToday) classes.push('calendar-day-today');
      if (key === selectedKey) classes.push('calendar-day-selected');
      const dots = [];
      if (dayLogs.some((l) => l.status === 'completed')) dots.push(h('span', { class: 'calendar-day-dot' }));
      if (dayLogs.some((l) => l.status === 'skipped')) dots.push(h('span', { class: 'calendar-day-dot calendar-day-dot-skipped' }));
      gridEl.appendChild(h('button', { class: classes.join(' '), onclick: () => selectDay(key) }, [
        h('span', {}, String(d)),
        ...dots,
      ]));
    }
    renderSelected();
  }

  function selectDay(key) {
    selectedKey = selectedKey === key ? null : key;
    renderGrid();
  }

  function renderSelected() {
    selectedEl.innerHTML = '';
    if (!selectedKey) return;
    const dayLogs = byDay.get(selectedKey) || [];
    if (!dayLogs.length) {
      selectedEl.appendChild(h('p', { class: 'muted small' }, 'Keine Einheit an diesem Tag.'));
      return;
    }
    for (const log of dayLogs) {
      const day = PLAN.find((d) => d.id === log.dayId);
      const isActive = log.status === 'in_progress';
      selectedEl.appendChild(h('a', { href: isActive ? '#/workout' : `#/history/${log.id}`, class: 'card-link' }, [
        h('div', { class: 'card-label-row' }, [
          h('span', { class: 'small' }, day ? day.name : log.dayId),
          h('span', { class: `badge ${statusBadgeClass(log.status)}` }, statusLabel(log.status)),
        ]),
      ]));
    }
  }

  renderNav();
  renderGrid();
  return card;
}

function renderBackupSection() {
  const statusEl = h('p', { class: 'muted small' }, '');
  const fileInput = h('input', {
    type: 'file', accept: 'application/json', class: 'hidden-file-input',
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const count = Array.isArray(data.sessionLogs) ? data.sessionLogs.length : 0;
        if (!window.confirm(`${count} Trainingsereignis(se) aus der Datei importieren? Vorhandene lokale Daten bleiben erhalten, der aktuelle Zyklus-Fortschritt wird aus der Datei übernommen.`)) return;
        await importAllData(data);
        statusEl.textContent = `${count} Ereignis(se) importiert.`;
        rerender();
      } catch (err) {
        statusEl.textContent = 'Import fehlgeschlagen: Datei ungültig.';
      }
    },
  });

  return h('div', { class: 'backup-section' }, [
    h('p', { class: 'muted small' }, 'Alle Daten liegen nur lokal auf diesem Gerät. Regelmässig sichern empfohlen.'),
    h('div', { class: 'backup-actions' }, [
      h('button', {
        class: 'btn btn-ghost btn-small',
        onclick: async () => {
          const data = await exportAllData();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = h('a', { href: url, download: `universal-athlete-backup-${new Date().toISOString().slice(0, 10)}.json` });
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        },
      }, 'Daten exportieren'),
      h('button', { class: 'btn btn-ghost btn-small', onclick: () => fileInput.click() }, 'Daten importieren'),
    ]),
    fileInput,
    statusEl,
  ]);
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

  const duration = fmtDuration(log.startedAt, log.finishedAt);
  wrap.appendChild(h('div', { class: 'header' }, [
    h('a', { href: '#/history', class: 'back-link' }, '← Verlauf'),
    h('h1', {}, day ? day.name : log.dayId),
    h('div', { class: 'card-label-row' }, [
      h('p', { class: 'muted small' }, fmtDate(log.finishedAt || log.startedAt) + (duration ? ' · ' + duration : '')),
      h('span', { class: `badge ${statusBadgeClass(log.status)}` }, statusLabel(log.status)),
    ]),
  ]));

  if (log.status === 'skipped') {
    wrap.appendChild(h('div', { class: 'card' }, [
      h('p', {}, 'Diese Einheit wurde bewusst übersprungen.'),
      log.skipReason ? h('p', { class: 'muted small' }, 'Grund: ' + log.skipReason) : null,
    ]));
  }

  const allExercises = day ? day.blocks.flatMap((b) => b.exercises) : [];
  for (const exx of allExercises) {
    const entry = log.entries && log.entries[exx.id];
    if (!entry || !entry.sets || !entry.sets.length) continue;
    wrap.appendChild(renderEditableExerciseCard(log, exx, entry));
  }

  wrap.appendChild(h('button', {
    class: 'btn btn-ghost',
    onclick: async () => {
      if (!window.confirm('Diesen Eintrag endgültig löschen?')) return;
      await deleteSessionLog(log.id);
      window.location.hash = '#/history';
    },
  }, 'Eintrag löschen'));

  return wrap;
}

function renderEditableExerciseCard(log, exx, entry) {
  const card = h('div', { class: 'card' });
  card.appendChild(h('h3', {}, entry.substituteName || exx.name));
  if (entry.substituteName) card.appendChild(h('p', { class: 'muted small' }, `Ersetzt: ${exx.name}`));

  const listEl = h('div', { class: 'logged-sets' });
  card.appendChild(listEl);

  function renderRow(s, i, isWarmup) {
    const row = h('div', { class: 'logged-set-row' });
    row.appendChild(h('span', { class: 'set-index' }, isWarmup ? 'Warm-up' : `Satz ${i + 1}`));
    const summary = h('span', { class: 'set-summary' }, formatLoggedSet(exx, s));
    row.appendChild(summary);
    row.appendChild(h('button', { class: 'btn-icon', 'aria-label': 'Bearbeiten', onclick: () => toggleEdit() }, '✎'));
    listEl.appendChild(row);

    const editWrap = h('div', { class: 'set-edit-wrap set-edit-hidden' });
    listEl.appendChild(editWrap);

    function toggleEdit() {
      editWrap.classList.toggle('set-edit-hidden');
      if (editWrap.classList.contains('set-edit-hidden')) return;
      editWrap.innerHTML = '';
      const form = buildSetForm(exx, s);
      editWrap.appendChild(form.el);
      editWrap.appendChild(h('button', {
        class: 'btn btn-small',
        onclick: async () => {
          const values = form.read();
          Object.assign(s, values);
          await saveSessionLog(log);
          summary.textContent = formatLoggedSet(exx, s);
          editWrap.classList.add('set-edit-hidden');
        },
      }, 'Speichern'));
    }
  }

  entry.sets.filter((s) => s.isWarmup).forEach((s) => renderRow(s, 0, true));
  entry.sets.filter((s) => !s.isWarmup).forEach((s, i) => renderRow(s, i, false));

  return card;
}
