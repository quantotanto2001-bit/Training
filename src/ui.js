// Kleine DOM-Hilfsfunktionen, keine Frameworks noetig.

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
  const text = match === 'passend' ? 'PASSEND' : 'AEHNLICH';
  return h('span', { class: cls }, text);
}

export function typeBadge(labelText) {
  return h('span', { class: 'badge badge-neutral' }, labelText);
}
