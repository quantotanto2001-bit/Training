import { h, fmtRestRange, fmtMinSec, matchBadge, openVideoModal, typeIcon } from '../ui.js';
import { PLAN, TYPES, TYPE_LABELS, WARMUP_KINDS, computeRampSets, iconFor } from '../plan.js';
import { getActiveSession, setActiveSession, getLastPerformance, getExerciseNote, setExerciseNote } from '../db.js';
import { getCurrentDay, getProgressionSuggestion, completeCurrentDay } from '../state.js';
import { buildSetForm, formatLoggedSet } from '../setForms.js';
import { RestTimer } from '../timer.js';
import { navigate } from '../app.js';

const RIR_OPTIONS = ['0', '1', '2', '3', '4+', 'Versagen'];

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
  let customDate = null;
  let timerOwnerId = null; // welche Uebung den aktuell laufenden Timer gestartet hat
  const restTimer = new RestTimer({ onTick: () => renderContent(), onDone: () => renderContent() });

  const wrap = h('div', { class: 'view workout-view' });
  const contentEl = h('div', {});
  wrap.appendChild(contentEl);

  let mode = 'overview';
  let stepIndex = Math.min(active.currentIndex || 0, steps.length - 1);

  function persist() {
    if (!started) return;
    active.currentIndex = stepIndex;
    setActiveSession(active);
  }

  function markStartedAndPersist() {
    started = true;
    active.currentIndex = stepIndex;
    setActiveSession(active);
  }

  function isDone(exercise) {
    const e = active.entries[exercise.id];
    return !!(e && e.sets && e.sets.some((s) => !s.isWarmup));
  }

  async function onAbort() {
    if (!started) { navigate('#/'); return; }
    if (!window.confirm('Training abbrechen? Bisherige Einträge bleiben gespeichert, du kannst später fortsetzen. Der Trainingsfortschritt bewegt sich dabei nicht weiter.')) return;
    navigate('#/');
  }

  async function onFinish() {
    if (!window.confirm('Einheit als abgeschlossen markieren?')) return;
    if (customDate) active.finishedAt = customDate + 'T12:00:00.000Z';
    const { cycleJustCompleted, completedCycleNumber } = await completeCurrentDay(active);
    if (cycleJustCompleted) navigate(`#/cycle-complete/${completedCycleNumber}`);
    else navigate('#/');
  }

  function showOverview() {
    mode = 'overview';
    renderContent();
  }

  function showExercise(i) {
    mode = 'exercise';
    stepIndex = i;
    persist();
    renderContent();
  }

  async function renderContent() {
    contentEl.innerHTML = '';
    if (mode === 'overview') {
      contentEl.appendChild(renderOverviewScreen());
    } else {
      contentEl.appendChild(await renderExerciseScreen());
    }
  }

  function renderOverviewScreen() {
    const dateStr = customDate || active.startedAt.slice(0, 10);
    const doneCount = steps.filter((s) => isDone(s.exercise)).length;
    const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

    const box = h('div', { class: 'view' });
    box.appendChild(h('div', { class: 'workout-header-row' }, [
      h('div', {}, [
        h('h1', {}, active.dayName),
        h('p', { class: 'muted small' }, `${doneCount} / ${steps.length} Übungen`),
      ]),
      h('button', { class: 'btn btn-ghost btn-small', onclick: onAbort }, 'Abbrechen'),
    ]));
    box.appendChild(h('div', { class: 'progress-track' }, [
      h('div', { class: 'progress-fill', style: `width:${pct}%` }),
    ]));
    box.appendChild(h('label', { class: 'field retro-date-field' }, [
      h('span', {}, 'Datum dieser Einheit'),
      h('input', {
        type: 'date', value: dateStr,
        onchange: (e) => {
          customDate = e.target.value || null;
          if (customDate) {
            active.startedAt = customDate + active.startedAt.slice(10);
            persist();
          }
        },
      }),
    ]));

    const list = h('div', { class: 'workout-exercise-list' });
    steps.forEach((s, i) => {
      const entry = active.entries[s.exercise.id];
      const done = isDone(s.exercise);
      list.appendChild(h('button', { class: 'workout-exercise-row', onclick: () => showExercise(i) }, [
        h('div', { class: 'exercise-icon-badge' }, typeIcon(iconFor(s.exercise), s.exercise.id)),
        h('div', { class: 'workout-exercise-row-main' }, [
          h('div', { class: 'exercise-name' }, (entry && entry.substituteName) || s.exercise.name),
          h('div', { class: 'muted small' }, s.exercise.dosage || ''),
        ]),
        h('div', { class: 'workout-exercise-row-right' }, [
          done ? h('span', { class: 'check-circle check-circle-done' }, '✓') : h('span', { class: 'check-circle' }),
          h('span', { class: 'chevron' }, '›'),
        ]),
      ]));
    });
    box.appendChild(list);

    box.appendChild(h('button', { class: 'btn btn-primary btn-block btn-noarrow', onclick: onFinish }, 'Einheit abschliessen ✓'));
    return box;
  }

  async function renderExerciseScreen() {
    const { exercise, blockTitle } = steps[stepIndex];
    const entry = active.entries[exercise.id] || { sets: [] };
    active.entries[exercise.id] = entry;
    const exNote = await getExerciseNote(exercise.id);
    const lastPerf = await getLastPerformance(exercise.id);
    let progression = null;
    if ([TYPES.STRENGTH, TYPES.POWER].includes(exercise.type)) {
      progression = await getProgressionSuggestion(exercise);
    }

    const box = h('div', { class: 'view' });
    box.appendChild(h('div', { class: 'workout-header-row' }, [
      h('button', { class: 'btn-icon back-chevron', onclick: showOverview }, '‹ Übersicht'),
      h('button', { class: 'btn btn-ghost btn-small', onclick: onAbort }, 'Abbrechen'),
    ]));
    if (blockTitle) box.appendChild(h('div', { class: 'card-label' }, blockTitle));

    const titleRow = h('div', { class: 'exercise-title-row' });
    const titleMain = h('div', { class: 'exercise-title-main' }, [
      h('div', { class: 'exercise-icon-badge exercise-icon-badge-lg' }, typeIcon(iconFor(exercise), exercise.id)),
      h('h2', {}, entry.substituteName || exercise.name),
    ]);
    titleRow.appendChild(titleMain);
    titleRow.appendChild(h('button', { class: 'link-small link-button', onclick: () => toggleSubstituteEditor() }, entry.substituteName ? 'Ersatz ändern' : 'Ersetzen'));
    box.appendChild(titleRow);
    if (entry.substituteName) box.appendChild(h('p', { class: 'muted small' }, `Ersetzt: ${exercise.name}`));

    const substituteWrap = h('div', { class: 'substitute-editor substitute-editor-hidden' });
    box.appendChild(substituteWrap);
    function toggleSubstituteEditor() {
      substituteWrap.classList.toggle('substitute-editor-hidden');
      if (substituteWrap.classList.contains('substitute-editor-hidden')) return;
      substituteWrap.innerHTML = '';
      const input = h('input', { type: 'text', placeholder: 'z.B. Kurzhantelbankdrücken', value: entry.substituteName || '' });
      substituteWrap.appendChild(h('label', { class: 'field' }, [h('span', {}, 'Ersatzübung für heute (Plan bleibt unverändert)'), input]));
      substituteWrap.appendChild(h('button', {
        class: 'btn btn-small',
        onclick: () => { entry.substituteName = input.value.trim() || null; markStartedAndPersist(); renderContent(); },
      }, 'Übernehmen'));
    }

    box.appendChild(h('div', { class: 'exercise-meta' }, [
      h('span', { class: 'badge badge-neutral' }, TYPE_LABELS[exercise.type]),
      exercise.dosage ? h('span', { class: 'muted small' }, exercise.dosage) : null,
      exercise.restSec ? h('span', { class: 'muted small' }, 'Pause ' + fmtRestRange(exercise.restSec)) : null,
      exercise.targetRIR ? h('span', { class: 'muted small' }, 'Ziel-RIR ' + exercise.targetRIR) : null,
    ]));
    if (exercise.note) box.appendChild(h('p', { class: 'small' }, exercise.note));
    if (progression) box.appendChild(h('div', { class: 'progression-box' }, progression.text));
    if (exNote.nextTimeIntent) box.appendChild(h('div', { class: 'next-time-hint' }, `Vorgemerkt: ${exNote.nextTimeIntent}`));
    if (lastPerf) {
      const lastWork = lastPerf.sets.filter((s) => !s.isWarmup);
      box.appendChild(h('div', { class: 'last-perf' }, [
        h('div', { class: 'card-label' }, 'Letztes Training'),
        h('div', { class: 'small' }, lastWork.length ? lastWork.map((s) => formatLoggedSet(exercise, s)).join(' | ') : 'Keine Arbeitssätze vermerkt'),
      ]));
    }
    if (exercise.warmup) box.appendChild(renderWarmupBox(exercise, progression, entry, markStartedAndPersist, () => {}));

    // Grosser Timer ODER Satz-Eingabe (nicht gleichzeitig, wie im Vorbild).
    const timerHost = h('div', {});
    const entryHost = h('div', {});
    box.appendChild(timerHost);
    box.appendChild(entryHost);

    function renderTimerOrEntry() {
      timerHost.innerHTML = '';
      entryHost.innerHTML = '';
      // Nur auf der Uebung anzeigen, die den Timer tatsaechlich gestartet hat -
      // sonst wuerde ein laufender Timer beim Wechseln auf eine andere Uebung "mitwandern".
      if (restTimer.total > 0 && timerOwnerId === exercise.id) {
        timerHost.appendChild(renderBigTimer(restTimer));
      } else {
        if ([TYPES.STRENGTH, TYPES.POWER].includes(exercise.type)) {
          entryHost.appendChild(renderSetTable(exercise, entry, lastPerf, progression, exNote, onSetsChanged));
        } else {
          entryHost.appendChild(renderGenericSetForm(exercise, entry, lastPerf, progression, onSetsChanged));
        }
      }
    }

    function onSetsChanged(justLogged) {
      markStartedAndPersist();
      if (justLogged && exercise.restSec) {
        timerOwnerId = exercise.id;
        restTimer.start(exercise.restSec.min);
      }
      renderTimerOrEntry();
    }

    restTimer.onTick = () => renderTimerOrEntry();
    restTimer.onDone = () => renderTimerOrEntry();
    renderTimerOrEntry();

    box.appendChild(renderNotesBox(exercise, exNote));

    if (exercise.video) box.appendChild(renderVideoCard(exercise.video));
    else box.appendChild(h('p', { class: 'muted small' }, 'Keine Videoreferenz nötig für diese Übung.'));

    const navRow = h('div', { class: 'workout-nav' });
    navRow.appendChild(h('button', { class: 'btn', disabled: stepIndex === 0 ? '' : null, onclick: () => showExercise(stepIndex - 1) }, '← Vorherige'));
    if (stepIndex < steps.length - 1) {
      navRow.appendChild(h('button', { class: 'btn btn-primary', onclick: () => showExercise(stepIndex + 1) }, 'Nächste'));
    } else {
      navRow.appendChild(h('button', { class: 'btn btn-primary btn-noarrow', onclick: onFinish }, 'Einheit abschliessen ✓'));
    }
    box.appendChild(navRow);

    return box;
  }

  showOverview();
  return wrap;
}

function computeDefaults(exercise, sessionWorkSets, lastPerf, progression, exNote) {
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
  if (nextIndex === 0 && exNote && exNote.nextTimeIntent) {
    const match = exNote.nextTimeIntent.match(/(\d+([.,]\d+)?)/);
    if (match) base.weightKg = Number(match[1].replace(',', '.'));
  }
  return base;
}

// Kompakte Satz-Tabelle (Satz / Gewicht / Wdh. / Häkchen) für Kraft- und Power-Übungen.
function renderSetTable(exercise, entry, lastPerf, progression, exNote, onChange) {
  let extraRows = 0;
  const wrap = h('div', { class: 'set-table' });

  function workSets() { return entry.sets.filter((s) => !s.isWarmup); }

  function render() {
    wrap.innerHTML = '';
    wrap.appendChild(h('div', { class: 'set-table-header' }, [
      h('span', {}, 'Satz'), h('span', {}, 'Gewicht (kg)'), h('span', {}, 'Wdh.'), h('span', {}),
    ]));
    const plannedCount = exercise.sets || Math.max(1, workSets().length);
    const rowCount = Math.max(plannedCount, workSets().length) + extraRows;

    for (let i = 0; i < rowCount; i++) {
      const logged = workSets()[i] || null;
      const defaults = logged || computeDefaults(exercise, workSets().slice(0, i), lastPerf, progression, i === 0 ? exNote : null);
      const weightInput = h('input', { type: 'number', step: '0.5', inputmode: 'decimal', value: defaults.weightKg != null ? String(defaults.weightKg) : '' });
      const repsInput = h('input', {
        type: 'number', step: '1', inputmode: 'numeric', value: defaults.reps != null ? String(defaults.reps) : '',
        placeholder: exercise.reps ? `${exercise.reps.min}-${exercise.reps.max}` : '',
      });
      if (logged) { weightInput.disabled = true; repsInput.disabled = true; }

      const row = h('div', { class: 'set-table-row' + (logged ? ' set-table-row-done' : '') });
      row.appendChild(h('span', { class: 'set-table-index' }, String(i + 1)));
      row.appendChild(weightInput);
      row.appendChild(repsInput);
      row.appendChild(h('button', {
        class: 'set-check-btn' + (logged ? ' set-check-btn-done' : ''),
        'aria-label': logged ? 'Satz wieder öffnen' : 'Satz abschliessen',
        onclick: () => {
          if (logged) {
            entry.sets = entry.sets.filter((s) => s !== logged);
            onChange(false);
          } else {
            const w = weightInput.value ? Number(weightInput.value) : null;
            const r = repsInput.value ? Number(repsInput.value) : null;
            entry.sets.push({ weightKg: w, reps: r, rir: rirState[i] || '1', isWarmup: false, loggedAt: new Date().toISOString() });
            onChange(true);
          }
        },
      }, logged ? '✓' : ''));
      wrap.appendChild(row);

      if (!logged) {
        const rirRow = h('div', { class: 'rir-row' }, [
          h('span', { class: 'muted small' }, 'RIR'),
          ...RIR_OPTIONS.map((opt) => h('button', {
            class: 'rir-chip' + ((rirState[i] || '1') === opt ? ' rir-chip-active' : ''),
            onclick: () => { rirState[i] = opt; render(); },
          }, opt)),
        ]);
        wrap.appendChild(rirRow);
      }
    }
    wrap.appendChild(h('button', { class: 'btn btn-small', onclick: () => { extraRows += 1; render(); } }, '+ Satz hinzufügen'));
  }

  const rirState = {};
  render();
  return wrap;
}

// Für alle anderen Übungstypen (Mobility/Stretch/Skill/Cardio/Finisher) bleibt die
// bestehende, an den jeweiligen Feld-Mix angepasste Eingabe erhalten.
function renderGenericSetForm(exercise, entry, lastPerf, progression, onChange) {
  const wrap = h('div', {});
  const loggedWrap = h('div', { class: 'logged-sets' });
  wrap.appendChild(loggedWrap);

  function renderLogged() {
    loggedWrap.innerHTML = '';
    entry.sets.filter((s) => !s.isWarmup).forEach((s, idx) => {
      loggedWrap.appendChild(h('div', { class: 'logged-set-row' }, [
        h('span', { class: 'set-index' }, `Satz ${idx + 1}`),
        h('span', { class: 'set-summary' }, formatLoggedSet(exercise, s)),
        h('button', {
          class: 'btn-icon', 'aria-label': 'Löschen',
          onclick: () => { if (!window.confirm('Diesen Satz löschen?')) return; entry.sets = entry.sets.filter((x) => x !== s); onChange(false); renderLogged(); },
        }, '✕'),
      ]));
    });
  }
  renderLogged();

  const workSetsNow = entry.sets.filter((s) => !s.isWarmup);
  const defaults = computeDefaults(exercise, workSetsNow, lastPerf, progression, null);
  let form = buildSetForm(exercise, defaults);
  const formWrap = h('div', { class: 'set-form' });
  formWrap.appendChild(h('div', { class: 'card-label' }, `Satz ${workSetsNow.length + 1} eintragen`));
  formWrap.appendChild(form.el);
  formWrap.appendChild(h('button', {
    class: 'btn btn-primary',
    onclick: () => {
      const values = form.read();
      entry.sets.push({ ...values, isWarmup: false, loggedAt: new Date().toISOString() });
      onChange(true);
      renderLogged();
      const newDefaults = computeDefaults(exercise, entry.sets.filter((s) => !s.isWarmup), lastPerf, progression, null);
      form = buildSetForm(exercise, newDefaults);
      formWrap.replaceChild(form.el, formWrap.children[1]);
      formWrap.querySelector('.card-label').textContent = `Satz ${entry.sets.filter((s) => !s.isWarmup).length + 1} eintragen`;
    },
  }, 'Satz speichern'));
  wrap.appendChild(formWrap);
  return wrap;
}

function renderWarmupBox(exercise, progression, entry, markStartedAndPersist, onLocalChange) {
  const def = WARMUP_KINDS[exercise.warmup];
  const box = h('div', { class: 'warmup-box' });
  box.appendChild(h('div', { class: 'card-label' }, def.label));
  box.appendChild(h('p', { class: 'small' }, def.desc));

  if (def.ramp) {
    const suggestedWork = progression && (progression.suggestedWeight || progression.lastWeight);
    const weightInput = h('input', {
      type: 'number', step: '0.5', inputmode: 'decimal', placeholder: 'Arbeitsgewicht heute (kg)',
      value: suggestedWork != null ? String(suggestedWork) : '',
    });
    const listEl = h('div', { class: 'ramp-list' });
    box.appendChild(h('label', { class: 'field' }, [h('span', {}, 'Arbeitsgewicht heute (kg)'), weightInput]));
    box.appendChild(listEl);
    function renderRamp() {
      listEl.innerHTML = '';
      const w = Number(weightInput.value) || null;
      computeRampSets(exercise.warmup, w).forEach((r) => {
        const label = r.weightKg != null
          ? `${r.weightKg} kg x ${r.reps} (${r.pctLabel})${r.optional ? ' — optional' : ''}`
          : `${r.pctLabel} Arbeitslast x ${r.reps}${r.optional ? ' — optional' : ''}`;
        listEl.appendChild(h('label', { class: 'field field-checkbox' }, [h('input', { type: 'checkbox' }), h('span', {}, label)]));
      });
    }
    weightInput.addEventListener('input', renderRamp);
    renderRamp();
  }

  const loggedWarmupWrap = h('div', { class: 'logged-sets' });
  function renderLoggedWarmup() {
    loggedWarmupWrap.innerHTML = '';
    entry.sets.filter((s) => s.isWarmup).forEach((s) => {
      loggedWarmupWrap.appendChild(h('div', { class: 'logged-set-row' }, [
        h('span', { class: 'set-index' }, 'Warm-up'),
        h('span', { class: 'set-summary' }, formatLoggedSet(exercise, s)),
        h('button', {
          class: 'btn-icon', 'aria-label': 'Löschen',
          onclick: () => { entry.sets = entry.sets.filter((x) => x !== s); markStartedAndPersist(); renderLoggedWarmup(); },
        }, '✕'),
      ]));
    });
  }
  renderLoggedWarmup();
  box.appendChild(loggedWarmupWrap);

  const wWeight = h('input', { type: 'number', step: '0.5', inputmode: 'decimal', placeholder: 'kg' });
  const wReps = h('input', { type: 'number', step: '1', inputmode: 'numeric', placeholder: 'Wdh' });
  box.appendChild(h('div', { class: 'warmup-log-row' }, [
    wWeight, wReps,
    h('button', {
      class: 'btn btn-small',
      onclick: () => {
        if (!wWeight.value && !wReps.value) return;
        entry.sets.push({ weightKg: wWeight.value ? Number(wWeight.value) : null, reps: wReps.value ? Number(wReps.value) : null, isWarmup: true, loggedAt: new Date().toISOString() });
        wWeight.value = ''; wReps.value = '';
        markStartedAndPersist();
        renderLoggedWarmup();
      },
    }, '+ Aufwärmsatz'),
  ]));

  return box;
}

function renderNotesBox(exercise, exNote) {
  const box = h('div', { class: 'notes-box' });
  box.appendChild(h('div', { class: 'card-label' }, 'Notizen zu dieser Übung'));
  const noteInput = h('input', { type: 'text', placeholder: 'z.B. Sitzposition 3', value: exNote.note || '' });
  const nextInput = h('input', { type: 'text', placeholder: 'z.B. nächstes Mal 82,5 kg', value: exNote.nextTimeIntent || '' });
  const save = () => setExerciseNote(exercise.id, { note: noteInput.value.trim(), nextTimeIntent: nextInput.value.trim() });
  noteInput.addEventListener('blur', save);
  nextInput.addEventListener('blur', save);
  box.appendChild(h('label', { class: 'field' }, [h('span', {}, 'Dauerhafte Notiz'), noteInput]));
  box.appendChild(h('label', { class: 'field' }, [h('span', {}, 'Für nächstes Mal vormerken'), nextInput]));
  return box;
}

function renderBigTimer(restTimer) {
  const size = 220;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, restTimer.remaining / restTimer.total));
  const offset = c * (1 - pct);
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'big-timer-svg');
  const bg = document.createElementNS(svgNs, 'circle');
  bg.setAttribute('cx', size / 2); bg.setAttribute('cy', size / 2); bg.setAttribute('r', r);
  bg.setAttribute('class', 'timer-ring-bg'); bg.setAttribute('stroke-width', stroke);
  const fg = document.createElementNS(svgNs, 'circle');
  fg.setAttribute('cx', size / 2); fg.setAttribute('cy', size / 2); fg.setAttribute('r', r);
  fg.setAttribute('class', 'timer-ring-fg'); fg.setAttribute('stroke-width', stroke);
  fg.setAttribute('stroke-dasharray', String(c)); fg.setAttribute('stroke-dashoffset', String(offset));
  fg.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
  svg.appendChild(bg); svg.appendChild(fg);

  const wrap = h('div', { class: 'big-timer-card' }, [
    h('div', { class: 'big-timer-label' }, 'PAUSE'),
    h('div', { class: 'big-timer-ring-wrap' }, [svg, h('div', { class: 'big-timer-value' }, fmtMinSec(restTimer.remaining))]),
    h('div', { class: 'big-timer-controls' }, [
      h('button', { class: 'btn btn-small', onclick: () => restTimer.extend(30) }, '+30s'),
      h('button', { class: 'btn btn-small', onclick: () => restTimer.togglePause() }, restTimer.running ? 'Pause' : 'Weiter'),
    ]),
    h('button', { class: 'btn btn-block', onclick: () => restTimer.skip() }, 'Pause überspringen'),
  ]);
  return wrap;
}

function renderVideoCard(video) {
  const box = h('div', { class: 'video-card' });
  box.appendChild(h('div', { class: 'video-card-head' }, [h('span', { class: 'card-label' }, 'Technik'), matchBadge(video.match)]));
  box.appendChild(h('button', { class: 'btn btn-small video-link-btn', onclick: () => openVideoModal(video) }, 'Video ansehen'));
  box.appendChild(h('p', { class: 'muted small' }, video.label));
  if (video.match === 'ähnlich' && video.note) {
    box.appendChild(h('div', { class: 'adaptation-note' }, [
      h('strong', {}, 'Ähnliche Ausführung — für deinen Plan folgende Änderungen vornehmen:'),
      h('p', {}, video.note),
    ]));
  } else if (video.note) {
    box.appendChild(h('p', { class: 'small' }, video.note));
  }
  if (video.cues) box.appendChild(h('p', { class: 'small cues' }, video.cues));
  return box;
}
