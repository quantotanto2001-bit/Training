import { h, fmtDateTime } from '../ui.js';
import { getNextDay, getLastCompletedInfo } from '../state.js';
import { getActiveSession, getFinishedSessionLogs } from '../db.js';

export async function renderHome() {
  const [active, nextDay, lastInfo, finished] = await Promise.all([
    getActiveSession(),
    getNextDay(),
    getLastCompletedInfo(),
    getFinishedSessionLogs(),
  ]);

  const wrap = h('div', { class: 'view' });
  wrap.appendChild(h('div', { class: 'header' }, [
    h('h1', {}, 'Universal Athlete'),
    h('p', { class: 'muted' }, 'Kraft - Power - Ausdauer - Mobility'),
  ]));

  if (active) {
    const day = active.dayName || active.dayId;
    const doneCount = Object.values(active.entries || {}).filter((e) => e.sets && e.sets.length).length;
    wrap.appendChild(h('div', { class: 'card card-accent' }, [
      h('div', { class: 'card-label' }, 'Laeuft gerade'),
      h('h2', {}, day),
      h('p', { class: 'muted' }, `${doneCount} Uebung(en) mit Eintraegen`),
      h('a', { href: '#/workout', class: 'btn btn-primary' }, 'Training fortsetzen'),
    ]));
  }

  wrap.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'card-label' }, active ? 'Danach als naechstes' : 'Als naechstes dran'),
    h('h2', {}, nextDay.name + (nextDay.subtitle ? ' — ' + nextDay.subtitle : '')),
    nextDay.mobilitySkillFocus ? h('p', { class: 'muted' }, 'Mobility/Skill: ' + nextDay.mobilitySkillFocus) : null,
    h('p', { class: 'muted small' }, `${nextDay.blocks.flatMap(b => b.exercises).length} Uebungen`),
    !active ? h('a', { href: '#/workout', class: 'btn btn-primary' }, 'Training starten') : null,
  ]));

  wrap.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'card-label' }, 'Zuletzt abgeschlossen'),
    lastInfo
      ? h('p', {}, `${lastInfo.day.name} — ${fmtDateTime(lastInfo.finishedAt)}`)
      : h('p', { class: 'muted' }, 'Noch keine Einheit abgeschlossen. Leg los!'),
    h('p', { class: 'muted small' }, `${finished.length} Einheit(en) insgesamt geloggt`),
  ]));

  wrap.appendChild(h('div', { class: 'card muted-card' }, [
    h('p', { class: 'small' }, 'Kein starrer Wochenplan: die Reihenfolge der 6 Einheiten bleibt gleich, der Zeitpunkt ist frei. Trainiere, wann es passt — die App merkt sich, was als naechstes drankommt.'),
  ]));

  return wrap;
}
