import { h } from '../ui.js';
import { computeCycleSummary } from '../state.js';

export async function renderCycleComplete(cycleNumberStr) {
  const cycleNumber = Number(cycleNumberStr);
  const summary = await computeCycleSummary(cycleNumber);

  const wrap = h('div', { class: 'view' });
  wrap.appendChild(h('div', { class: 'header' }, [h('h1', {}, 'Zyklus abgeschlossen')]));

  wrap.appendChild(h('div', { class: 'card card-accent' }, [
    h('p', {}, `${summary.completedCount} von 6 regulaeren Einheiten abgeschlossen`),
    summary.skippedCount ? h('p', { class: 'muted small' }, `${summary.skippedCount} Einheit(en) uebersprungen`) : null,
    summary.durationDays ? h('p', { class: 'muted small' }, `Dauer des Zyklus: ${summary.durationDays} Tag(e)`) : null,
  ]));

  wrap.appendChild(h('a', { href: '#/', class: 'btn btn-primary btn-block' }, 'Weiter zu Trainingstag 1'));
  return wrap;
}
