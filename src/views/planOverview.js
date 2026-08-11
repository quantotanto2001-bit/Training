import { h, fmtRestRange, matchBadge } from '../ui.js';
import { PLAN, TYPE_LABELS } from '../plan.js';
import { getCurrentProgramState } from '../state.js';
import { getActiveSession } from '../db.js';

export async function renderPlanOverview() {
  const [programState, active] = await Promise.all([getCurrentProgramState(), getActiveSession()]);

  const wrap = h('div', { class: 'view' });
  wrap.appendChild(h('div', { class: 'header' }, [
    h('h1', {}, 'Der Plan'),
    h('p', { class: 'muted' }, 'Reihenfolge der 6 Einheiten. Wochentage sind nur Beispiele, kein Zwang.'),
  ]));

  wrap.appendChild(h('div', { class: 'card cycle-status-card' }, [
    h('div', { class: 'card-label' }, `Aktuell: Trainingstag ${programState.currentDayOrder + 1} von ${PLAN.length} · Zyklus ${programState.currentCycle}`),
    h('div', { class: 'cycle-checklist' }, PLAN.map((d) => {
      const isCurrent = d.order === programState.currentDayOrder;
      const isDone = d.order < programState.currentDayOrder;
      const marker = isCurrent ? '->' : (isDone ? '[x]' : '[ ]');
      const row = h('div', { class: 'cycle-check-row' + (isCurrent ? ' cycle-check-current' : '') }, [
        h('span', { class: 'cycle-check-marker' }, marker),
        h('span', { class: 'cycle-check-label' }, `Tag ${d.order + 1} — ${d.name}${d.subtitle ? ': ' + d.subtitle : ''}`),
        isCurrent && active ? h('span', { class: 'badge badge-yellow' }, 'In Bearbeitung') : null,
      ]);
      return row;
    })),
  ]));

  for (const day of PLAN) {
    const details = h('details', { class: 'card plan-day' });
    details.appendChild(h('summary', {}, [
      h('span', { class: 'plan-day-title' }, `${day.name}${day.subtitle ? ' — ' + day.subtitle : ''}`),
      h('span', { class: 'muted small' }, day.dayHint),
    ]));
    if (day.mobilitySkillFocus) {
      details.appendChild(h('p', { class: 'muted small' }, 'Mobility/Skill: ' + day.mobilitySkillFocus));
    }
    if (day.warmupGeneral) {
      details.appendChild(h('p', { class: 'small' }, day.warmupGeneral));
    }
    for (const block of day.blocks) {
      if (block.title) details.appendChild(h('h3', { class: 'block-title' }, block.title));
      const list = h('div', { class: 'exercise-list' });
      for (const exArr of [block.exercises]) {
        for (const exx of exArr) {
          list.appendChild(h('div', { class: 'exercise-row' }, [
            h('div', {}, [
              h('div', { class: 'exercise-name' }, exx.name),
              h('div', { class: 'muted small' }, [
                exx.dosage || '', exx.restSec ? ` · Pause ${fmtRestRange(exx.restSec)}` : '',
              ].join('')),
            ]),
            h('div', { class: 'exercise-row-right' }, [
              h('span', { class: 'badge badge-neutral' }, TYPE_LABELS[exx.type] || exx.type),
              exx.video ? matchBadge(exx.video.match) : null,
            ]),
          ]));
        }
      }
      details.appendChild(list);
    }
    wrap.appendChild(details);
  }

  return wrap;
}
