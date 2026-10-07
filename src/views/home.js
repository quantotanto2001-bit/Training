import { buildSessionPlan, defaultMinutes, timeOptions, sessionExercises, plannedSets, remainingSeconds } from '../training.js';
import { h, typeIcon } from '../ui.js';
import { PLAN, estimateDurationMin, iconFor } from '../plan.js';
import { getCurrentDay, getCurrentProgramState, getRecoveryHint, skipCurrentDay } from '../state.js';
import { getActiveSession, clearActiveSession, getSettings, saveSettings, getAllSessionLogs } from '../db.js';
import { timingSettings, activeMilliseconds } from '../sessionClock.js';
import { navigate } from '../app.js';
import { dayTitle, daySubtitle } from '../presentation.js';

const SKIP_REASONS = ['Verletzung / Beschwerden', 'Equipment nicht verfügbar', 'Zeit', 'Sonstiges'];

export async function renderHome() {
  const [active, currentDay, programState] = await Promise.all([
    getActiveSession(), getCurrentDay(), getCurrentProgramState(),
  ]);
  const day = (active && PLAN.find(d => d.id === active.dayId)) || currentDay;

  const wrap = h('div', { class: 'view home-view' });
  wrap.appendChild(h('div', { class: 'header' }, [
    h('h1', {}, 'Hallo, Jona'),
  ]));

  const overlayHost = h('div', {});
  wrap.appendChild(overlayHost);

  const settings = timingSettings(await getSettings(), await getAllSessionLogs());
  const planned = active?.planSnapshot || buildSessionPlan(day, defaultMinutes(day, settings), settings);
  const todayExercises = active ? sessionExercises(active) : planned.exercises;
  const exCount = todayExercises.length;
  const durationMin = planned.estimatedMinutes || estimateDurationMin(day);

  wrap.appendChild(h('p', { class: 'section-title' }, active ? active.clock?.paused ? 'Training pausiert' : 'Training läuft' : 'Heute'));

  if (active) {
    const doneCount = todayExercises.filter((exx) => {
      const e = active.entries && active.entries[exx.id];
      return e && e.sets && e.sets.filter((s) => !s.isWarmup).length >= plannedSets(exx);
    }).length;
    const pct = exCount ? Math.round((doneCount / exCount) * 100) : 0;
    wrap.appendChild(h('div', { class: 'card today-card' }, [
      h('div', { class: 'today-card-head' }, [
        h('div', { class: 'exercise-icon-badge today-icon' }, typeIcon(iconFor(day.blocks[0].exercises[0]), day.blocks[0].exercises[0].id)),
        h('div', {}, [
          h('h2', {}, dayTitle(day)),
          h('p', { class: 'today-subtitle' }, daySubtitle(day)),
          h('p', { class: 'muted small' }, active.clock ? `${Math.floor(activeMilliseconds(active) / 60000)} Min aktiv · noch ca. ${Math.ceil(remainingSeconds(active, day) / 60)} Min` : `ca. ${durationMin} Min · ${exCount} Übungen`),
        ]),
      ]),
      h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]),
      h('p', { class: 'muted small' }, `${doneCount} von ${exCount} Übungen erledigt`),
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

  wrap.appendChild(h('div', { class: 'time-picker' }, [
    h('p', { class: 'section-title' }, 'Deine Zeit'),
    h('div', { class: 'time-options' }, timeOptions(day).map(min => h('button', {
      class: 'time-option' + (planned.budgetMinutes === min ? ' selected' : ''),
      'aria-pressed': String(planned.budgetMinutes === min),
      onclick: async () => { await saveSettings({ [day.isFullBody ? 'strengthMinutes' : 'otherMinutes']: min }); navigate('#/'); },
    }, `${min} Min`))),
    h('p', { class: 'muted small' }, 'Inklusive Aufwärmen und Satzpausen.'),
    planned.warning ? h('p', { class: 'hint-box small' }, planned.warning) : null,
  ]));

  wrap.appendChild(h('div', { class: 'card today-card' }, [
    h('div', { class: 'today-card-head' }, [
      h('div', { class: 'exercise-icon-badge today-icon' }, typeIcon(iconFor(day.blocks[0].exercises[0]), day.blocks[0].exercises[0].id)),
      h('div', {}, [
        h('h2', {}, dayTitle(day)),
        h('p', { class: 'today-subtitle' }, daySubtitle(day)),
        h('p', { class: 'muted small' }, `ca. ${durationMin} Min · ${exCount} Übungen`),
      ]),
    ]),
    h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: 'width:0%' })]),
    h('p', { class: 'today-cycle muted small' }, `Einheit ${day.order + 1} von ${PLAN.length} · Zyklus ${programState.currentCycle}`),
    h('button', { class: 'btn btn-primary btn-block', onclick: onStartClick }, 'Training ansehen & starten'),
    h('div', { class: 'next-card-links' }, [
      h('a', { href: '#/plan', class: 'link-small' }, 'Plan ansehen'),
      h('button', { class: 'link-small link-button', onclick: onSkipClick }, 'Einheit überspringen'),
    ]),
  ]));

  const upcoming = [1, 2].map((offset) => PLAN[(day.order + offset) % PLAN.length]);
  wrap.appendChild(h('p', { class: 'section-title' }, 'Als Nächstes'));
  wrap.appendChild(h('div', { class: 'card upcoming-card' }, upcoming.map((d) => {
    const preview = buildSessionPlan(d, defaultMinutes(d, settings), settings);
    const dCount = preview.exercises.length;
    return h('a', { href: '#/plan', class: 'upcoming-row' }, [
      h('span', { class: 'upcoming-number', 'aria-hidden': 'true' }, String(d.order + 1).padStart(2, '0')),
      h('div', { class: 'workout-exercise-row-main' }, [
        h('div', { class: 'exercise-name' }, dayTitle(d)),
        h('div', { class: 'muted small' }, `ca. ${preview.estimatedMinutes} Min · ${dCount} Übungen`),
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
