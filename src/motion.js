import { h } from './ui.js';

// Schematic reminders: share assets only across the same exercise variant.
const BENCH = { directory: 'bench-db', file: 'loop.gif', labels: ['Hanteln über der Brust', 'Kontrolliert absenken', 'Untere Position'],
  cues: ['Kopf und Rücken auf der Bank, Füße fest am Boden.', 'Handgelenke über den Ellenbogen halten; Oberarme schräg zum Rumpf führen.', 'Kontrolliert absenken; nur den schmerzfrei beherrschten Bewegungsumfang nutzen.'],
  description: 'Kurzhantel-Bankdrücken auf der flachen Bank: drei schematische Bewegungsphasen.' };
const LOOPS = {
  'mo-rdl~db': { directory: 'rdl', file: 'rdl.gif', labels: ['Aufrichten', 'Hüfte zurück', 'Kontrollierte Tiefe'],
    cues: ['Knie leicht gebeugt lassen; Hüfte nach hinten führen.', 'Hanteln körpernah, Rücken und Kopf in einer neutralen Linie.', 'Nur so tief gehen, wie du die Position kontrollieren kannst.'],
    description: 'Kurzhantel-RDL: drei schematische Bewegungsphasen. Rot markiert den Schwerpunkt Gesäß und Beinrückseite.' },
  'mo-gobletsquat': { directory: 'goblet-squat', file: 'loop.gif', labels: ['Aufrecht stehen', 'Hüfte und Knie beugen', 'Kontrollierte Tiefe'],
    cues: ['Eine Kurzhantel dicht vor der Brust halten.', 'Den ganzen Fuß belasten; Knie in Richtung der Zehen führen.', 'So tief gehen, wie du Rumpf und Fußkontakt kontrollieren kannst.'],
    description: 'Goblet Squat mit einer Kurzhantel: drei schematische Bewegungsphasen.' },
  'do-bench~db': BENCH,
  'mo-dip~bench-db': BENCH,
  'sa-ringpushup~bench-db': BENCH,
  'mo-calf': { directory: 'calf-raise', file: 'loop.gif', labels: ['Fersen kontrolliert senken', 'Mittlere Position', 'Auf die Fußballen heben'],
    cues: ['Vorfüße stabil auf der Kante halten und leicht abstützen.', 'Knie weitgehend gestreckt lassen; die Bewegung kommt aus den Sprunggelenken.', 'Ohne Federn heben und senken. Die Abbildung zeigt das Bewegungsprinzip ohne Zusatzgewicht.'],
    description: 'Beidbeiniges Wadenheben mit gestreckten Knien auf einer Stufe: drei schematische Bewegungsphasen ohne Zusatzgewicht.' },
};

export const motionFor = exercise => LOOPS[exercise.id] || null;

export function renderMotion(exercise) {
  const motion = motionFor(exercise);
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
    h('a', { class: 'link-small', href: `assets/motion/${motion.directory}/${motion.file}`, download: `${motion.directory}.gif` }, 'GIF herunterladen'));
  root.dispose = stop;
  return root;
}
