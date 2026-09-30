import { h } from '../ui.js';
import { getSettings, saveSettings } from '../db.js';
import { PLAN_VERSION, SCIENCE_LINKS } from '../training.js';
import { renderBackupSection } from './history.js';

export async function renderSettings() {
  const settings = await getSettings();
  const saved = h('p', { class: 'muted small', role: 'status' }, 'Änderungen gelten für die nächste neu gestartete Einheit.');
  const choice = (key, label, options) => h('label', { class: 'field' }, [h('span', {}, label), h('select', { onchange: async e => {
    await saveSettings({ [key]: key === 'focus' ? e.target.value : Number(e.target.value) }); saved.textContent = 'Gespeichert. Gilt für die nächste neu gestartete Einheit.';
  } }, options.map(([value, text]) => h('option', { value, selected: String(settings[key]) === String(value) ? '' : null }, text)))]);
  return h('div', { class: 'view' }, [h('div', { class: 'header' }, [h('h1', {}, 'Einstellungen')]),
    h('div', { class: 'card' }, [h('h2', {}, 'Dein Training'),
      choice('strengthMinutes', 'Zeit für Krafteinheiten', [45, 60, 90].map(n => [n, n + ' Minuten'])),
      choice('otherMinutes', 'Zeit für Ausdauer / Mobilität', [20, 30, 45, 60].map(n => [n, n + ' Minuten'])),
      choice('focus', 'Ergänzender Schwerpunkt', [['allround', 'Allround-Beweglichkeit'], ['splits', 'Spagat vorne und seitlich'], ['skills', 'Handstand / Calisthenics']]), saved,
      h('p', { class: 'muted small' }, 'Muskelaufbau und Kraft bleiben der Schwerpunkt. Die vorhandenen Geräte und der flexible Sechserzyklus bleiben die Grundlage.'),
      h('a', { href: '#/plan', class: 'link-small' }, 'Trainingsplan ansehen →'),
    ]),
    h('div', { class: 'card' }, [h('h2', {}, 'Sicherung und Wiederherstellung'), renderBackupSection()]),
    h('details', { class: 'quiet-details' }, [h('summary', {}, 'Grundlage und Quellen'),
      h('p', { class: 'small' }, 'Die Planung verwendet untersuchte Trainingsprinzipien. Übungsauswahl, Zeitverteilung und Alternativen sind praktische Ableitungen. Kein wissenschaftlich bewiesenes individuelles Optimum und keine Garantie gegen muskuläre Ungleichgewichte.'),
      ...SCIENCE_LINKS.map(source => h('a', { class: 'source-link', href: source.url, target: '_blank', rel: 'noopener noreferrer' }, source.label + ' ↗')),
    ]), h('p', { class: 'muted small' }, `Universal Athlete · Plan ${PLAN_VERSION} · Daten lokal auf diesem Gerät`),
  ]);
}
