import { h, fmtRestRange, matchBadge } from '../ui.js';
import { PLAN, TYPE_LABELS } from '../plan.js';

export async function renderPlanOverview() {
  const wrap = h('div', { class: 'view' });
  wrap.appendChild(h('div', { class: 'header' }, [
    h('h1', {}, 'Der Plan'),
    h('p', { class: 'muted' }, 'Reihenfolge der 6 Einheiten. Wochentage sind nur Beispiele, kein Zwang.'),
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
