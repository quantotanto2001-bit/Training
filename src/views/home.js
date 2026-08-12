import { h, typeIcon } from '../ui.js';
import { PLAN, estimateDurationMin, iconFor } from '../plan.js';
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
    h('h1', {}, 'Hallo, Jona'),
  ]));

  const overlayHost = h('div', {});
  wrap.appendChild(overlayHost);

  const exCount = day.blocks.flatMap((b) => b.exercises).length;
  const durationMin = estimateDurationMin(day);

  wrap.appendChild(h('p', { class: 'section-title' }, active ? 'TRAINING LÄUFT' : 'HEUTE'));

  if (active) {
    const doneCount = day.blocks.flatMap((b) => b.exercises).filter((exx) => {
      const e = active.entries && active.entries[exx.id];
      return e && e.sets && e.sets.some((s) => !s.isWarmup);
    }).length;
    const pct = exCount ? Math.round((doneCount / exCount) * 100) : 0;
    wrap.appendChild(h('div', { class: 'card today-card' }, [
      h('div', { class: 'today-card-head' }, [
        h('div', { class: 'exercise-icon-badge today-icon' }, typeIcon(iconFor(day.blocks[0].exercises[0]), day.blocks[0].exercises[0].id)),
        h('div', {}, [
          h('h2', {}, day.name + (day.subtitle ? ' — ' + day.subtitle : '')),
          h('p', { class: 'muted small' }, `ca. ${durationMin} Min · ${exCount} Übungen`),
        ]),
      ]),
      h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]),
      h('p', { class: 'muted small' }, `${doneCount} / ${exCount} Übungen`),
      h('a', { href: '#/workout', class: 'btn btn-primary btn-block' }, 'Training fortsetzen'),
      h('button', {
        class: 'link-small link-button',
        onclick: async () => {
          if (!window.confirm('Laufendes Training verwerfen? Bisherige Einträge dieser Einheit gehen verloren, der Trainingstag bleibt derselbe.')) return;
          await clearActiveSession();
          navigate('#/');
        },
      }, 'Training verwerfen'),
    ]));
    return wrap;
  }

  wrap.appendChild(h('div', { class: 'card today-card' }, [
    h('div', { class: 'today-card-head' }, [
      h('div', { class: 'exercise-icon-badge today-icon' }, typeIcon(iconFor(day.blocks[0].exercises[0]), day.blocks[0].exercises[0].id)),
      h('div', {}, [
        h('h2', {}, day.name + (day.subtitle ? ' — ' + day.subtitle : '')),
        h('p', { class: 'muted small' }, `ca. ${durationMin} Min · ${exCount} Übungen`),
      ]),
    ]),
    h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: 'width:0%' })]),
    h('p', { class: 'muted small' }, `0 / ${exCount} Übungen · Zyklus ${programState.currentCycle}`),
    h('button', { class: 'btn btn-primary btn-block', onclick: onStartClick }, 'Training starten'),
    h('div', { class: 'next-card-links' }, [
      h('a', { href: '#/plan', class: 'link-small' }, 'Plan ansehen'),
      h('button', { class: 'link-small link-button', onclick: onSkipClick }, 'Einheit überspringen'),
    ]),
  ]));

  const upcoming = [1, 2].map((offset) => PLAN[(day.order + offset) % PLAN.length]);
  wrap.appendChild(h('p', { class: 'section-title' }, 'NÄCHSTE EINHEITEN'));
  wrap.appendChild(h('div', { class: 'card upcoming-card' }, upcoming.map((d) => {
    const dCount = d.blocks.flatMap((b) => b.exercises).length;
    return h('a', { href: '#/plan', class: 'upcoming-row' }, [
      h('div', { class: 'exercise-icon-badge' }, typeIcon(iconFor(d.blocks[0].exercises[0]), d.blocks[0].exercises[0].id)),
      h('div', { class: 'workout-exercise-row-main' }, [
        h('div', { class: 'exercise-name' }, d.name + (d.subtitle ? ' — ' + d.subtitle : '')),
        h('div', { class: 'muted small' }, `ca. ${estimateDurationMin(d)} Min · ${dCount} Übungen`),
      ]),
      h('span', { class: 'chevron' }, '›'),
    ]);
  })));

  async function onStartClick() {
    const hint = await getRecoveryHint(day);
    if (hint) showRecoveryOverlay(hint);
    else window.location.hash = '#/workout';
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
              if (cycleJustCompleted) navigate(`#/cycle-complete/${completedCycleNumber}`);
              else navigate('#/');
            },
          }, 'Überspringen'),
        ]),
      ]),
    ]));
  }

  return wrap;
}
