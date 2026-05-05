// Projekt Ares — Service Worker
// Strategie: Cache-first für App-Shell, Network-only für API-Calls

const CACHE_NAME = 'projekt-ares-v1';

const APP_SHELL = [
  './projekt_ares.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
];

// ── Install: App-Shell cachen ────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: Alte Cache-Versionen löschen ───────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Routing-Logik ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API-Calls (Anthropic) → immer live, nie cachen
  if (url.hostname === 'api.anthropic.com') return;

  // Nur GET-Requests cachen
  if (event.request.method !== 'GET') return;

  // Stale-while-revalidate: sofort aus Cache, im Hintergrund aktualisieren
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // Aus Cache sofort liefern; wenn kein Cache → auf Network warten
      return cached || fetchPromise || caches.match('./projekt_ares.html');
    })
  );
});

// ── Message: Manuelles Update-Trigger ───────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
