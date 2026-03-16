// ── Bump this timestamp any time you deploy a new build. ──────────────────
// GitHub Actions / manual deploys: just save this file with a new date string
// and the browser will treat it as a brand-new service worker, install it,
// wipe the old cache, and serve fresh assets automatically.
const CACHE_VERSION = '2026-03-15-01';
const CACHE_NAME = 'seb-blast-' + CACHE_VERSION;

const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Install: cache all assets, activate immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete every cache that isn't the current version
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML so updates are picked up immediately.
// Cache-first for static assets (icons, manifest) since they rarely change.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = e.request.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname === '/' ||
                 url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first: always try to get the freshest index.html
    e.respondWith(
      fetch(e.request)
        .then(networkRes => {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return networkRes;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
  } else {
    // Cache-first for icons, manifest etc.
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request)
          .then(networkRes => {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            return networkRes;
          })
        )
    );
  }
});
