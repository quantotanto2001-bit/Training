import { h, fmtDate } from '../ui.js';
import { TYPES } from '../plan.js';
import { getAllSessionLogs, getExerciseHistory, getExerciseNote } from '../db.js';
import { entryExercise, historyKey, groupFor, GROUP_LABELS } from '../training.js';
import { formatLoggedSet } from '../setForms.js';
import { historicalLoads, effectiveValue } from '../measurements.js';
import { comparePerformance, adaptationFor } from '../progression.js';

export function weeklySummary(logs, now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const week = logs.filter(l => ['completed', 'partial'].includes(l.status) || (!l.status && l.finishedAt))
    .filter(l => { const d = new Date(l.finishedAt || l.startedAt); return d >= start && d < end && d <= now; });
  let strengthSets = 0, powerSets = 0, cardioMinutes = 0;
  const groups = {};
  for (const log of week) for (const [key, entry] of Object.entries(log.entries || {})) {
    const ex = entryExercise(key, entry, log), sets = entry.sets.filter(s => !s.isWarmup);
    if (ex.type === TYPES.STRENGTH) { strengthSets += sets.length; const group = ex.group || groupFor(ex); groups[group] = (groups[group] || 0) + sets.length; }
    if (ex.type === TYPES.POWER) powerSets += sets.length;
    if (ex.type === TYPES.CARDIO) cardioMinutes += sets.reduce((sum, s) => sum + (s.durationSec || 0) / 60, 0);
  }
  return { start, end, count: week.length, partial: week.filter(l => l.status === 'partial').length, strengthSets, powerSets, cardioMinutes: Math.round(cardioMinutes), groups };
}
export async function renderProgressList() {
  const logs = await getAllSessionLogs();
  const stats = weeklySummary(logs);
  const tile = (n, text) => h('div', { class: 'bento-tile' }, [h('div', { class: 'bento-value' }, String(n)), h('div', { class: 'bento-label' }, text)]);
  const wrap = h('div', { class: 'view' }, [h('div', { class: 'header' }, [h('h1', {}, 'Fortschritt'), h('p', { class: 'muted small' }, `Diese Kalenderwoche · seit ${fmtDate(stats.start)}`)]),
    h('div', { class: 'bento-grid' }, [tile(stats.count, 'Einheiten'), tile(stats.strengthSets, 'Kraft-Arbeitssätze'), tile(stats.powerSets, 'Schnellkraftsätze'), tile(stats.cardioMinutes, 'Ausdauerminuten')]),
    h('a', { href: '#/history', class: 'btn btn-block' }, 'Trainingsverlauf und Kalender →'),
  ]);
  const overview = h('details', { class: 'quiet-details' }, [h('summary', {}, 'Belastung nach Bewegungsaufgabe'), h('p', { class: 'muted small' }, 'Gezählte Arbeitssätze, keine exakten Sätze pro Muskel. Übungen beanspruchen mehrere Muskeln. Aus fehlenden Einträgen folgt keine diagnostizierte Dysbalance.')]);
  for (const group of ['knee', 'hinge', 'kneeFlexion', 'chestPush', 'shoulderPush', 'verticalPull', 'row', 'core', 'calf', 'shin']) overview.appendChild(h('div', { class: 'balance-row' }, [h('span', {}, GROUP_LABELS[group]), h('strong', {}, String(stats.groups[group] || 0))]));
  wrap.appendChild(overview);
  const feedback = [];
  if (stats.partial) feedback.push(`${stats.partial} Einheit(en) verkürzt gespeichert. Wenn das häufiger vorkommt, vor dem Start ein kürzeres Zeitbudget wählen.`);
  const recent = logs.filter(l => ['completed', 'partial'].includes(l.status)).slice(0, 3);
  if (recent.length >= 2 && recent.filter(l => Object.values(l.entries || {}).some(e => e.feedback === 'limit' || e.quality === 'loss')).length >= 2) feedback.push('In mehreren letzten Einheiten wurde eine Grenze oder Qualitätsverlust gemeldet. Ausführung, Erholung und Umfang prüfen, bevor Lasten steigen.');
  if (feedback.length) wrap.appendChild(h('div', { class: 'card' }, [h('h2', {}, 'Kurzer Rückblick'), ...feedback.map(t => h('p', { class: 'small' }, t))]));
  const catalogue = new Map();
  for (const log of logs) for (const [key, entry] of Object.entries(log.entries || {})) {
    if (!entry.sets?.some(s => !s.isWarmup)) continue;
    const id = historyKey(key, entry);
    if (!catalogue.has(id)) catalogue.set(id, { ...entryExercise(key, entry, log), id, name: entry.substituteName || entryExercise(key, entry, log).name });
  }
  wrap.appendChild(h('p', { class: 'section-title' }, 'DEINE ÜBUNGEN UND VARIANTEN'));
  if (!catalogue.size) wrap.appendChild(h('p', { class: 'muted small' }, 'Nach deiner ersten gespeicherten Einheit erscheinen hier die tatsächlich trainierten Übungen.'));
  for (const ex of catalogue.values()) wrap.appendChild(h('a', { href: `#/progress/${encodeURIComponent(ex.id)}`, class: 'exercise-row exercise-row-link' }, [h('span', {}, ex.name), h('span', { class: 'chevron' }, '›')]));
  return wrap;
}
export async function renderProgressDetail(rawId) {
  const id = decodeURIComponent(rawId), history = await getExerciseHistory(id), note = await getExerciseNote(id);
  const ex = history[0]?.exercise;
  if (!ex) return h('div', { class: 'view' }, [h('a', { href: '#/progress' }, '← Fortschritt'), h('p', {}, 'Noch keine Daten für diese Variante.')]);
  const wrap = h('div', { class: 'view' }, [h('a', { href: '#/progress', class: 'back-link' }, '← Fortschritt'), h('h1', {}, ex.name)]);
  const setups = [...new Set(history.map(row => row.setup))];
  const content = h('div', { class: 'view' });
  function render(setup) {
    content.replaceChildren();
    const rows = historicalLoads(ex, history.filter(row => row.setup === setup), note.legacyWeightConventions?.[setup]);
    content.appendChild(h('p', { class: 'muted small' }, 'Nur diese Übungsvariante und dieser Aufbau werden verglichen. Mehr Gewicht oder Haltezeit allein ist kein Nachweis besserer Ausführung.'));
    const comparison = comparePerformance(ex, rows[0], rows[1]);
    if (comparison) content.appendChild(h('p', { class: 'hint-box small' }, comparison.text + ' Einzelne Tagesunterschiede nicht überbewerten.'));
    const trend = adaptationFor(ex, rows, note.increment);
    if (trend) content.appendChild(h('p', { class: 'small' }, trend.text));
    if (ex.perSide) {
      const key = ex.reps ? 'reps' : 'holdSec', recent = rows[0]?.sets.filter(s => !s.isWarmup) || [];
      const pairs = recent.filter(s => Number.isFinite(s[key+'Left']) && Number.isFinite(s[key+'Right']));
      if (pairs.length) {
        const left = pairs.reduce((n,s) => n+s[key+'Left'],0), right = pairs.reduce((n,s) => n+s[key+'Right'],0);
        content.appendChild(h('p', { class: 'muted small' }, `Zuletzt links ${left} / rechts ${right} ${key === 'reps' ? 'Wiederholungen' : 'Sekunden'} insgesamt. Für Steigerungen zählt der kleinere Wert je Satz; ein einzelner Seitenunterschied ist keine diagnostizierte Dysbalance.`));
      }
    }
    for (const row of rows) content.appendChild(h('div', { class: 'card' }, [h('div', { class: 'card-label' }, fmtDate(row.date) + (row.status === 'partial' ? ' · verkürzt' : '')), ...row.sets.filter(s => !s.isWarmup).map((s, i) => h('p', { class: 'small' }, `Satz ${i + 1}: ${formatLoggedSet(ex, s)}`))]));
  }
  wrap.appendChild(h('label', { class: 'field' }, [h('span', {}, 'Aufbau'), h('select', { onchange: e => render(e.target.value) }, setups.map(s => h('option', { value: s }, s || 'Ohne zusätzliche Angabe')))]));
  wrap.appendChild(content); render(setups[0]); return wrap;
}
