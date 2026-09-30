import { h, fmtMinSec, matchBadge, openVideoModal } from '../ui.js';
import { WARMUP_KINDS, computeRampSets } from '../plan.js';
import { formatLoggedSet } from '../setForms.js';
export function renderWarmupBox(exercise, progression, entry, markStartedAndPersist, onLocalChange) {
  const def = WARMUP_KINDS[exercise.warmup];
  const box = h('div', { class: 'warmup-box' });
  box.appendChild(h('div', { class: 'card-label' }, def.label));
  box.appendChild(h('p', { class: 'small' }, def.desc));

  let renderRamp = () => {};
  if (def.ramp) {
    const suggestedWork = progression && (progression.suggestedWeight || progression.lastWeight);
    const weightInput = h('input', {
      type: 'number', step: '0.5', inputmode: 'decimal', placeholder: 'z.B. 42.5',
      value: suggestedWork != null ? String(suggestedWork) : '',
    });
    const listEl = h('div', { class: 'ramp-list' });
    box.appendChild(h('label', { class: 'field' }, [h('span', {}, 'Arbeitsgewicht heute (kg)'), weightInput]));
    box.appendChild(h('p', { class: 'muted small' }, 'Der Reihe nach abhaken, nicht zur Auswahl - jeder Ramp-Satz baut auf dem vorherigen auf. Haken loggt den Satz direkt.'));
    box.appendChild(listEl);
    renderRamp = function renderRamp() {
      listEl.innerHTML = '';
      const w = Number(weightInput.value) || null;
      computeRampSets(exercise.warmup, w).forEach((r, i) => {
        if (entry.sets.some((s) => s.isWarmup && s.rampIndex === i)) return;
        const label = r.weightKg != null
          ? `Ramp-Satz ${i + 1}: ${r.weightKg} kg x ${r.reps} (${r.pctLabel})${r.optional ? ' — optional' : ''}`
          : `Ramp-Satz ${i + 1}: ${r.pctLabel} Arbeitslast x ${r.reps}${r.optional ? ' — optional' : ''}`;
        const checkbox = h('input', {
          type: 'checkbox',
          onchange: (e) => {
            if (!e.target.checked) return;
            const repMax = parseInt(String(r.reps).split('-').pop(), 10);
            entry.sets.push({
              weightKg: r.weightKg != null ? r.weightKg : null,
              reps: !isNaN(repMax) ? repMax : null,
              isWarmup: true, rampIndex: i, loggedAt: new Date().toISOString(),
            });
            markStartedAndPersist();
            renderLoggedWarmup();
            renderRamp();
          },
        });
        listEl.appendChild(h('label', { class: 'field field-checkbox' }, [checkbox, h('span', {}, label)]));
      });
    };
    weightInput.addEventListener('input', renderRamp);
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
          onclick: () => {
            entry.sets = entry.sets.filter((x) => x !== s);
            markStartedAndPersist();
            renderLoggedWarmup();
            if (def.ramp) renderRamp();
          },
        }, '✕'),
      ]));
    });
  }
  renderLoggedWarmup();
  box.appendChild(loggedWarmupWrap);
  if (def.ramp) renderRamp();

  // Manuelle Zusatz-Eingabe nur, wenn es keine feste Ramp-Sequenz gibt (light/power) -
  // bei heavy/moderate deckt die Ramp-Checkliste die noetigen Aufwaermsaetze komplett ab.
  if (!def.ramp) {
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
  }

  return box;
}

export function renderVideoCard(video) {
  const box = h('div', { class: 'video-card' });
  box.appendChild(h('div', { class: 'video-card-head' }, [h('span', { class: 'card-label' }, 'Technik'), matchBadge(video.match)]));
  box.appendChild(h('button', { class: 'btn btn-small video-link-btn', onclick: () => openVideoModal(video) }, video.kind === 'article' ? 'Referenz ansehen' : 'Video ansehen'));
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
