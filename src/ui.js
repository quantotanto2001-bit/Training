// Kleine DOM-Hilfsfunktionen, keine Frameworks nötig.

export function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

// Einfache, selbst gezeichnete Monoline-Icons (statt Emoji) - pro Bewegungsart
// (nicht nur pro grobem Uebungstyp), damit unterschiedliche Uebungen sich auch
// optisch unterscheiden statt alle dasselbe Symbol zu teilen.
const ICON_PATHS = {
  push: '<path d="M7 12h10M4.5 9v6M2.5 10.2v3.6M19.5 9v6M21.5 10.2v3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  dip: '<path d="M6 6v13M18 6v13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.7" stroke="currentColor" stroke-width="1.6"/><path d="M12 9.2v4M9 10 12 9.2 15 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 13.2v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  pull: '<path d="M5 5h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="9" r="1.7" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 5.8 12 9M15.5 5.8 12 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M12 10.7v9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  squat: '<circle cx="12" cy="4.5" r="1.7" stroke="currentColor" stroke-width="1.6"/><path d="M12 6.2v3.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M6 9.5h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 20l2-6.5 2 2 2-2 2 6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  hinge: '<circle cx="6" cy="17.5" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="6.5" r="2" stroke="currentColor" stroke-width="1.6"/><path d="M7.4 16.1 16.6 7.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  jump: '<path d="M12 20V9M7.5 13 12 8.5 16.5 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M6 20h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  calf: '<path d="M12 16V9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M9 12l3-3 3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><ellipse cx="12" cy="18.5" rx="5" ry="1.6" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  core: '<path d="M5 5h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="9" r="1.7" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 5.8 12 9M15.5 5.8 12 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M12 10.7v3.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 14 17 16.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  rotate: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5M19.5 12a7.5 7.5 0 0 1-13 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M14.5 4.3 17.7 6l-1 3.2M9.5 19.7 6.3 18l1-3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  stretch: '<circle cx="12" cy="4.3" r="1.7" stroke="currentColor" stroke-width="1.6"/><path d="M12 6.2v5.3M12 11.5 6.3 15M12 11.5l5.7 3.5M6.3 15v5.5M17.7 14.5V20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  handstand: '<circle cx="12" cy="19.3" r="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M12 17.6V4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 20h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  cardio: '<path d="M3 12.5h3.3l1.7-5 3.3 10 2-8.5 1.3 3.5h4.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  finisher: '<path d="M12 2.3c1 3.6-2.7 4.8-2.7 7.6a2.7 2.7 0 0 0 5.4 0c0-.8-.6-1.6-.7-2.4 1.7 1 2.7 2.7 2.7 4.6a4.7 4.7 0 0 1-9.4 0c0-3.8 2.9-5.6 4.7-9.8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>',
};

// Echte zugeschnittene Icon-Grafiken (aus der Referenz-PDF/-Bildern) pro
// Uebungs-ID, statt handgezeichneter SVG-Naeherung, wo vorhanden.
const ICON_IMAGES = {
  'di-aslr': './assets/icons/di-aslr.png',
  'di-atg': './assets/icons/di-atg.png',
  'di-cardio': './assets/icons/di-cardio.png',
  'di-frontsplit': './assets/icons/di-frontsplit.png',
  'di-hipflexor': './assets/icons/di-hipflexor.png',
  'di-rdl-light': './assets/icons/di-rdl-light.png',
  'do-bench': './assets/icons/do-bench.png',
  'do-handstand': './assets/icons/do-handstand.png',
  'do-hipthrust': './assets/icons/do-hipthrust.png',
  'do-latstretch': './assets/icons/do-latstretch.png',
  'do-lsit': './assets/icons/do-lsit.png',
  'do-neck': './assets/icons/do-neck.png',
  'do-nordic': './assets/icons/do-nordic.png',
  'do-pancake': './assets/icons/do-pancake.png',
  'do-pikelift': './assets/icons/do-pikelift.png',
  'do-pistol': './assets/icons/do-pistol.png',
  'do-revnordic': './assets/icons/do-revnordic.png',
  'do-ringrow': './assets/icons/do-ringrow.png',
  'do-scappullup': './assets/icons/do-scappullup.png',
  'do-straddlegm': './assets/icons/do-straddlegm.png',
  'do-wallshoulder': './assets/icons/do-wallshoulder.png',
  'fr-adductor': './assets/icons/fr-adductor.png',
  'fr-cossack': './assets/icons/fr-cossack.png',
  'fr-frog': './assets/icons/fr-frog.png',
  'fr-horsestance': './assets/icons/fr-horsestance.png',
  'fr-laterallunge': './assets/icons/fr-laterallunge.png',
  'fr-middlesplit': './assets/icons/fr-middlesplit.png',
  'mi-9090': './assets/icons/mi-9090.png',
  'mi-catcow': './assets/icons/mi-catcow.png',
  'mi-cossack': './assets/icons/mi-cossack.png',
  'mi-hang': './assets/icons/mi-hang.png',
  'mi-shouldercars': './assets/icons/mi-shouldercars.png',
  'mi-squatpry': './assets/icons/mi-squatpry.png',
  'mi-thoracic': './assets/icons/mi-thoracic.png',
  'mi-wrist': './assets/icons/mi-wrist.png',
  'mo-calf': './assets/icons/mo-calf.png',
  'mo-dip': './assets/icons/mo-dip.png',
  'mo-extrot': './assets/icons/mo-extrot.png',
  'mo-jump': './assets/icons/mo-jump.png',
  'mo-neck': './assets/icons/mo-neck.png',
  'mo-nordic': './assets/icons/mo-nordic.png',
  'mo-pullup': './assets/icons/mo-pullup.png',
  'mo-rdl': './assets/icons/mo-rdl.png',
  'mo-splitsquat': './assets/icons/mo-splitsquat.png',
  'sa-cablerow': './assets/icons/sa-cablerow.png',
  'sa-explosivepullup': './assets/icons/sa-explosivepullup.png',
  'sa-finisher': './assets/icons/sa-finisher.png',
  'sa-leraise': './assets/icons/sa-leraise.png',
  'sa-neck': './assets/icons/sa-neck.png',
  'sa-pogo': './assets/icons/sa-pogo.png',
  'sa-revlunge': './assets/icons/sa-revlunge.png',
  'sa-ringpushup': './assets/icons/sa-ringpushup.png',
  'sa-rotpower': './assets/icons/sa-rotpower.png',
  'sa-tibialis': './assets/icons/sa-tibialis.png',
};

export function typeIcon(iconKey, exerciseId) {
  if (exerciseId && ICON_IMAGES[exerciseId]) {
    return h('img', { class: 'type-icon type-icon-img', src: ICON_IMAGES[exerciseId], alt: '' });
  }
  const svg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">${ICON_PATHS[iconKey] || ICON_PATHS.push}</svg>`;
  return h('span', { class: 'type-icon', html: svg });
}

// Navigation: schlichte Outline-Icons statt bunter Emojis.
const NAV_ICON_PATHS = {
  home: '<path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  plan: '<rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M8.5 9h7M8.5 13h7M8.5 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  progress: '<path d="M4 19V9M9.5 19V5M15 19v-6M20 19V11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  history: '<rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M4 9.5h16M8 3v3.4M16 3v3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};

export function navIcon(key) {
  const svg = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none">${NAV_ICON_PATHS[key] || ''}</svg>`;
  return h('span', { class: 'type-icon', html: svg });
}

export function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function fmtMinSec(totalSec) {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function fmtRestRange(restSec) {
  if (!restSec) return '';
  const min = fmtMinSec(restSec.min);
  const max = fmtMinSec(restSec.max);
  return min === max ? `${min} min` : `${min}-${max} min`;
}

export function matchBadge(match) {
  const cls = match === 'passend' ? 'badge badge-green' : 'badge badge-yellow';
  const text = match === 'passend' ? 'PASSEND' : 'ÄHNLICH';
  return h('span', { class: cls }, text);
}

export function typeBadge(labelText) {
  return h('span', { class: 'badge badge-neutral' }, labelText);
}

export function renderBarChart(bars) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return h('div', { class: 'bar-chart' }, bars.map((b) => h('div', { class: 'bar-chart-col' }, [
    h('div', { class: 'bar-chart-track' }, [
      h('div', { class: 'bar-chart-fill' + (b.value > 0 ? ' bar-chart-fill-active' : ''), style: `height:${Math.round((b.value / max) * 100)}%` }),
    ]),
    h('div', { class: 'bar-chart-label' }, b.label),
  ])));
}

export function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMin = Math.round(ms / 60000);
  const h_ = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h_ > 0 ? `${h_} h ${m} min` : `${m} min`;
}

// Nur echte youtube.com/watch- oder youtu.be-Links lassen sich als konkretes
// Video einbetten. Such- und Artikel-Seiten (fitnessfaqs.com, e3rehab.com, ...)
// zeigen keine einzelne einbettbare Videoquelle.
export function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.pathname === '/watch') {
      return u.searchParams.get('v');
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1) || null;
    }
  } catch (e) {
    // ungültige URL -> kein Embed
  }
  return null;
}

// Zeigt ein Video direkt in der App als kleines Popup statt zu YouTube zu
// wechseln - nur moeglich, wenn die URL ein konkretes, einbettbares Video ist.
export function openVideoModal(video) {
  const id = extractYouTubeId(video.url);
  const backdrop = h('div', { class: 'overlay-backdrop' });
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  const modal = h('div', { class: 'video-modal-card' });
  if (id) {
    const params = [];
    if (video.startSec) params.push(`start=${video.startSec}`);
    if (video.endSec) params.push(`end=${video.endSec}`);
    const query = params.length ? `?${params.join('&')}` : '';
    modal.appendChild(h('div', { class: 'video-embed-wrap' }, [
      h('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${id}${query}`,
        title: video.label, frameborder: '0',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowfullscreen: '',
      }),
    ]));
  } else {
    modal.appendChild(h('p', { class: 'small' }, 'Diese Referenz ist eine Such-/Artikelseite und lässt sich nicht direkt als Video einbetten.'));
    modal.appendChild(h('a', { href: video.url, target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-primary btn-noarrow' }, 'In neuem Tab öffnen ↗'));
  }
  modal.appendChild(h('button', { class: 'btn btn-ghost btn-small', onclick: () => backdrop.remove() }, 'Schließen'));
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}
