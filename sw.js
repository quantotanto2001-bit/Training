const CACHE_NAME = 'universal-athlete-v4-adaptive-3';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/app.js',
  './src/ui.js',
  './src/db.js',
  './src/state.js',
  './src/plan.js',
  './src/training.js',
  './src/motion.js',
  './assets/motion/rdl/1.png',
  './assets/motion/rdl/2.png',
  './assets/motion/rdl/3.png',
  './assets/motion/rdl/rdl.gif',
  './assets/motion/goblet-squat/1.png',
  './assets/motion/goblet-squat/2.png',
  './assets/motion/goblet-squat/3.png',
  './assets/motion/goblet-squat/loop.gif',
  './assets/motion/bench-db/1.png',
  './assets/motion/bench-db/2.png',
  './assets/motion/bench-db/3.png',
  './assets/motion/bench-db/loop.gif',
  './assets/motion/calf-raise/1.png',
  './assets/motion/calf-raise/2.png',
  './assets/motion/calf-raise/3.png',
  './assets/motion/calf-raise/loop.gif',
  './src/progression.js',
  './src/views/workout-v4.js',
  './src/views/workout-helpers.js',
  './src/views/progress-v4.js',
  './src/views/settings.js',
  './src/timer.js',
  './src/setForms.js',
  './src/views/home.js',
  './src/views/workout.js',
  './src/views/history.js',
  './src/views/progress.js',
  './src/views/planOverview.js',
  './src/views/cycleComplete.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './assets/icons/di-aslr.png',
  './assets/icons/di-atg.png',
  './assets/icons/di-cardio.png',
  './assets/icons/di-frontsplit.png',
  './assets/icons/di-hipflexor.png',
  './assets/icons/di-rdl-light.png',
  './assets/icons/do-bench.png',
  './assets/icons/do-handstand.png',
  './assets/icons/do-hipthrust.png',
  './assets/icons/do-latstretch.png',
  './assets/icons/do-lsit.png',
  './assets/icons/do-neck.png',
  './assets/icons/do-nordic.png',
  './assets/icons/do-ohp.png',
  './assets/icons/do-pancake.png',
  './assets/icons/do-pikelift.png',
  './assets/icons/do-pistol.png',
  './assets/icons/do-revnordic.png',
  './assets/icons/do-ringrow.png',
  './assets/icons/do-scappullup.png',
  './assets/icons/do-straddlegm.png',
  './assets/icons/do-wallshoulder.png',
  './assets/icons/fr-adductor.png',
  './assets/icons/fr-cossack.png',
  './assets/icons/fr-frog.png',
  './assets/icons/fr-horsestance.png',
  './assets/icons/fr-laterallunge.png',
  './assets/icons/fr-middlesplit.png',
  './assets/icons/mi-9090.png',
  './assets/icons/mi-catcow.png',
  './assets/icons/mi-cossack.png',
  './assets/icons/mi-hang.png',
  './assets/icons/mi-shouldercars.png',
  './assets/icons/mi-squatpry.png',
  './assets/icons/mi-thoracic.png',
  './assets/icons/mi-wrist.png',
  './assets/icons/mo-calf.png',
  './assets/icons/mo-dip.png',
  './assets/icons/mo-extrot.png',
  './assets/icons/mo-gobletsquat.png',
  './assets/icons/mo-jump.png',
  './assets/icons/mo-neck.png',
  './assets/icons/mo-nordic.png',
  './assets/icons/mo-pullup.png',
  './assets/icons/mo-rdl.png',
  './assets/icons/mo-splitsquat.png',
  './assets/icons/sa-cablerow.png',
  './assets/icons/sa-explosivepullup.png',
  './assets/icons/sa-finisher.png',
  './assets/icons/sa-leraise.png',
  './assets/icons/sa-neck.png',
  './assets/icons/sa-pogo.png',
  './assets/icons/sa-revlunge.png',
  './assets/icons/sa-ringpushup.png',
  './assets/icons/sa-rotpower.png',
  './assets/icons/sa-tibialis.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(APP_SHELL.map((url) =>
        fetch(url, { cache: 'reload' }).then((res) => { if (!res.ok) throw new Error('Missing app file: ' + url); return cache.put(url, res); })
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('universal-athlete-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// App-Shell: cache-first (offline nutzbar). Externe Video-Links laufen normal über das Netz.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
