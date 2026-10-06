import { h } from './ui.js';
import { GENERATED_MOTIONS } from './motionCatalog.js';

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

export const motionFor = exercise => GENERATED_MOTIONS[exercise.id] || LOOPS[exercise.id] || null;

export function renderMotion(exercise, { expanded = false, autoplay = false } = {}) {
  const motion = motionFor(exercise);
  if (!motion) return null;
  const root = h(expanded ? 'div' : 'details', { class: expanded ? 'motion-card' : 'quiet-details motion-card' });
  if (!expanded) root.appendChild(h('summary', {}, 'Schnellansicht · Bewegung'));
  const paths = motion.labels.map((_, n) => `assets/motion/${motion.directory}/${n + 1}.png`);
  const img = h('img', { class: 'motion-image', src: paths[0], alt: motion.description, loading: 'lazy', width: '372', height: '408' });
  // Decode upcoming phases before their first transition, including in Safari.
  const preload = paths.slice(1).map(src => { const frame = new Image(); frame.src = src; return frame; });
  const caption = h('p', { class: 'motion-caption', 'aria-live': 'off' }, motion.labels[0]);
  const sequence = motion.sequence || [0, 1, 2, 1];
  let index = 0, timeout = null, playing = false;
  const update = () => { img.src = paths[sequence[index]]; caption.textContent = motion.labels[sequence[index]]; };
  const stop = () => { playing = false; clearTimeout(timeout); timeout = null; play.textContent = 'Abspielen'; play.setAttribute('aria-pressed', 'false'); };
  const schedule = () => { timeout = setTimeout(() => { if (!playing) return; index = (index + 1) % sequence.length; update(); schedule(); }, motion.durations?.[index] || 850); };
  const start = () => {
    playing = true;
    play.textContent = 'Pausieren'; play.setAttribute('aria-pressed', 'true');
    schedule();
  };
  const play = h('button', { class: 'btn btn-small', 'aria-pressed': 'false', onclick: () => {
    if (playing) stop(); else start();
  } }, 'Abspielen');
  root.addEventListener('toggle', () => { if (!root.open) stop(); });
  root.append(img, caption, h('div', { class: 'motion-controls' }, [play, h('button', { class: 'btn btn-small', onclick: () => { stop(); index = (index + 1) % sequence.length; update(); } }, 'Nächste Phase')]),
    h('ul', { class: 'motion-cues' }, motion.cues.map(c => h('li', {}, c))),
    h('p', { class: 'muted small' }, 'Schematische Bewegungsphasen als Technikerinnerung. Die Bildfolge zeigt kein verbindliches Trainingstempo. Bei Halteübungen die Position ruhig halten. Bewegungstiefe an deine Kontrolle anpassen; für die durchgehende Ausführung das Technikvideo nutzen.'),
    h('a', { class: 'link-small', href: `assets/motion/${motion.directory}/${motion.file}`, download: `${motion.directory}.gif` }, 'GIF herunterladen'));
  const onVisibility = () => { if (document.visibilityState === 'hidden') stop(); };
  document.addEventListener('visibilitychange', onVisibility);
  root.dispose = () => { stop(); preload.length = 0; document.removeEventListener('visibilitychange', onVisibility); };
  if (autoplay && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) start();
  return root;
}
