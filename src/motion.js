import { h } from './ui.js';

// Schematic reminders: share assets only across the same exercise variant.
const LOOPS = {
  'mo-rdl~db': { directory: 'rdl-v2', file: 'loop.gif', durations: [900, 1000, 1200, 1000], labels: ['Aufrichten', 'Hüfte zurück', 'Kontrollierte Tiefe'],
    cues: ['Knie leicht gebeugt lassen; Hüfte nach hinten führen.', 'Hanteln körpernah; Kopf dem Rumpfwinkel folgen lassen, Blick beim Absenken schräg zum Boden.', 'Nur so tief gehen, wie du die Position kontrollieren kannst. Oben aufrecht stehen, nicht ins Hohlkreuz lehnen.'],
    description: 'Kurzhantel-RDL: drei schematische Bewegungsphasen. Rot markiert den Schwerpunkt Gesäß und Beinrückseite.' },
  'mo-gobletsquat': { directory: 'goblet-squat', file: 'loop.gif', labels: ['Aufrecht stehen', 'Hüfte und Knie beugen', 'Kontrollierte Tiefe'],
    cues: ['Eine Kurzhantel dicht vor der Brust halten.', 'Den ganzen Fuß belasten; Knie in Richtung der Zehen führen.', 'So tief gehen, wie du Rumpf und Fußkontakt kontrollieren kannst.'],
    description: 'Goblet Squat mit einer Kurzhantel: drei schematische Bewegungsphasen.' },
  'mo-calf': { directory: 'calf-raise', file: 'loop-paused.gif', durations: [1600, 800, 1000, 800], labels: ['Untere Position · kurz halten', 'Mittlere Position', 'Auf die Fußballen heben'],
    cues: ['Vorfüße stabil auf der Kante halten und leicht abstützen.', 'Knie weitgehend gestreckt lassen; die Bewegung kommt aus den Sprunggelenken.', 'Fersen kontrolliert in die verträgliche Tiefe senken, unten kurz halten und ohne Federn ganz anheben. Die Abbildung zeigt das Bewegungsprinzip ohne Zusatzgewicht.'],
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
  let index = 0, timeout = null, playing = false;
  const update = () => { img.src = paths[sequence[index]]; caption.textContent = motion.labels[sequence[index]]; };
  const stop = () => { playing = false; clearTimeout(timeout); timeout = null; play.textContent = 'Abspielen'; play.setAttribute('aria-pressed', 'false'); };
  const schedule = () => { timeout = setTimeout(() => { if (!playing) return; index = (index + 1) % sequence.length; update(); schedule(); }, motion.durations?.[index] || 850); };
  const play = h('button', { class: 'btn btn-small', 'aria-pressed': 'false', onclick: () => {
    if (playing) { stop(); return; }
    playing = true;
    play.textContent = 'Pausieren'; play.setAttribute('aria-pressed', 'true');
    schedule();
  } }, 'Abspielen');
  root.addEventListener('toggle', () => { if (!root.open) stop(); });
  root.append(img, caption, h('div', { class: 'motion-controls' }, [play, h('button', { class: 'btn btn-small', onclick: () => { stop(); index = (index + 1) % sequence.length; update(); } }, 'Nächste Phase')]),
    h('ul', { class: 'motion-cues' }, motion.cues.map(c => h('li', {}, c))),
    h('p', { class: 'muted small' }, 'Drei schematische Positionen als Technikerinnerung. Die Bildwechsel bilden keinen vollständigen Bewegungsablauf und kein verbindliches Trainingstempo ab. Bewegungstiefe an deine Kontrolle anpassen; für die durchgehende Ausführung das Video nutzen.'),
    h('a', { class: 'link-small', href: `assets/motion/${motion.directory}/${motion.file}`, download: `${motion.directory}.gif` }, 'GIF herunterladen'));
  root.dispose = stop;
  return root;
}
