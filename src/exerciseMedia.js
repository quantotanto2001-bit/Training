import { h, typeIcon, openVideoModal } from './ui.js';
import { iconFor } from './plan.js';
import { motionFor, renderMotion } from './motion.js';

// Exact variant matches only. In particular, a squat poster cannot demonstrate
// a step-up, and dumbbells cannot stand in for an unspecified guided machine.
const POSTER_VARIANTS = {
  'mo-dip~bench-db': 'do-bench', 'do-bench~db': 'do-bench',
  'sa-ringpushup~bench-db': 'do-bench', 'do-bench~ring-pushup': 'sa-ringpushup',
  'do-pistol~bulgarian': 'mo-splitsquat', 'do-ringrow~cable-row': 'sa-cablerow',
  'sa-cablerow~ring-row': 'do-ringrow', 'sa-revlunge~reverse': 'sa-revlunge',
};
export function posterIdFor(exercise) {
  if (exercise.id.includes('~')) return POSTER_VARIANTS[exercise.id] || null;
  return exercise.iconId || exercise.id;
}

let closeCurrent = null;
export function closeExerciseMedia() { closeCurrent?.(); }

export function renderExerciseThumbnail(exercise) {
  const motion = motionFor(exercise);
  const action = motion ? 'Animation öffnen' : 'Übung ansehen';
  const button = h('button', {
    type: 'button', class: 'exercise-thumbnail', 'data-exercise-id': exercise.id,
    'aria-label': `${action}: ${exercise.name}`, 'aria-haspopup': 'dialog',
    title: motion ? 'Antippen und Bewegung ansehen' : 'Antippen für Bild und Technik',
    onclick: event => { event.preventDefault(); event.stopPropagation(); openExerciseMedia(exercise); },
  }, [
    motion ? h('img', { src: `assets/motion/${motion.directory}/1.png`, alt: '', loading: 'lazy', width: '56', height: '64' })
      : typeIcon(iconFor(exercise), posterIdFor(exercise)),
    h('span', { class: 'exercise-thumbnail-action', 'aria-hidden': 'true' }, motion ? '▶' : '⤢'),
  ]);
  return button;
}

export function openExerciseMedia(exercise) {
  closeExerciseMedia();
  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  const dialog = h('dialog', { class: 'exercise-media-dialog', 'aria-labelledby': 'exercise-media-title' });
  const closeButton = h('button', { type: 'button', class: 'media-close', 'aria-label': 'Übungsansicht schließen', onclick: () => close() }, '×');
  const content = h('div', { class: 'exercise-media-content' });
  const motion = renderMotion(exercise, { expanded: true, autoplay: true });
  const close = () => {
    motion?.dispose?.();
    dialog.close(); dialog.remove();
    document.body.style.overflow = previousOverflow;
    window.removeEventListener('hashchange', close);
    if (closeCurrent === close) closeCurrent = null;
    if (previousFocus?.isConnected) previousFocus.focus();
  };
  closeCurrent = close;
  dialog.append(h('div', { class: 'exercise-media-header' }, [
    h('h2', { id: 'exercise-media-title' }, exercise.name), closeButton,
  ]), content);
  if (motion) content.appendChild(motion);
  else {
    const posterId = posterIdFor(exercise);
    if (posterId) content.appendChild(h('div', { class: 'exercise-poster' }, typeIcon(iconFor(exercise), posterId)));
    content.appendChild(h('p', { class: 'muted small media-availability' }, 'Für diese Variante ist noch keine Animation hinterlegt.'));
    if (exercise.note) content.appendChild(h('p', { class: 'small' }, exercise.note));
    if (exercise.video?.cues) content.appendChild(h('p', { class: 'small' }, exercise.video.cues));
    if (exercise.alternativeNote) content.appendChild(h('p', { class: 'small' }, exercise.alternativeNote));
  }
  if (exercise.video) content.appendChild(h('button', { type: 'button', class: 'btn btn-block', onclick: () => { close(); openVideoModal(exercise.video); } }, exercise.video.kind === 'article' ? 'Technikreferenz öffnen' : 'Technikvideo öffnen'));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  window.addEventListener('hashchange', close);
  document.body.appendChild(dialog);
  document.body.style.overflow = 'hidden';
  dialog.showModal();
  closeButton.focus();
}
