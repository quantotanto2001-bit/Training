import { h, fmtRestRange, fmtMinSec, matchBadge } from '../ui.js';
import { PLAN, TYPES, TYPE_LABELS, WARMUP_KINDS, computeRampSets } from '../plan.js';
import { getActiveSession, setActiveSession, getLastPerformance } from '../db.js';
import { getCurrentDay, getProgressionSuggestion, completeCurrentDay } from '../state.js';
import { buildSetForm, formatLoggedSet } from '../setForms.js';
import { RestTimer } from '../timer.js';
import { navigate } from '../app.js';

export async function renderWorkout() {
  let active = await getActiveSession();
  // Nur eine bereits vorher (in einem früheren Aufruf) tatsächlich gespeicherte
  // Session gilt als "gestartet". Blosses Ansehen der Einheit ohne einen einzigen
  // eingetragenen Satz soll Zuhause nicht als "Training läuft" auftauchen.
  let started = !!active;
  if (!active) {
    const day = await getCurrentDay();
    active = {
      dayId: day.id, dayName: day.name + (day.subtitle ? ' — ' + day.subtitle : ''),
      startedAt: new Date().toISOString(), finishedAt: null, currentIndex: 0, entries: {},
    };
  }
  const day = PLAN.find((d) => d.id === active.dayId);
  const steps = day.blocks.flatMap((b) => b.exercises.map((exx) => ({ blockTitle: b.title, exercise: exx })));
  let stepIndex = Math.min(active.currentIndex || 0, steps.length - 1);

  const restTimer = new RestTimer({
    onTick: () => renderTimerBar(),
    onDone: () => renderTimerBar(),
  });

  const wrap = h('div', { class: 'view workout-view' });
  const headerEl = h('div', { class: 'workout-header' });
  const dotsEl = h('div', { class: 'step-dots' });
  const exerciseEl = h('div', { class: 'exercise-section' });
  const timerBarEl = h('div', { class: 'timer-bar timer-bar-hidden' });
  const navEl = h('div', { class: 'workout-nav' });

  wrap.appendChild(headerEl);
  wrap.appendChild(dotsEl);
  wrap.appendChild(exerciseEl);
  wrap.appendChild(navEl);
  wrap.appendChild(timerBarEl);

  function persist() {
    if (!started) return; // reines Ansehen ohne geloggten Satz wird nicht gespeichert
    active.currentIndex = stepIndex;
    setActiveSession(active);
  }

  function markStartedAndPersist() {
    started = true;
    active.currentIndex = stepIndex;
    setActiveSession(active);
  }

  function renderHeader() {
    headerEl.innerHTML = '';
    headerEl.appendChild(h('div', { class: 'workout-header-row' }, [
      h('div', {}, [
        h('h1', {}, active.dayName),
        h('p', { class: 'muted small' }, `Übung ${stepIndex + 1} / ${steps.length}`),
      ]),
      h('button', { class: 'btn btn-ghost btn-small', onclick: onAbort }, 'Abbrechen'),
    ]));
  }

  function renderDots() {
    dotsEl.innerHTML = '';
    steps.forEach((s, i) => {
      const done = active.entries[s.exercise.id] && active.entries[s.exercise.id].sets && active.entries[s.exercise.id].sets.some((st) => !st.isWarmup);
      dotsEl.appendChild(h('span', { class: 'dot' + (i === stepIndex ? ' dot-current' : '') + (done ? ' dot-done' : '') }));
    });
  }

  function renderTimerBar() {
    if (!restTimer.total) {
      timerBarEl.className = 'timer-bar timer-bar-hidden';
      timerBarEl.innerHTML = '';
      return;
    }
    timerBarEl.className = 'timer-bar';
    timerBarEl.innerHTML = '';
    timerBarEl.appendChild(h('div', { class: 'timer-display' }, fmtMinSec(restTimer.remaining)));
    timerBarEl.appendChild(h('div', { class: 'timer-controls' }, [
      h('button', { class: 'btn btn-small', onclick: () => restTimer.extend(30) }, '+30s'),
      h('button', { class: 'btn btn-small', onclick: () => restTimer.togglePause() }, restTimer.running ? 'Pause' : 'Weiter'),
      h('button', { class: 'btn btn-small btn-ghost', onclick: () => restTimer.skip() }, 'Überspringen'),
    ]));
  }

  async function onAbort() {
    if (!started) {
      // Nichts wurde eingetragen -> nichts zu verlieren, kein Nachfragen nötig.
      navigate('#/');
      return;
    }
    if (!window.confirm('Training abbrechen? Bisherige Einträge bleiben gespeichert, du kannst später fortsetzen. Der Trainingsfortschritt bewegt sich dabei nicht weiter.')) return;
    navigate('#/');
  }

  async function onFinish() {
    if (!window.confirm('Einheit als abgeschlossen markieren?')) return;
    const { cycleJustCompleted, completedCycleNumber } = await completeCurrentDay(active);
    if (cycleJustCompleted) {
      navigate(`#/cycle-complete/${completedCycleNumber}`);
    } else {
      navigate('#/');
    }
  }

  function goTo(i) {
    if (i < 0 || i >= steps.length) return;
    restTimer.stop();
    restTimer.total = 0;
    stepIndex = i;
    persist();
    renderAll();
  }

  async function renderExercise() {
    exerciseEl.innerHTML = '';
    const { exercise, blockTitle } = steps[stepIndex];
    const entry = active.entries[exercise.id] || { sets: [] };
    active.entries[exercise.id] = entry;

    const card = h('div', { class: 'card exercise-card' });
    if (blockTitle) card.appendChild(h('div', { class: 'card-label' }, blockTitle));
    card.appendChild(h('h2', {}, exercise.name));
    card.appendChild(h('div', { class: 'exercise-meta' }, [
      h('span', { class: 'badge badge-neutral' }, TYPE_LABELS[exercise.type]),
      exercise.dosage ? h('span', { class: 'muted small' }, exercise.dosage) : null,
      exercise.restSec ? h('span', { class: 'muted small' }, 'Pause ' + fmtRestRange(exercise.restSec)) : null,
      exercise.targetRIR ? h('span', { class: 'muted small' }, 'Ziel-RIR ' + exercise.targetRIR) : null,
    ]));
    if (exercise.note) card.appendChild(h('p', { class: 'small' }, exercise.note));

    // Fortschritts-/Progressionsvorschlag
    let progression = null;
    if ([TYPES.STRENGTH, TYPES.POWER].includes(exercise.type)) {
      progression = await getProgressionSuggestion(exercise);
      card.appendChild(h('div', { class: 'progression-box' }, progression.text));
    }
    const lastPerf = await getLastPerformance(exercise.id);
    if (lastPerf) {
      const lastWork = lastPerf.sets.filter((s) => !s.isWarmup);
      card.appendChild(h('div', { class: 'last-perf' }, [
        h('div', { class: 'card-label' }, 'Letztes Training'),
        h('div', { class: 'small' }, lastWork.length
          ? lastWork.map((s) => formatLoggedSet(exercise, s)).join(' | ')
          : 'Keine Arbeitssätze vermerkt'),
      ]));
    }

    // Warm-up
    if (exercise.warmup) {
      card.appendChild(renderWarmupBox(exercise, progression, lastPerf));
    }

    // Bereits geloggte Sätze
    const loggedWrap = h('div', { class: 'logged-sets' });
    renderLoggedSets();
    card.appendChild(loggedWrap);

    function renderLoggedSets() {
      loggedWrap.innerHTML = '';
      const workSets = entry.sets.filter((s) => !s.isWarmup);
      workSets.forEach((s, idx) => {
        loggedWrap.appendChild(h('div', { class: 'logged-set-row' }, [
          h('span', { class: 'set-index' }, `Satz ${idx + 1}`),
          h('span', { class: 'set-summary' }, formatLoggedSet(exercise, s)),
          h('button', { class: 'btn-icon', 'aria-label': 'Löschen', onclick: () => removeSet(s) }, '✕'),
        ]));
      });
    }

    function removeSet(setObj) {
      if (!window.confirm('Diesen Satz löschen?')) return;
      entry.sets = entry.sets.filter((s) => s !== setObj);
      persist();
      renderLoggedSets();
      renderDots();
    }

    // Satz hinzufügen
    const workSetsNow = entry.sets.filter((s) => !s.isWarmup);
    const defaults = computeDefaults(exercise, workSetsNow, lastPerf, progression);
    let form = buildSetForm(exercise, defaults);
    const formWrap = h('div', { class: 'set-form' });
    formWrap.appendChild(h('div', { class: 'card-label' }, `Satz ${workSetsNow.length + 1} eintragen`));
    formWrap.appendChild(form.el);
    formWrap.appendChild(h('button', {
      class: 'btn btn-primary',
      onclick: () => {
        const values = form.read();
        entry.sets.push({ ...values, isWarmup: false, loggedAt: new Date().toISOString() });
        markStartedAndPersist();
        renderLoggedSets();
        renderDots();
        // Pausentimer automatisch starten
        if (exercise.restSec) {
          restTimer.start(exercise.restSec.min);
          renderTimerBar();
        }
        // Formular für nächsten Satz neu aufbauen mit aktualisierten Defaults
        const newDefaults = computeDefaults(exercise, entry.sets.filter((s) => !s.isWarmup), lastPerf, progression);
        form = buildSetForm(exercise, newDefaults);
        formWrap.replaceChild(form.el, formWrap.children[1]);
        formWrap.querySelector('.card-label').textContent = `Satz ${entry.sets.filter((s) => !s.isWarmup).length + 1} eintragen`;
      },
    }, 'Satz speichern'));
    card.appendChild(formWrap);

    // Video-Referenz
    if (exercise.video) {
      card.appendChild(renderVideoCard(exercise.video));
    } else {
      card.appendChild(h('p', { class: 'muted small' }, 'Keine Videoreferenz nötig für diese Übung.'));
    }

    exerciseEl.appendChild(card);
  }

  function renderNav() {
    navEl.innerHTML = '';
    navEl.appendChild(h('button', { class: 'btn', disabled: stepIndex === 0 ? '' : null, onclick: () => goTo(stepIndex - 1) }, '← Zurück'));
    if (stepIndex < steps.length - 1) {
      navEl.appendChild(h('button', { class: 'btn btn-primary', onclick: () => goTo(stepIndex + 1) }, 'Weiter →'));
    } else {
      navEl.appendChild(h('button', { class: 'btn btn-primary', onclick: onFinish }, 'Einheit abschliessen ✓'));
    }
  }

  function renderAll() {
    renderHeader();
    renderDots();
    renderExercise();
    renderNav();
    renderTimerBar();
  }

  renderAll();
  return wrap;
}

function computeDefaults(exercise, sessionWorkSets, lastPerf, progression) {
  const nextIndex = sessionWorkSets.length;
  let base = {};
  if (sessionWorkSets.length > 0) {
    base = { ...sessionWorkSets[sessionWorkSets.length - 1] };
  } else if (lastPerf) {
    const lastWork = lastPerf.sets.filter((s) => !s.isWarmup);
    base = { ...(lastWork[nextIndex] || lastWork[lastWork.length - 1] || {}) };
  }
  if (nextIndex === 0 && progression && progression.status === 'increase' && progression.suggestedWeight != null) {
    base.weightKg = progression.suggestedWeight;
  }
  return base;
}

function renderWarmupBox(exercise, progression, lastPerf) {
  const def = WARMUP_KINDS[exercise.warmup];
  const box = h('div', { class: 'warmup-box' });
  box.appendChild(h('div', { class: 'card-label' }, '🔥 ' + def.label));
  box.appendChild(h('p', { class: 'small' }, def.desc));

  if (def.ramp) {
    const suggestedWork = progression && (progression.suggestedWeight || progression.lastWeight);
    const weightInput = h('input', {
      type: 'number', step: '0.5', inputmode: 'decimal',
      placeholder: 'Arbeitsgewicht heute (kg)',
      value: suggestedWork != null ? String(suggestedWork) : '',
    });
    const listEl = h('div', { class: 'ramp-list' });
    box.appendChild(h('label', { class: 'field' }, [h('span', {}, 'Arbeitsgewicht heute (kg)'), weightInput]));
    box.appendChild(listEl);

    function renderRamp() {
      listEl.innerHTML = '';
      const w = Number(weightInput.value) || null;
      const sets = computeRampSets(exercise.warmup, w);
      sets.forEach((r) => {
        const label = r.weightKg != null
          ? `${r.weightKg} kg x ${r.reps} (${r.pctLabel})${r.optional ? ' — optional' : ''}`
          : `${r.pctLabel} Arbeitslast x ${r.reps}${r.optional ? ' — optional' : ''}`;
        listEl.appendChild(h('label', { class: 'field field-checkbox' }, [
          h('input', { type: 'checkbox' }), h('span', {}, label),
        ]));
      });
    }
    weightInput.addEventListener('input', renderRamp);
    renderRamp();
  }

  return box;
}

function renderVideoCard(video) {
  const box = h('div', { class: 'video-card' });
  box.appendChild(h('div', { class: 'video-card-head' }, [
    h('span', { class: 'card-label' }, 'Technik'),
    matchBadge(video.match),
  ]));
  box.appendChild(h('a', { href: video.url, target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-small video-link-btn' }, 'Video ansehen ↗'));
  box.appendChild(h('p', { class: 'muted small' }, video.label));
  if (video.match === 'ähnlich' && video.note) {
    box.appendChild(h('div', { class: 'adaptation-note' }, [
      h('strong', {}, 'Ähnliche Ausführung — für deinen Plan folgende Änderungen vornehmen:'),
      h('p', {}, video.note),
    ]));
  } else if (video.note) {
    box.appendChild(h('p', { class: 'small' }, video.note));
  }
  if (video.cues) box.appendChild(h('p', { class: 'small cues' }, '🎯 ' + video.cues));
  return box;
}
