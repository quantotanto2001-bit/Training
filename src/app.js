import { h } from './ui.js';
import { renderHome } from './views/home.js';
import { renderWorkout } from './views/workout.js';
import { renderHistoryList, renderHistoryDetail } from './views/history.js';
import { renderProgressList, renderProgressDetail } from './views/progress.js';
import { renderPlanOverview } from './views/planOverview.js';

const root = document.getElementById('app');
const main = h('main', { class: 'main', id: 'main' });
const nav = buildNav();
root.appendChild(h('div', { class: 'app-shell' }, [main, nav]));

function buildNav() {
  const items = [
    { href: '#/', label: 'Start', icon: '🏠' },
    { href: '#/plan', label: 'Plan', icon: '📋' },
    { href: '#/progress', label: 'Fortschritt', icon: '📈' },
    { href: '#/history', label: 'Verlauf', icon: '🗓️' },
  ];
  const nav = h('nav', { class: 'bottom-nav' },
    items.map((it) => h('a', { href: it.href, class: 'nav-item', 'data-href': it.href }, [
      h('span', { class: 'nav-icon' }, it.icon),
      h('span', { class: 'nav-label' }, it.label),
    ])));
  return nav;
}

function setActiveNav(hash) {
  const base = '#/' + (hash.split('/')[1] || '');
  document.querySelectorAll('.nav-item').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-href') === (base === '#/' ? '#/' : base));
  });
}

let routeToken = 0;

async function route() {
  const myToken = ++routeToken;
  const hash = window.location.hash || '#/';
  setActiveNav(hash);
  const parts = hash.replace('#/', '').split('/').filter(Boolean);

  try {
    let view;
    if (parts.length === 0) {
      view = await renderHome();
    } else if (parts[0] === 'workout') {
      view = await renderWorkout(parts[1]);
    } else if (parts[0] === 'history' && parts[1]) {
      view = await renderHistoryDetail(parts[1]);
    } else if (parts[0] === 'history') {
      view = await renderHistoryList();
    } else if (parts[0] === 'progress' && parts[1]) {
      view = await renderProgressDetail(parts[1]);
    } else if (parts[0] === 'progress') {
      view = await renderProgressList();
    } else if (parts[0] === 'plan') {
      view = await renderPlanOverview();
    } else {
      view = await renderHome();
    }
    if (myToken !== routeToken) return; // ueberholt durch neuere Navigation
    main.innerHTML = '';
    main.scrollTop = 0;
    main.appendChild(view);
  } catch (err) {
    console.error(err);
    main.appendChild(h('div', { class: 'card' }, [
      h('h2', {}, 'Etwas ist schiefgelaufen'),
      h('p', {}, String(err && err.message ? err.message : err)),
    ]));
  }
}

// Module-Skripte laufen erst nach dem HTML-Parsing (wie defer), ein zusaetzlicher
// DOMContentLoaded-Listener wuerde zu einer Race Condition mit doppeltem Rendern fuehren.
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  let reloadedOnce = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedOnce) return;
    reloadedOnce = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
