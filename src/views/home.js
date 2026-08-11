import { h } from '../ui.js';
import { PLAN } from '../plan.js';
import { getCurrentDay, getCurrentProgramState, getRecoveryHint, skipCurrentDay } from '../state.js';
import { getActiveSession, clearActiveSession } from '../db.js';
import { navigate } from '../app.js';

const SKIP_REASONS = ['Verletzung / Beschwerden', 'Equipment nicht verfügbar', 'Zeit', 'Sonstiges'];

export async function renderHome() {
  const [active, day, programState] = await Promise.all([
    getActiveSession(), getCurrentDay(), getCurrentProgramState(),
  ]);

  const wrap = h('div', { class: 'view home-view' });
  wrap.appendChild(h('div', { class: 'header' }, [
    h('h1', {}, 'Universal Athlete'),
  ]));

  const overlayHost = h('div', {});
  wrap.appendChild(overlayHost);

  if (active) {
    wrap.appendChild(h('div', { class: 'card card-accent next-card' }, [
      h('div', { class: 'card-label' }, 'Training läuft'),
      h('h2', { class: 'next-day-title' }, day.name + (day.subtitle ? ' — ' + day.subtitle : '')),
      h('p', { class: 'muted small' }, `Trainingstag ${day.order + 1} von ${PLAN.length}`),
      h('a', { href: '#/workout', class: 'btn btn-primary btn-block' }, 'Training fortsetzen'),
      h('div', { class: 'next-card-links' }, [
        h('button', {
          class: 'link-small link-button',
          onclick: async () => {
            if (!window.confirm('Laufendes Training verwerfen? Bisherige Einträge dieser Einheit gehen verloren, der Trainingstag bleibt derselbe.')) return;
            await clearActiveSession();
            navigate('#/');
          },
        }, 'Training verwerfen'),
      ]),
    ]));
    return wrap;
  }

  const exCount = day.blocks.flatMap((b) => b.exercises).length;
  const nextCard = h('div', { class: 'card card-accent next-card' }, [
    h('div', { class: 'card-label' }, 'Als Nächstes'),
    h('h2', { class: 'next-day-title' }, day.name + (day.subtitle ? ' — ' + day.subtitle : '')),
    h('p', { class: 'muted small' }, `Trainingstag ${day.order + 1} von ${PLAN.length} · Zyklus ${programState.currentCycle} · ${exCount} Übungen`),
    h('button', { class: 'btn btn-primary btn-block', onclick: onStartClick }, 'Training starten'),
    h('div', { class: 'next-card-links' }, [
      h('a', { href: '#/plan', class: 'link-small' }, 'Plan ansehen'),
      h('button', { class: 'link-small link-button', onclick: onSkipClick }, 'Einheit überspringen'),
    ]),
  ]);
  wrap.appendChild(nextCard);

  async function onStartClick() {
    const hint = await getRecoveryHint(day);
    if (hint) {
      showRecoveryOverlay(hint);
    } else {
      window.location.hash = '#/workout';
    }
  }

  function showRecoveryOverlay(hint) {
    overlayHost.innerHTML = '';
    overlayHost.appendChild(h('div', { class: 'overlay-backdrop' }, [
      h('div', { class: 'overlay-card' }, [
        h('p', {}, hint),
        h('div', { class: 'overlay-actions' }, [
          h('button', { class: 'btn', onclick: () => { overlayHost.innerHTML = ''; } }, 'Später trainieren'),
          h('button', { class: 'btn btn-primary', onclick: () => { navigate('#/workout'); } }, 'Trotzdem starten'),
        ]),
      ]),
    ]));
  }

  function onSkipClick() {
    overlayHost.innerHTML = '';
    let selectedReason = null;
    const reasonList = h('div', { class: 'reason-list' }, SKIP_REASONS.map((r) => {
      const btn = h('button', { class: 'reason-btn', onclick: () => {
        selectedReason = r;
        Array.from(reasonList.children).forEach((c) => c.classList.remove('reason-btn-selected'));
        btn.classList.add('reason-btn-selected');
      } }, r);
      return btn;
    }));

    overlayHost.appendChild(h('div', { class: 'overlay-backdrop' }, [
      h('div', { class: 'overlay-card' }, [
        h('h3', {}, `${day.name} wirklich überspringen?`),
        h('p', { class: 'muted small' }, 'Grund (optional):'),
        reasonList,
        h('div', { class: 'overlay-actions' }, [
          h('button', { class: 'btn', onclick: () => { overlayHost.innerHTML = ''; } }, 'Abbrechen'),
          h('button', {
            class: 'btn btn-primary',
            onclick: async () => {
              overlayHost.innerHTML = '';
              const { cycleJustCompleted, completedCycleNumber } = await skipCurrentDay(selectedReason);
              if (cycleJustCompleted) {
                navigate(`#/cycle-complete/${completedCycleNumber}`);
              } else {
                navigate('#/');
              }
            },
          }, 'Überspringen'),
        ]),
      ]),
    ]));
  }

  return wrap;
}
