import { renderExerciseThumbnail, closeExerciseMedia } from '../exerciseMedia.js';
import { h, fmtRestRange, fmtMinSec } from '../ui.js';
import { PLAN, TYPES } from '../plan.js';
import { getActiveSession, setActiveSession, clearActiveSession, getLastPerformance, getExerciseNote, setExerciseNote, getSettings, saveSettings, uid } from '../db.js';
import { getCurrentDay, completeCurrentDay } from '../state.js';
import { PLAN_VERSION, buildSessionPlan, defaultMinutes, timeOptions, alternativesFor, resolveExercise, sessionExercises, plannedSets, prescription, sessionMinutes, GROUP_LABELS, SCIENCE_LINKS } from '../training.js';
import { progressionFor, setDefaults } from '../progression.js';
import { buildSetForm, formatLoggedSet } from '../setForms.js';
import { renderWarmupBox, renderVideoCard } from './workout-helpers.js';
import { RestTimer } from '../timer.js';
import { navigate } from '../app.js';

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
  active ||= { sessionId: uid(), dayId: day.id, dayName: day.name, planVersion: PLAN_VERSION,
    planSnapshot: buildSessionPlan(day, defaultMinutes(day, settings), settings), startedAt: new Date().toISOString(), currentIndex: 0, entries: {} };
  // Preserve an in-progress old workout instead of changing its prescription.
  active.planSnapshot ||= { version: '3.2', exercises: clone(sessionExercises(active)), optional: [] };
  active.sessionId ||= uid(); active.timerSessionId ||= active.startedAt;
  let stepIndex = Math.min(active.currentIndex || 0, active.planSnapshot.exercises.length - 1);
  let mode = started ? 'exercise' : 'overview';
  const timer = new RestTimer({ sessionId: active.timerSessionId });
  const wrap = h('div', { class: 'view workout-view' });
  const error = h('p', { class: 'save-error', role: 'alert', hidden: '' });
  const content = h('div', {}); wrap.append(error, content);
  wrap.dispose = () => { renderToken++; timer.dispose(); closeExerciseMedia(); };
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
    if (!started) { if (!active.finishedAt) active.startedAt = new Date().toISOString(); started = true; }
    stepIndex = index; mode = 'exercise'; await persist(); await render();
  }
  async function pause() { await persist(); navigate('#/'); }
  async function finish() {
    if (finishing) return;
    if (!exercises().some(ex => doneSets(ex).length)) { window.alert('Bitte zuerst einen Arbeitssatz speichern.'); return; }
    const full = exercises().every(completed);
    if (!window.confirm(full ? 'Einheit abschließen und zur nächsten Einheit wechseln?' : 'Als verkürzte Einheit speichern und zur nächsten Einheit wechseln? Alle erledigten Sätze bleiben erhalten.')) return;
    await persist(); finishing = true;
    try {
      const result = await completeCurrentDay(active, full ? 'completed' : 'partial'); timer.skip();
      navigate(result.cycleJustCompleted ? `#/cycle-complete/${result.completedCycleNumber}` : '#/');
    } catch (e) { finishing = false; error.hidden = false; error.textContent = 'Abschluss konnte nicht gespeichert werden. Bitte erneut versuchen.'; }
  }
  function overview() {
    const plan = active.planSnapshot;
    const box = h('div', { class: 'view' }, [h('div', { class: 'workout-header-row' }, [h('h1', {}, day.name), h('button', { class: 'btn btn-ghost btn-small', onclick: pause }, started ? 'Pausieren' : 'Zurück')])]);
    if (!started) box.appendChild(h('div', { class: 'time-options', 'aria-label': 'Trainingsdauer' }, timeOptions(day).map(min => h('button', {
      class: 'time-option' + (plan.budgetMinutes === min ? ' selected' : ''), 'aria-pressed': String(plan.budgetMinutes === min), onclick: async () => {
        settings = { ...settings, [day.isFullBody ? 'strengthMinutes' : 'otherMinutes']: min }; active.planSnapshot = buildSessionPlan(day, min, settings);
        await saveSettings(settings); await render();
      },
    }, `${min} Min`))));
    box.appendChild(h('p', { class: 'small' }, `Ungefähr ${sessionMinutes(exercises(), day.isFullBody)} Minuten · ${exercises().length} Übungen · inklusive Aufwärmen und Satzpausen`));
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
      exercises().push(ex);
      if (day.isFullBody) exercises().sort((a, b) => (a.type === TYPES.POWER ? 0 : a.type === TYPES.SKILL ? 1 : 2) - (b.type === TYPES.POWER ? 0 : b.type === TYPES.SKILL ? 1 : 2));
      plan.optional = plan.optional.filter(e => e.id !== ex.id); await persist(); await render();
    } }, `${ex.name} · hinzufügen`)]))]));
    box.appendChild(h('button', { class: 'btn btn-primary btn-block', onclick: () => show(Math.max(0, exercises().findIndex(ex => !completed(ex)))) }, started ? 'Training fortsetzen' : 'Training beginnen'));
    if (started) box.appendChild(h('button', { class: 'btn btn-ghost', onclick: finish }, 'Beenden / verkürzt speichern'));
    const date = h('input', { type: 'date', value: active.startedAt.slice(0, 10), onchange: async e => {
      if (e.target.value) { active.startedAt = e.target.value + 'T12:00:00.000Z'; active.finishedAt = active.startedAt; await persist(); }
    } });
    box.appendChild(detail('Datum und Verwaltung', [h('label', { class: 'field' }, [h('span', {}, 'Datum bei nachträglichem Eintragen'), date]), h('button', { class: 'link-small link-button', onclick: async () => {
      if (!window.confirm('Diese laufende Einheit verwerfen? Abgeschlossene Trainings bleiben erhalten.')) return;
      finishing = true; timer.skip(); await clearActiveSession(); navigate('#/');
    } }, 'Laufende Einheit verwerfen')]));
    return box;
  }
  async function exerciseScreen() {
    const ex = exercises()[stepIndex];
    const entry = active.entries[ex.id] ||= { sets: [], exercise: clone(ex), plannedSets: plannedSets(ex), drafts: {} };
    entry.drafts ||= {}; entry.plannedSets ||= plannedSets(ex);
    const note = await getExerciseNote(ex.id); entry.setup ??= note.setup || '';
    work(entry).forEach((s, i) => { s.slotIndex ??= i; });
    const last = await getLastPerformance(ex.id, entry.setup);
    const suggestion = progressionFor(ex, last, note.increment);
    const box = h('div', { class: 'view' }, [h('div', { class: 'workout-header-row' }, [
      h('button', { class: 'btn-icon back-chevron', onclick: async () => { mode = 'overview'; await render(); } }, '‹ Übersicht'),
      h('span', { class: 'muted small' }, `${stepIndex + 1} / ${exercises().length}`), h('button', { class: 'btn btn-ghost btn-small', onclick: pause }, 'Pausieren'),
    ]), h('div', { class: 'exercise-heading exercise-heading-media' }, [renderExerciseThumbnail(ex), h('div', {}, [h('h2', {}, entry.substituteName || ex.name), h('p', { class: 'muted small' }, `${prescription(ex)}${ex.restSec ? ' · Pause ' + fmtRestRange(ex.restSec) : ''}`)])])]);
    if (last) box.appendChild(h('div', { class: 'last-perf' }, [h('span', { class: 'card-label' }, 'Zuletzt'), h('p', { class: 'small' }, last.sets.filter(s => !s.isWarmup).map(s => formatLoggedSet(ex, s)).join(' | '))]));
    box.appendChild(detail('Vorschlag für heute', [h('p', { class: 'small' }, suggestion.text), ...(suggestion.suggestedWeight != null ? [h('button', { class: 'btn btn-small', onclick: async () => {
      for (let i = 0; i < plannedSets(ex); i++) if (!work(entry).some(s => s.slotIndex === i)) entry.drafts[i] = { ...entry.drafts[i], weightKg: suggestion.suggestedWeight };
      await persist(); await render();
    } }, `${suggestion.suggestedWeight} kg übernehmen`)] : [])]));
    const timerHost = h('div', {}); box.appendChild(timerHost);
    const updateTimer = () => {
      timerHost.replaceChildren(); if (timer.total <= 0) return;
      timerHost.appendChild(h('div', { class: 'compact-timer' }, [h('div', {}, [h('span', { class: 'card-label' }, timer.ownerId === ex.id ? 'Satzpause' : 'Pause · vorherige Übung'), h('div', { class: 'timer-digits', role: 'timer' }, fmtMinSec(timer.remaining))]),
        h('div', { class: 'timer-actions' }, [h('button', { class: 'btn btn-small', onclick: () => timer.extend(30) }, '+30 s'), h('button', { class: 'btn btn-small', onclick: () => timer.togglePause() }, timer.running ? 'Anhalten' : 'Weiter'), h('button', { class: 'link-small link-button', onclick: () => timer.skip() }, 'Beenden')]) ]));
    };
    timer.onTick = updateTimer; updateTimer();
    const onSave = async logged => { await persist(); if (logged === true && ex.restSec) timer.start(ex.restSec.min, ex.id); else if (logged === false && timer.ownerId === ex.id) timer.skip(); await render(); };
    box.appendChild(ex.sets ? setTable(ex, entry, last, onSave, saveDraft) : singleForm(ex, entry, last, onSave, saveDraft));
    if (completed(ex) && ex.type === TYPES.STRENGTH) {
      const next = progressionFor(ex, { sets: entry.sets, plannedSets: entry.plannedSets, status: 'completed', rirReliable: true, feedback: entry.feedback, quality: entry.quality }, note.increment);
      const title = next.status === 'increase' ? (next.suggestedWeight != null ? `Nächstes Mal: ${next.suggestedWeight} kg versuchen` : 'Nächstes Mal: Gewicht erhöhen') : next.status === 'difficulty' ? 'Ziel erreicht · Schwierigkeit prüfen' : 'Nächstes Mal: Gewicht bestätigen';
      box.appendChild(h('div', { class: 'next-training-note', role: 'status' }, [h('strong', {}, title), h('p', { class: 'muted small' }, next.text)]));
    }
    if (completed(ex) && (ex.type === TYPES.POWER || ex.type === TYPES.SKILL)) {
      box.appendChild(detail('Bewegungsqualität · optional', [h('p', { class: 'muted small' }, 'Wiederholungen allein zeigen bei Schnellkraft und Fertigkeiten nicht die Qualität.'), h('div', { class: 'feedback-options' }, [['clean', 'Sauber'], ['loss', 'Qualität ließ nach']].map(([value, label]) => h('button', { class: 'feedback-chip' + (entry.quality === value ? ' selected' : ''), 'aria-pressed': String(entry.quality === value), onclick: async () => { entry.quality = entry.quality === value ? null : value; await persist(); await render(); } }, label)))]));
    }
    box.appendChild(h('div', { class: 'workout-nav' }, [h('button', { class: 'btn', disabled: stepIndex === 0 ? '' : null, onclick: () => show(stepIndex - 1) }, '← Zurück'), h('button', { class: 'btn btn-primary', onclick: () => stepIndex < exercises().length - 1 ? show(stepIndex + 1) : finish() }, stepIndex < exercises().length - 1 ? 'Nächste Übung' : 'Einheit abschließen')]));
    const setup = h('input', { type: 'text', value: entry.setup, placeholder: ex.tracking === 'neck' ? 'Handposition und Gegenhalten' : 'Ringhöhe, Sitzposition, Unterstützung', disabled: entry.sets.length ? '' : null });
    const increment = h('input', { type: 'number', min: '0.25', step: '0.25', value: note.increment ?? '', placeholder: 'z. B. 1 oder 2,5', inputmode: 'decimal' });
    const text = h('input', { type: 'text', value: note.note || '', placeholder: 'Deine Notiz' });
    const saveNote = () => setExerciseNote(ex.id, { ...note, setup: setup.value.trim(), increment: positive(num(increment)) ? num(increment) : null, note: text.value });
    setup.addEventListener('change', async () => { entry.setup = setup.value.trim(); entry.drafts = {}; await saveNote(); await persist(); await render(); });
    increment.addEventListener('change', saveNote); text.addEventListener('change', saveNote);
    box.appendChild(detail(ex.tracking === 'neck' ? 'Widerstand / Handposition' : 'Aufbau, Gewichtsschritt und Notizen', [h('label', { class: 'field' }, [h('span', {}, 'Vergleichbarer Aufbau'), setup]), h('p', { class: 'muted small' }, 'Ein geänderter Aufbau beginnt eine eigene Vergleichsreihe. Nach gespeicherten Sätzen bleibt er für diese Einheit fest.'), ...(ex.type === TYPES.STRENGTH ? [h('label', { class: 'field' }, [h('span', {}, 'Verfügbarer Gewichtsschritt (kg)'), increment])] : []), h('label', { class: 'field' }, [h('span', {}, 'Notiz'), text]), ...(note.nextTimeIntent ? [h('p', { class: 'small' }, 'Frühere Vormerkung: ' + note.nextTimeIntent)] : [])]));
    const alternatives = alternativesFor(ex.slotId || ex.id);
    if (alternatives.length && active.planVersion === PLAN_VERSION) {
      const choices = [...(ex.slotId !== 'do-pistol' ? [{ key: '', name: resolveExercise(ex.slotId || ex.id).name }] : []), ...alternatives];
      box.appendChild(detail('Passende Ersatzübung', [h('p', { class: 'muted small' }, `Trainingsaufgabe: ${GROUP_LABELS[ex.group]}. Varianten haben eigene Lastverläufe; ihre Wirkung ist nicht völlig identisch.`), ...(entry.sets.length ? [h('p', { class: 'small' }, 'Für einen Wechsel zuerst die Sätze dieser Übung wieder öffnen.')] : choices.map(choice => h('button', { class: 'optional-row', onclick: async () => {
        const replacement = resolveExercise(ex.slotId || ex.id, choice.key); replacement.sets = ex.sets; replacement.core = ex.core; replacement.dosage = prescription(replacement);
        delete active.entries[ex.id]; exercises()[stepIndex] = replacement;
        active.planSnapshot.estimatedMinutes = sessionMinutes(exercises(), day.isFullBody);
        settings.variants = { ...settings.variants, [ex.slotId || ex.id]: choice.key }; await saveSettings(settings); await persist(); await render();
      } }, choice.name)))]));
    }
    if (ex.warmup) box.appendChild(detail('Aufwärmsätze', [renderWarmupBox(ex, suggestion, entry, saveDraft, () => {})]));
    box.appendChild(detail('Technik und Zweck', [h('p', { class: 'small' }, ex.note || `Trainingsaufgabe: ${GROUP_LABELS[ex.group] || 'kontrollierte Bewegung'}. Aufbau und Bewegungsumfang vergleichbar halten.`), ...(ex.alternativeNote ? [h('p', { class: 'small' }, ex.alternativeNote)] : []), ...(ex.video ? [renderVideoCard(ex.video)] : []), h('p', { class: 'muted small' }, 'Die Forschung stützt Trainingsprinzipien; die konkrete Zusammenstellung ist eine praktische Ableitung.'), h('a', { href: SCIENCE_LINKS[ex.tracking === 'neck' ? 4 : 0].url, target: '_blank', rel: 'noopener noreferrer', class: 'link-small' }, 'Wissenschaftlicher Hintergrund ↗')]));
    return box;
  }
  async function render() { const token = ++renderToken; timer.onTick = () => {}; const view = mode === 'overview' ? overview() : await exerciseScreen(); if (token === renderToken) { closeExerciseMedia(); content.replaceChildren(view); } }
  await render(); return wrap;
}

function setTable(ex, entry, last, onSave, saveDraft) {
  const wrap = h('div', { class: 'set-table' });
  const hasWeight = ex.type === TYPES.STRENGTH || ex.type === TYPES.MOBILITY_LOADED || (ex.type === TYPES.POWER && ex.id.includes('rotpower'));
  const hasReps = !!ex.reps, hasHold = !!ex.holdSec;
  const style = `grid-template-columns: 36px repeat(${Number(hasWeight) + Number(hasReps) + Number(hasHold)}, minmax(0, 1fr)) 44px`;
  wrap.appendChild(h('div', { class: 'set-table-header', style }, [h('span', {}, 'Satz'), ...(hasWeight ? [h('span', {}, 'kg')] : []), ...(hasReps ? [h('span', {}, ex.perSide ? 'Wdh./Seite' : 'Wdh.')] : []), ...(hasHold ? [h('span', {}, 'Sek.')] : []), h('span', {}, '')]));
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
    if (hasWeight) add('weightKg', 'Gewicht', '0.25', '–');
    if (hasReps) add('reps', 'Wiederholungen', '1', `${ex.reps.min}–${ex.reps.max}`);
    if (hasHold) add('holdSec', 'Haltezeit', '1', `${ex.holdSec.min}–${ex.holdSec.max}`);
    const error = h('p', { class: 'small save-error', role: 'alert', hidden: '' });
    row.appendChild(h('button', { class: 'set-check-btn' + (logged ? ' set-check-btn-done' : ''), 'aria-label': `Satz ${i + 1} ${logged ? 'wieder öffnen' : 'speichern'}`, onclick: async () => {
      if (!logged && work(entry).some(s => s.slotIndex === i)) return;
      if (logged) { entry.drafts[i] = { ...logged }; entry.sets = entry.sets.filter(s => s !== logged); await onSave(false); return; }
      const next = Object.fromEntries(Object.entries(fields).map(([key, el]) => [key, num(el)]));
      if ((hasReps && (!positive(next.reps) || !Number.isInteger(next.reps))) || (hasHold && !positive(next.holdSec)) || (hasWeight && next.weightKg != null && (!Number.isFinite(next.weightKg) || next.weightKg < 0))) { error.textContent = 'Bitte tatsächliche Wiederholungen bzw. Haltezeit und ein gültiges Gewicht eintragen.'; error.hidden = false; return; }
      entry.sets.push({ ...next, rir: ex.type === TYPES.STRENGTH ? draft.rir || null : null, rirSource: draft.rir ? 'explicit' : null, technikverlust: !!draft.technikverlust, effort: draft.effort || null, resistance: draft.resistance || defaults.resistance || null, direction: ex.directions?.[Math.floor(i / ex.sets)] || null, slotIndex: i, isWarmup: false, loggedAt: new Date().toISOString() });
      delete entry.drafts[i]; await onSave(true);
    } }, logged ? '✓' : '○'));
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
