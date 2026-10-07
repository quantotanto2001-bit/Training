import { renderExerciseThumbnail, closeExerciseMedia } from '../exerciseMedia.js';
import { h, fmtRestRange, fmtMinSec } from '../ui.js';
import { PLAN, TYPES } from '../plan.js';
import { getActiveSession, setActiveSession, clearActiveSession, getExerciseHistory, getAllSessionLogs, getExerciseNote, setExerciseNote, getSettings, saveSettings, uid } from '../db.js';
import { getCurrentDay, completeCurrentDay } from '../state.js';
import { PLAN_VERSION, currentExerciseMedia, buildSessionPlan, defaultMinutes, timeOptions, alternativesFor, resolveExercise, sessionExercises, plannedSets, prescription, sessionMinutes, replanRemaining, remainingSeconds, restSeconds, GROUP_LABELS, SCIENCE_LINKS } from '../training.js';
import { progressionFor, setDefaults } from '../progression.js';
import { buildSetForm, formatLoggedSet } from '../setForms.js';
import { renderWarmupBox, renderVideoCard } from './workout-helpers.js';
import { RestTimer } from '../timer.js';
import { navigate } from '../app.js';
import { loadSpec, validateSet, historicalLoads, splitSides, loadText } from '../measurements.js';
import { startClock, pauseClock, resumeClock, finishClock, activeMilliseconds, timingProfile, timingSettings } from '../sessionClock.js';

const detail = (title, children) => h('details', { class: 'quiet-details' }, [h('summary', {}, title), ...children]);
const work = entry => entry.sets.filter(s => !s.isWarmup);
const num = el => el.value.trim() === '' ? null : Number(el.value);
const positive = n => Number.isFinite(n) && n > 0;
const clone = x => JSON.parse(JSON.stringify(x));

export async function renderWorkout() {
  let active = await getActiveSession();
  let started = !!active, settings = await getSettings(), finishing = false, renderToken = 0;
  const day = active ? PLAN.find(d => d.id === active.dayId) : await getCurrentDay();
  if (!day) throw new Error('Unbekannte gespeicherte Einheit. Bitte zuerst deine Daten sichern.');
  const logs = await getAllSessionLogs(), timing = timingProfile(logs, day.isFullBody);
  settings = timingSettings(settings, logs);
  active ||= { sessionId: uid(), dayId: day.id, dayName: day.name, planVersion: PLAN_VERSION,
    planSnapshot: buildSessionPlan(day, defaultMinutes(day, settings), settings), startedAt: new Date().toISOString(), currentIndex: 0, entries: {} };
  // Preserve an in-progress old workout instead of changing its prescription.
  active.planSnapshot ||= { version: '3.2', exercises: clone(sessionExercises(active)), optional: [] };
  active.sessionId ||= uid(); active.timerSessionId ||= active.startedAt;
  if (started) startClock(active, Date.now(), !active.clock);
  let stepIndex = Math.min(active.currentIndex || 0, active.planSnapshot.exercises.length - 1);
  let mode = started && !active.clock?.paused ? 'exercise' : 'overview';
  const timer = new RestTimer({ sessionId: active.timerSessionId });
  let holdAudio = null;
  const prepareHoldSound = () => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio && !holdAudio) holdAudio = new Audio();
      holdAudio?.resume().catch(() => {});
    } catch (e) { /* Sound is optional; the visible timer still works. */ }
  };
  const completionSound = result => {
    if (result.expired && !document.hidden && Date.now() - result.finishedAt < 1500 && holdAudio?.state === 'running') {
      try {
        const oscillator = holdAudio.createOscillator(), gain = holdAudio.createGain(), now = holdAudio.currentTime;
        oscillator.frequency.value = 740; gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        oscillator.connect(gain); gain.connect(holdAudio.destination);
        oscillator.start(now); oscillator.stop(now + 0.4);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      } catch (e) { /* Optional foreground completion sound. */ }
    }
  };
  timer.onDone = completionSound;
  const holdTimer = new RestTimer({ sessionId: active.timerSessionId, storageKey: 'universal-athlete-hold-timer', onDone: completionSound });
  const wrap = h('div', { class: 'view workout-view' });
  const error = h('p', { class: 'save-error', role: 'alert', hidden: '' });
  const content = h('div', {}); wrap.append(error, content);
  let clockLabel = null;
  const clockText = () => `${Math.floor(activeMilliseconds(active) / 60000)} Min aktiv · noch etwa ${Math.ceil(remainingSeconds(active, day) / 60)} Min${active.clock?.paused ? ' · pausiert' : ''}`;
  const clockLoop = setInterval(() => { if (clockLabel && started) clockLabel.textContent = clockText(); }, 10000);
  wrap.dispose = () => { renderToken++; clearInterval(clockLoop); timer.dispose(); holdTimer.dispose(); holdAudio?.close().catch(() => {}); closeExerciseMedia(); };
  const exercises = () => active.planSnapshot.exercises;
  const doneSets = ex => (active.entries[ex.id]?.sets || []).filter(s => !s.isWarmup);
  const completed = ex => doneSets(ex).length >= plannedSets(ex);

  async function persist() {
    if (!started || finishing) return;
    active.currentIndex = stepIndex;
    try { await setActiveSession(active); error.hidden = true; }
    catch (e) { error.textContent = 'Speichern fehlgeschlagen. Bitte diese Ansicht offen lassen und erneut versuchen.'; error.hidden = false; throw e; }
  }
  const saveDraft = () => { persist().catch(() => {}); };
  async function show(index) {
    if (!started) { if (!active.finishedAt) active.startedAt = new Date().toISOString(); started = true; startClock(active); }
    resumeClock(active);
    stepIndex = index; mode = 'exercise'; await persist(); await render();
  }
  async function pause() { if (started) pauseClock(active); await persist(); navigate('#/'); }
  async function finish() {
    if (finishing) return;
    if (!exercises().some(ex => doneSets(ex).length)) { window.alert('Bitte zuerst einen Arbeitssatz speichern.'); return; }
    const full = exercises().every(completed);
    if (!window.confirm(full ? 'Einheit abschließen und zur nächsten Einheit wechseln?' : 'Als verkürzte Einheit speichern und zur nächsten Einheit wechseln? Alle erledigten Sätze bleiben erhalten.')) return;
    finishClock(active); if (active.dateBackfilled) delete active.activeDurationSec;
    await persist(); finishing = true;
    try {
      const result = await completeCurrentDay(active, full ? 'completed' : 'partial'); timer.skip(); holdTimer.skip();
      navigate(result.cycleJustCompleted ? `#/cycle-complete/${result.completedCycleNumber}` : '#/');
    } catch (e) { finishing = false; error.hidden = false; error.textContent = 'Abschluss konnte nicht gespeichert werden. Bitte erneut versuchen.'; }
  }
  function timeControls() {
    const plan = active.planSnapshot;
    if (started && !['4.0', '4.1'].includes(active.planVersion)) return h('p', { class: 'muted small' }, 'Diese ältere laufende Einheit behält ihre ursprünglichen Vorgaben. Neue Einheiten haben ein änderbares Zeitbudget.');
    return h('div', {}, [h('p', { class: 'card-label' }, started ? 'Zeitbudget für die ganze Einheit · ohne Unterbrechungen' : 'Trainingsdauer'), h('div', { class: 'time-options', 'aria-label': 'Trainingsdauer' }, timeOptions(day).map(min => h('button', {
      class: 'time-option' + (plan.budgetMinutes === min ? ' selected' : ''), 'aria-pressed': String(plan.budgetMinutes === min), onclick: async () => {
        const currentId = exercises()[stepIndex]?.id;
        settings = { ...settings, [day.isFullBody ? 'strengthMinutes' : 'otherMinutes']: min };
        active.planSnapshot = started ? replanRemaining(active, day, min) : buildSessionPlan(day, min, settings);
        if (started) {
          for (const ex of exercises()) if (active.entries[ex.id]) { active.entries[ex.id].plannedSets = plannedSets(ex); if (active.entries[ex.id].exercise) active.entries[ex.id].exercise = clone(ex); }
          stepIndex = Math.max(0, exercises().findIndex(ex => ex.id === currentId));
        }
        await saveSettings(settings); await persist(); await render();
      },
    }, `${min} Min`))), ...(started ? [h('p', { class: 'muted small' }, 'Es wird nur der verbleibende Plan angepasst. Erledigte Sätze und Eingaben bleiben erhalten; Pausen bleiben gleich.')] : [])]);
  }
  function overview() {
    const plan = active.planSnapshot;
    const box = h('div', { class: 'view' }, [h('div', { class: 'workout-header-row' }, [h('h1', {}, day.name), h('button', { class: 'btn btn-ghost btn-small', onclick: pause }, started ? 'Pausieren' : 'Zurück')])]);
    box.appendChild(timeControls());
    clockLabel = h('p', { class: 'small' }, started ? clockText() : `Ungefähr ${sessionMinutes(exercises(), day.isFullBody, plan.timingFactor || 1)} Minuten · ${exercises().length} Übungen · inklusive Aufwärmen und Satzpausen`);
    box.appendChild(clockLabel);
    if (timing.samples >= 3) box.appendChild(h('p', { class: 'muted small' }, `Zeitplanung berücksichtigt ${timing.samples} vollständig erfasste Einheiten${timing.factor > 1 ? ' und deinen bisherigen Zeitbedarf' : ''}.`));
    if (plan.warning) box.appendChild(h('p', { class: 'hint-box small' }, plan.warning));
    if (day.warmupGeneral) box.appendChild(detail('Aufwärmen', [h('p', { class: 'small' }, day.warmupGeneral)]));
    const list = h('div', { class: 'workout-exercise-list' });
    exercises().forEach((ex, i) => list.appendChild(h('div', { class: 'workout-exercise-row' }, [
      renderExerciseThumbnail(ex),
      h('button', { class: 'workout-exercise-open', onclick: () => show(i) }, [h('div', { class: 'workout-exercise-row-main' }, [h('div', { class: 'exercise-name' }, ex.name), h('div', { class: 'muted small' }, `${prescription(ex)} · ${ex.core ? 'Grundblock' : 'Ergänzung'}`)]),
      h('span', { class: 'check-circle' + (completed(ex) ? ' check-circle-done' : '') }, completed(ex) ? '✓' : doneSets(ex).length ? '·' : ''),
      ]),
    ])));
    box.appendChild(list);
    if (plan.optional?.length) box.appendChild(detail('Weitere Übungen bei Bedarf', [h('p', { class: 'muted small' }, 'Ergänzungen verlängern die Dauer. Du musst sie nicht nachholen.'), ...plan.optional.map(ex => h('div', { class: 'optional-exercise-row' }, [renderExerciseThumbnail(ex), h('button', { class: 'optional-row', onclick: async () => {
      const currentId = exercises()[stepIndex]?.id;
      exercises().push(ex);
      if (day.isFullBody) exercises().sort((a, b) => (a.type === TYPES.POWER ? 0 : a.type === TYPES.SKILL ? 1 : 2) - (b.type === TYPES.POWER ? 0 : b.type === TYPES.SKILL ? 1 : 2));
      stepIndex = Math.max(0, exercises().findIndex(e => e.id === currentId));
      plan.optional = plan.optional.filter(e => e.id !== ex.id); await persist(); await render();
    } }, `${ex.name} · hinzufügen`)]))]));
    box.appendChild(h('button', { class: 'btn btn-primary btn-block', onclick: () => show(Math.max(0, exercises().findIndex(ex => !completed(ex)))) }, started ? 'Training fortsetzen' : 'Training beginnen'));
    if (started) box.appendChild(h('button', { class: 'btn btn-ghost', onclick: finish }, 'Beenden / verkürzt speichern'));
    const date = h('input', { type: 'date', value: active.startedAt.slice(0, 10), onchange: async e => {
      if (e.target.value) { active.startedAt = e.target.value + 'T12:00:00.000Z'; active.finishedAt = active.startedAt; active.dateBackfilled = true; await persist(); }
    } });
    box.appendChild(detail('Datum und Verwaltung', [h('label', { class: 'field' }, [h('span', {}, 'Datum bei nachträglichem Eintragen'), date]), h('button', { class: 'link-small link-button', onclick: async () => {
      if (!window.confirm('Diese laufende Einheit verwerfen? Abgeschlossene Trainings bleiben erhalten.')) return;
      finishing = true; timer.skip(); holdTimer.skip(); await clearActiveSession(); navigate('#/');
    } }, 'Laufende Einheit verwerfen')]));
    return box;
  }
  async function exerciseScreen() {
    const ex = currentExerciseMedia(exercises()[stepIndex]);
    const entry = active.entries[ex.id] ||= { sets: [], exercise: clone(ex), plannedSets: plannedSets(ex), drafts: {} };
    entry.drafts ||= {}; entry.plannedSets ||= plannedSets(ex);
    const note = await getExerciseNote(ex.id); entry.setup ??= note.setup || '';
    work(entry).forEach((s, i) => { s.slotIndex ??= i; });
    const spec = loadSpec(ex);
    const history = historicalLoads(ex, await getExerciseHistory(ex.id, entry.setup), note.legacyWeightConventions?.[entry.setup]);
    const last = history[0] || null;
    const suggestion = progressionFor(ex, last, note.increment, history);
    const box = h('div', { class: 'view' }, [h('div', { class: 'workout-header-row' }, [
      h('button', { class: 'btn-icon back-chevron', onclick: async () => { mode = 'overview'; await render(); } }, '‹ Übersicht'),
      h('span', { class: 'muted small' }, `${stepIndex + 1} / ${exercises().length}`), h('button', { class: 'btn btn-ghost btn-small', onclick: pause }, 'Pausieren'),
    ]), h('div', { class: 'exercise-heading exercise-heading-media' }, [renderExerciseThumbnail(ex), h('div', {}, [h('h2', {}, entry.substituteName || ex.name), h('p', { class: 'muted small' }, `${prescription(ex)}${ex.restSec ? ' · Pause ' + fmtRestRange(ex.restSec) : ''}`)])])]);
    clockLabel = h('p', { class: 'muted small workout-clock' }, clockText()); box.appendChild(clockLabel);
    box.appendChild(detail('Zeitbudget ändern', [timeControls(), ...(active.planSnapshot.warning ? [h('p', { class: 'hint-box small' }, active.planSnapshot.warning)] : [])]));
    if (last) box.appendChild(h('div', { class: 'last-perf' }, [h('span', { class: 'card-label' }, 'Zuletzt'), h('p', { class: 'small' }, last.sets.filter(s => !s.isWarmup).map(s => formatLoggedSet(ex, s)).join(' | '))]));
    const suggestionBox = h('section', { class: 'today-suggestion', 'aria-label': 'Vorschlag für heute' }, [h('span', { class: 'card-label' }, 'Vorschlag für heute'), h('p', { class: 'small' }, suggestion.text), ...(suggestion.suggestedWeight != null ? [h('button', { class: 'btn btn-small', onclick: async () => {
      for (let i = 0; i < plannedSets(ex); i++) if (!work(entry).some(s => s.slotIndex === i)) entry.drafts[i] = { ...entry.drafts[i], weightKg: suggestion.suggestedWeight };
      await persist(); await render();
    } }, `${suggestion.suggestedWeight} kg übernehmen`)] : [])]);
    if (spec && ex.type === TYPES.STRENGTH) {
      const increment = h('input', { type: 'number', min: '0.25', step: '0.25', inputmode: 'decimal', value: note.increment ?? '', placeholder: 'z. B. 1', onchange: async e => {
        note.increment = positive(num(e.target)) ? num(e.target) : null;
        await setExerciseNote(ex.id, note); await render();
      } });
      suggestionBox.appendChild(h('label', { class: 'field increment-field' }, [h('span', {}, `Verfügbarer Gewichtsschritt (${spec.short})`), increment]));
    }
    if (last?.loadCompatible === false && spec?.confirmLegacy && last.sets.some(s => !s.weightConvention && s.weightKg != null)) suggestionBox.appendChild(h('button', { class: 'btn btn-small', onclick: async () => {
      note.legacyWeightConventions = { ...note.legacyWeightConventions, [entry.setup]: spec.kind };
      await setExerciseNote(ex.id, note); await render();
    } }, `Frühere Werte bestätigen: ${spec.short}`));
    if (suggestion.suggestedSets && !completed(ex)) suggestionBox.appendChild(h('button', { class: 'btn btn-small', onclick: async () => {
      const protectedSlots = [...work(entry).map(s => s.slotIndex), ...Object.entries(entry.drafts).filter(([,v]) => Object.values(v).some(x => x != null && x !== '' && x !== false)).map(([k]) => Number(k))];
      if (protectedSlots.some(i => i >= suggestion.suggestedSets)) { error.textContent = 'In den zusätzlichen Sätzen gibt es bereits Einträge. Diese zuerst korrigieren; es wird nichts verworfen.'; error.hidden = false; return; }
      exercises()[stepIndex].sets = suggestion.suggestedSets; entry.exercise = clone(exercises()[stepIndex]); entry.plannedSets = plannedSets(exercises()[stepIndex]);
      active.planSnapshot.estimatedMinutes = sessionMinutes(exercises(), day.isFullBody, active.planSnapshot.timingFactor || 1);
      await persist(); await render();
    } }, `Heute ${suggestion.suggestedSets} Sätze testen`));
    box.appendChild(suggestionBox);
    if (ex.holdSec || holdTimer.total > 0) {
      box.appendChild(renderHoldTimer(ex, holdTimer, () => holdTimer.completed, seconds => {
        prepareHoldSound();
        timer.skip(); holdTimer.start(seconds, ex.id);
      }));
    }
    const timerHost = h('div', {}); box.appendChild(timerHost);
    const updateTimer = () => {
      timerHost.replaceChildren();
      if (timer.completed) { timerHost.appendChild(h('div', { class: 'timer-completed', role: 'status' }, [h('span', {}, 'Satzpause abgelaufen'), h('button', { class: 'link-small link-button', onclick: () => timer.skip() }, 'Schließen')])); return; }
      if (timer.total <= 0) return;
      timerHost.appendChild(h('div', { class: 'compact-timer' }, [h('div', {}, [h('span', { class: 'card-label' }, timer.ownerId === ex.id ? 'Satzpause' : 'Pause · vorherige Übung'), h('div', { class: 'timer-digits', role: 'timer' }, fmtMinSec(timer.remaining))]),
        h('div', { class: 'timer-actions' }, [h('button', { class: 'btn btn-small', onclick: () => timer.extend(30) }, '+30 s'), h('button', { class: 'btn btn-small', onclick: () => timer.togglePause() }, timer.running ? 'Anhalten' : 'Weiter'), h('button', { class: 'link-small link-button', onclick: () => timer.skip() }, 'Beenden')]) ]));
    };
    timer.onTick = updateTimer; updateTimer();
    const onSave = async logged => { if (logged === true) prepareHoldSound(); await persist(); if (logged === true && (holdTimer.ownerId === ex.id || holdTimer.completed?.ownerId === ex.id)) holdTimer.skip(); if (logged === true && ex.restSec) timer.start(restSeconds(ex), ex.id); else if (logged === false && timer.ownerId === ex.id) timer.skip(); await render(); };
    box.appendChild(ex.sets ? setTable(ex, entry, last, onSave, saveDraft) : singleForm(ex, entry, last, onSave, saveDraft));
    if (completed(ex) && ex.type === TYPES.STRENGTH) {
      const next = progressionFor(ex, { sets: entry.sets, plannedSets: entry.plannedSets, status: 'completed', rirReliable: true, feedback: entry.feedback, quality: entry.quality }, note.increment);
      const title = next.status === 'increase' ? (next.suggestedWeight != null ? `Nächstes Mal: ${loadText(ex, next.suggestedWeight)} versuchen` : 'Nächstes Mal: Gewicht erhöhen') : next.status === 'difficulty' ? 'Ziel erreicht · Schwierigkeit prüfen' : 'Nächstes Mal: Gewicht bestätigen';
      box.appendChild(h('div', { class: 'next-training-note', role: 'status' }, [h('strong', {}, title), h('p', { class: 'muted small' }, next.text)]));
    }
    if (completed(ex) && (ex.type === TYPES.POWER || ex.type === TYPES.SKILL)) {
      box.appendChild(detail('Bewegungsqualität · optional', [h('p', { class: 'muted small' }, 'Wiederholungen allein zeigen bei Schnellkraft und Fertigkeiten nicht die Qualität.'), h('div', { class: 'feedback-options' }, [['clean', 'Sauber'], ['loss', 'Qualität ließ nach']].map(([value, label]) => h('button', { class: 'feedback-chip' + (entry.quality === value ? ' selected' : ''), 'aria-pressed': String(entry.quality === value), onclick: async () => { entry.quality = entry.quality === value ? null : value; await persist(); await render(); } }, label)))]));
    }
    box.appendChild(h('div', { class: 'workout-nav' }, [h('button', { class: 'btn', disabled: stepIndex === 0 ? '' : null, onclick: () => show(stepIndex - 1) }, '← Zurück'), h('button', { class: 'btn btn-primary', onclick: () => stepIndex < exercises().length - 1 ? show(stepIndex + 1) : finish() }, stepIndex < exercises().length - 1 ? 'Nächste Übung' : 'Einheit abschließen')]));
    const setup = h('input', { type: 'text', value: entry.setup, placeholder: ex.tracking === 'neck' ? 'Handposition und Gegenhalten' : 'Ringhöhe, Sitzposition, Unterstützung', disabled: entry.sets.length ? '' : null });
    const text = h('input', { type: 'text', value: note.note || '', placeholder: 'Deine Notiz' });
    const saveNote = () => setExerciseNote(ex.id, { ...note, setup: setup.value.trim(), note: text.value });
    setup.addEventListener('change', async () => { entry.setup = setup.value.trim(); entry.drafts = {}; await saveNote(); await persist(); await render(); });
    text.addEventListener('change', saveNote);
    box.appendChild(detail(ex.tracking === 'neck' ? 'Widerstand / Handposition' : 'Aufbau und Notizen', [h('label', { class: 'field' }, [h('span', {}, 'Vergleichbarer Aufbau'), setup]), h('p', { class: 'muted small' }, 'Ein geänderter Aufbau beginnt eine eigene Vergleichsreihe. Nach gespeicherten Sätzen bleibt er für diese Einheit fest.'), h('label', { class: 'field' }, [h('span', {}, 'Notiz'), text]), ...(note.nextTimeIntent ? [h('p', { class: 'small' }, 'Frühere Vormerkung: ' + note.nextTimeIntent)] : [])]));
    const alternatives = alternativesFor(ex.slotId || ex.id);
    if (alternatives.length && ['4.0', PLAN_VERSION].includes(active.planVersion)) {
      const choices = [...(ex.slotId !== 'do-pistol' ? [{ key: '', name: resolveExercise(ex.slotId || ex.id).name }] : []), ...alternatives];
      box.appendChild(detail('Passende Ersatzübung', [h('p', { class: 'muted small' }, `Trainingsaufgabe: ${GROUP_LABELS[ex.group]}. Varianten haben eigene Lastverläufe; ihre Wirkung ist nicht völlig identisch.`), ...(entry.sets.length ? [h('p', { class: 'small' }, 'Für einen Wechsel zuerst die Sätze dieser Übung wieder öffnen.')] : choices.map(choice => h('button', { class: 'optional-row', onclick: async () => {
        const replacement = resolveExercise(ex.slotId || ex.id, choice.key); replacement.sets = ex.sets; replacement.core = ex.core; replacement.dosage = prescription(replacement);
        delete active.entries[ex.id]; exercises()[stepIndex] = replacement;
        active.planSnapshot.estimatedMinutes = sessionMinutes(exercises(), day.isFullBody, active.planSnapshot.timingFactor || 1);
        settings.variants = { ...settings.variants, [ex.slotId || ex.id]: choice.key }; await saveSettings(settings); await persist(); await render();
      } }, choice.name)))]));
    }
    if (ex.warmup) box.appendChild(detail('Aufwärmsätze', [renderWarmupBox(ex, suggestion, entry, saveDraft, () => {})]));
    box.appendChild(detail('Timer im Hintergrund', [h('p', { class: 'muted small' }, 'Beim Appwechsel zählt der Timer anhand seiner Endzeit weiter. Abgelaufene Timer bleiben nach dem Wiederöffnen sichtbar. Ein Ton ist nur bei geöffneter, aktiver App verfügbar; iOS kann diese Web-App im Hintergrund anhalten. Für einen verlässlichen Alarm bei geschlossener App zusätzlich den iPhone-Timer nutzen.')]));
    box.appendChild(detail('Technik und Zweck', [h('p', { class: 'small' }, ex.note || `Trainingsaufgabe: ${GROUP_LABELS[ex.group] || 'kontrollierte Bewegung'}. Aufbau und Bewegungsumfang vergleichbar halten.`), ...(ex.alternativeNote ? [h('p', { class: 'small' }, ex.alternativeNote)] : []), ...(ex.video ? [renderVideoCard(ex.video)] : []), h('p', { class: 'muted small' }, 'Die Forschung stützt Trainingsprinzipien; die konkrete Zusammenstellung ist eine praktische Ableitung.'), h('a', { href: SCIENCE_LINKS[ex.tracking === 'neck' ? 4 : 0].url, target: '_blank', rel: 'noopener noreferrer', class: 'link-small' }, 'Wissenschaftlicher Hintergrund ↗')]));
    return box;
  }
  async function render() { const token = ++renderToken; timer.onTick = () => {}; holdTimer.onTick = () => {}; const view = mode === 'overview' ? overview() : await exerciseScreen(); if (token === renderToken) { closeExerciseMedia(); content.replaceChildren(view); } }
  if (started) await persist();
  await render(); return wrap;
}

function renderHoldTimer(ex, timer, completed, start) {
  const root = h('section', { class: 'hold-timer', 'aria-label': 'Halte-Timer' });
  const label = h('span', { class: 'card-label' }, 'Halte-Timer');
  const digits = h('div', { class: 'timer-digits', role: 'timer', 'aria-label': 'Verbleibende Haltezeit' });
  const pause = h('button', { type: 'button', class: 'btn btn-small', onclick: () => timer.togglePause() });
  const active = h('div', { class: 'compact-timer' }, [h('div', {}, [label, digits]), h('div', { class: 'timer-actions' }, [pause, h('button', { type: 'button', class: 'link-small link-button', onclick: () => timer.skip() }, 'Timer beenden')])]);
  const status = h('p', { class: 'small', role: 'status' });
  root.append(active, status);
  if (ex.holdSec) {
    const choices = [...new Set([ex.holdSec.min, 30, 45, ex.holdSec.max])].filter(n => Number.isFinite(n) && n >= ex.holdSec.min && n <= ex.holdSec.max).sort((a,b) => a-b);
    root.append(h('span', { class: 'card-label' }, 'Haltezeit starten'), h('div', { class: 'time-options' }, choices.map(seconds => h('button', { type: 'button', class: 'btn btn-small', onclick: () => start(seconds) }, `${seconds} s starten`))));
    if (ex.perSide || ex.directions) root.appendChild(h('p', { class: 'muted small' }, ex.directions ? 'Timer für jede Richtung neu starten.' : 'Timer für jede Seite neu starten.'));
  }
  timer.onTick = () => {
    active.hidden = timer.total <= 0;
    label.textContent = timer.ownerId === ex.id ? 'Halte-Timer' : 'Haltezeit · vorherige Übung';
    digits.textContent = fmtMinSec(timer.remaining);
    pause.textContent = timer.running ? 'Timer anhalten' : 'Timer fortsetzen';
    const done = completed();
    status.hidden = !done || done.ownerId !== ex.id;
    status.textContent = done?.ownerId === ex.id ? `${done.seconds} Sekunden abgelaufen. Tatsächlich gehaltene Zeit im Satz eintragen.` : '';
  };
  timer.onTick();
  return root;
}

function setTable(ex, entry, last, onSave, saveDraft) {
  const wrap = h('div', { class: 'set-table' });
  const spec = loadSpec(ex), hasWeight = !!spec;
  const hasReps = !!ex.reps, hasHold = !!ex.holdSec;
  const sideCount = ex.perSide ? 2 : 1;
  const style = `grid-template-columns: 32px repeat(${Number(hasWeight) + (Number(hasReps) + Number(hasHold)) * sideCount}, minmax(0, 1fr)) 76px`;
  if (spec) wrap.appendChild(h('div', { class: 'weight-convention' }, [h('strong', { class: 'small' }, spec.label), h('p', { class: 'muted small' }, spec.hint)]));
  if (ex.perSide) wrap.appendChild(h('p', { class: 'muted small' }, 'Links und rechts getrennt eintragen. Mit der schwächeren Seite beginnen; für Gewichtsvorschläge zählt der kleinere Wert.'));
  wrap.appendChild(h('div', { class: 'set-table-header', style }, [h('span', {}, 'Satz'), ...(hasWeight ? [h('span', {}, 'kg')] : []), ...(hasReps ? (ex.perSide ? ['L Wdh.', 'R Wdh.'] : ['Wdh.']).map(label => h('span', {}, label)) : []), ...(hasHold ? (ex.perSide ? ['L Sek.', 'R Sek.'] : ['Sek.']).map(label => h('span', {}, label)) : []), h('span', {}, '')]));
  const rows = work(entry), defaults = setDefaults(ex, rows, last), allDetails = [];
  const nextSlot = Array.from({ length: plannedSets(ex) }, (_, i) => i).find(i => !rows.some(s => s.slotIndex === i));
  const count = Math.max(plannedSets(ex) + (entry.extraSets || 0), ...rows.map(s => (s.slotIndex ?? 0) + 1));
  for (let i = 0; i < count; i++) {
    const logged = rows.find(s => s.slotIndex === i), draft = entry.drafts[i] ||= {}, values = logged || { ...defaults, ...draft };
    if (ex.directions && i % ex.sets === 0) wrap.appendChild(h('p', { class: 'direction-label' }, ex.directions[Math.floor(i / ex.sets)] || 'Zusatz'));
    const row = h('div', { class: 'set-table-row' + (logged ? ' set-table-row-done' : i === nextSlot ? ' set-table-row-current' : ''), style }, [h('span', { class: 'set-table-index' }, String(i + 1))]);
    const fields = {};
    function add(key, label, step, placeholder) {
      const el = h('input', { type: 'number', min: '0', step, inputmode: step === '1' ? 'numeric' : 'decimal', value: values[key] ?? '', placeholder, 'aria-label': `Satz ${i + 1} ${label}`, disabled: logged ? '' : null });
      el.addEventListener('input', () => { draft[key] = num(el); saveDraft(); }); fields[key] = el; row.appendChild(el);
    }
    const legacyLogged = logged && ex.perSide && !splitSides(ex, logged);
    if (legacyLogged) row.appendChild(h('span', { class: 'small', style: 'grid-column: 2 / -2' }, formatLoggedSet(ex, logged)));
    else {
      if (hasWeight) add('weightKg', 'Gewicht', '0.25', '–');
      for (const [key, label, range] of [['reps', 'Wiederholungen', ex.reps], ['holdSec', 'Haltezeit', ex.holdSec]]) {
        if (!range) continue;
        if (ex.perSide) { add(key + 'Left', label + ' links', '1', `${range.min}–${range.max}`); add(key + 'Right', label + ' rechts', '1', `${range.min}–${range.max}`); }
        else add(key, label, '1', `${range.min}–${range.max}`);
      }
    }
    const error = h('p', { class: 'small save-error', role: 'alert', hidden: '' });
    row.appendChild(h('button', { class: 'set-check-btn' + (logged ? ' set-check-btn-done' : ''), 'aria-label': `Satz ${i + 1} ${logged ? 'wieder öffnen' : 'speichern'}`, onclick: async () => {
      if (!logged && work(entry).some(s => s.slotIndex === i)) return;
      if (logged) { entry.drafts[i] = { ...logged }; entry.sets = entry.sets.filter(s => s !== logged); await onSave(false); return; }
      const next = Object.fromEntries(Object.entries(fields).map(([key, el]) => [key, num(el)]));
      const issue = validateSet(ex, next);
      if (issue) { error.textContent = issue; error.hidden = false; return; }
      entry.sets.push({ ...next, ...(spec ? { weightConvention: spec.kind } : {}), rir: ex.type === TYPES.STRENGTH ? draft.rir || null : null, rirSource: draft.rir ? 'explicit' : null, technikverlust: !!draft.technikverlust, effort: draft.effort || null, resistance: draft.resistance || defaults.resistance || null, direction: ex.directions?.[Math.floor(i / ex.sets)] || null, slotIndex: i, isWarmup: false, loggedAt: new Date().toISOString() });
      delete entry.drafts[i]; await onSave(true);
    } }, logged ? '✓ Ändern' : 'Speichern'));
    wrap.append(row, error);
    if (!logged) {
      const extras = [h('label', { class: 'field field-checkbox' }, [h('input', { type: 'checkbox', checked: draft.technikverlust ? '' : null, onchange: e => { draft.technikverlust = e.target.checked; saveDraft(); } }), h('span', {}, 'Ausführung / Bewegungsumfang ließ nach')])];
      if (ex.type === TYPES.STRENGTH) extras.unshift(h('label', { class: 'field' }, [h('span', {}, 'RIR · verbleibende saubere Wiederholungen'), h('select', { 'aria-label': `RIR Satz ${i + 1}`, onchange: e => { draft.rir = e.target.value || null; saveDraft(); } }, ['', '0', '1', '2', '3', '4+', 'Versagen'].map(v => h('option', { value: v, selected: (draft.rir || '') === v ? '' : null }, v || 'Keine Angabe')))]));
      if (ex.tracking === 'neck') extras.unshift(h('label', { class: 'field' }, [h('span', {}, 'Widerstand'), h('input', { type: 'text', value: draft.resistance || defaults.resistance || '', placeholder: 'Handdruck, gleiche Position', onchange: e => { draft.resistance = e.target.value; saveDraft(); } })]), h('label', { class: 'field' }, [h('span', {}, 'Anstrengung'), h('select', { 'aria-label': `Anstrengung Satz ${i + 1}`, onchange: e => { draft.effort = e.target.value || null; saveDraft(); } }, ['', 'leicht', 'mittel', 'hoch'].map(v => h('option', { value: v, selected: (draft.effort || '') === v ? '' : null }, v || 'Keine Angabe')))]));
      allDetails.push(h('div', { class: 'set-extra-fields' }, [h('p', { class: 'card-label' }, `Satz ${i + 1}`), ...extras]));
    }
  }
  wrap.appendChild(h('p', { class: 'set-completion muted small' }, `${rows.length} von ${plannedSets(ex)} Arbeitssätzen gespeichert`));
  if (allDetails.length) wrap.appendChild(detail(ex.tracking === 'neck' ? 'Widerstand und Anstrengung · optional' : ex.type === TYPES.STRENGTH ? 'Technik und RIR · optional' : 'Technikdetails · optional', allDetails));
  if (!ex.directions) wrap.appendChild(h('button', { class: 'link-small link-button', onclick: async () => { entry.extraSets = (entry.extraSets || 0) + 1; await onSave(null); } }, '+ Zusätzlicher Satz'));
  return wrap;
}
function singleForm(ex, entry, last, onSave, saveDraft) {
  const wrap = h('div', { class: 'set-form' });
  for (const s of work(entry)) wrap.appendChild(h('div', { class: 'logged-set-row' }, [h('span', {}, formatLoggedSet(ex, s)), h('button', { class: 'btn btn-small', onclick: async () => { entry.sets = entry.sets.filter(x => x !== s); entry.formDraft = { ...s, durationMin: s.durationSec / 60 }; await onSave(false); } }, 'Korrigieren')]));
  if (work(entry).length) return wrap;
  const form = buildSetForm(ex, { ...setDefaults(ex, [], last), ...entry.formDraft });
  form.el.addEventListener('input', () => { const v = form.read(); entry.formDraft = { ...v, durationMin: v.durationSec ? v.durationSec / 60 : null }; saveDraft(); });
  const error = h('p', { class: 'small save-error', role: 'alert', hidden: '' });
  wrap.append(form.el, error, h('button', { class: 'btn btn-primary', onclick: async () => {
    if (work(entry).length) return;
    const values = form.read();
    if ((ex.type === TYPES.CARDIO && !positive(values.durationSec)) || (ex.type === TYPES.SKILL && !positive(values.holdSec) && !positive(values.reps)) || (ex.type === TYPES.FINISHER && !positive(values.rounds))) { error.hidden = false; error.textContent = 'Bitte tatsächlich absolvierte Dauer, Versuche oder Runden eintragen.'; return; }
    entry.sets.push({ ...values, isWarmup: false, loggedAt: new Date().toISOString() }); entry.formDraft = {}; await onSave(true);
  } }, 'Speichern'));
  return wrap;
}
