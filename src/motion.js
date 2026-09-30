import { h } from './ui.js';

// Only exact reviewed exercise variants receive a loop. Do not reuse an RDL
// demonstration for a squat, straight-leg hinge or machine variant.
const LOOPS = {
  'mo-rdl~db': { directory: 'rdl', labels: ['Aufrichten', 'Hüfte zurück', 'Kontrollierte Tiefe'],
    cues: ['Knie leicht gebeugt lassen; Hüfte nach hinten führen.', 'Hanteln körpernah, Rücken und Kopf in einer neutralen Linie.', 'Nur so tief gehen, wie du die Position kontrollieren kannst.'],
    description: 'Kurzhantel-RDL: drei schematische Bewegungsphasen. Rot markiert den Schwerpunkt Gesäß und Beinrückseite.' },
};

export function renderMotion(exercise) {
  const motion = LOOPS[exercise.id];
  if (!motion) return null;
  const root = h('details', { class: 'quiet-details motion-card' });
  root.appendChild(h('summary', {}, 'Schnellansicht · Bewegung'));
  const paths = [1, 2, 3].map(n => `assets/motion/${motion.directory}/${n}.png`);
  const img = h('img', { class: 'motion-image', src: paths[0], alt: motion.description, loading: 'lazy', width: '372', height: '408' });
  const caption = h('p', { class: 'motion-caption', 'aria-live': 'off' }, motion.labels[0]);
  const sequence = [0, 1, 2, 1];
  let index = 0, interval = null;
  const update = () => { img.src = paths[sequence[index]]; caption.textContent = motion.labels[sequence[index]]; };
  const stop = () => { clearInterval(interval); interval = null; play.textContent = 'Abspielen'; play.setAttribute('aria-pressed', 'false'); };
  const play = h('button', { class: 'btn btn-small', 'aria-pressed': 'false', onclick: () => {
    if (interval) { stop(); return; }
    play.textContent = 'Pausieren'; play.setAttribute('aria-pressed', 'true');
    interval = setInterval(() => { index = (index + 1) % sequence.length; update(); }, 850);
  } }, 'Abspielen');
  root.addEventListener('toggle', () => { if (!root.open) stop(); });
  root.append(img, caption, h('div', { class: 'motion-controls' }, [play, h('button', { class: 'btn btn-small', onclick: () => { stop(); index = (index + 1) % sequence.length; update(); } }, 'Nächste Phase')]),
    h('ul', { class: 'motion-cues' }, motion.cues.map(c => h('li', {}, c))),
    h('p', { class: 'muted small' }, 'Schematische Bildfolge als Erinnerung. Tempo, persönliche Bewegungstiefe und Technik anhand der Hinweise und des Videos einordnen.'),
    h('a', { class: 'link-small', href: `assets/motion/${motion.directory}/rdl.gif`, download: 'RDL.gif' }, 'GIF herunterladen'));
  root.dispose = stop;
  return root;
}
