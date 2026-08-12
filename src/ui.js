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
  dip: '<path d="M6 5v14M18 5v14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="8.5" r="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M9 11l3-1.3 3 1.3M12 9.7v4.3M9.5 18l2.5-4 2.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  pull: '<path d="M4 5h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="9" r="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M9 6.5 12 9l3-2.5M12 10.6v4M9.3 19l2.7-4.4 2.7 4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  squat: '<circle cx="12" cy="4.3" r="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M12 6v3.5M8 20l2.5-7 1.5 2 1.5-2 2.5 7M6.5 12.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  hinge: '<path d="M8 4v10l8 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="8" cy="4" r="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="19.5" r="1.8" stroke="currentColor" stroke-width="1.6"/>',
  jump: '<path d="M12 20V9M7.5 13 12 8.5 16.5 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M6 20h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  calf: '<path d="M12 15V6M8.5 10 12 6.5 15.5 10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M6 19c2-1.5 10-1.5 12 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
  core: '<path d="M4 5h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="9" r="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M9 10.6v4.5M9 10.8l4-1M9 15.1l9-3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  rotate: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5M19.5 12a7.5 7.5 0 0 1-13 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M14.5 4.3 17.7 6l-1 3.2M9.5 19.7 6.3 18l1-3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  stretch: '<circle cx="12" cy="4.3" r="1.7" stroke="currentColor" stroke-width="1.6"/><path d="M12 6.2v5.3M12 11.5 6.3 15M12 11.5l5.7 3.5M6.3 15v5.5M17.7 14.5V20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  handstand: '<circle cx="12" cy="5" r="1.9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v6M7.5 21l4.5-8 4.5 8M7 12.5l5 1 5-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  cardio: '<path d="M3 12.5h3.3l1.7-5 3.3 10 2-8.5 1.3 3.5h4.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  finisher: '<path d="M12 2.3c1 3.6-2.7 4.8-2.7 7.6a2.7 2.7 0 0 0 5.4 0c0-.8-.6-1.6-.7-2.4 1.7 1 2.7 2.7 2.7 4.6a4.7 4.7 0 0 1-9.4 0c0-3.8 2.9-5.6 4.7-9.8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>',
};

export function typeIcon(iconKey) {
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
    modal.appendChild(h('div', { class: 'video-embed-wrap' }, [
      h('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${id}`,
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
