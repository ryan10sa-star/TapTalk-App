/* ============================================================
   TapTalk AAC — sw.js
   Cache-first Service Worker.  Works perfectly in airplane mode.
   ============================================================ */

const CACHE_NAME = 'taptalk-v6';

/** Static app-shell assets — must all be present; cached atomically on install */
const isGitHub = self.location.hostname && self.location.hostname.includes('github.io');
const basePath = isGitHub ? 'TapTalk-App/' : '';
const STATIC_ASSETS = [
  `${basePath}`,
  `${basePath}index.html`,
  `${basePath}styles.css`,
  `${basePath}app.js`,
  `${basePath}db.js`,
  `${basePath}data-export.js`,
  `${basePath}manifest.json`,
  `${basePath}icon.svg`,
];

/* ---------- Install: pre-cache shell + AAC images ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      /* App shell must all succeed — fail fast if any is missing */
      await cache.addAll(STATIC_ASSETS);

      // Explicitly cache all AAC images listed in vocabulary.json
      try {
        const vocabRes = await fetch(`${basePath}aac-images/vocabulary.json`);
        if (vocabRes.ok) {
          await cache.put(`${basePath}aac-images/vocabulary.json`, vocabRes.clone());
          const words = await vocabRes.json();
          if (Array.isArray(words) && words.length > 0) {
            const imagePaths = words.map(word => `${basePath}aac-images/${word}.png`);
            await Promise.allSettled(imagePaths.map(path => cache.add(path)));
          }
        }
      } catch (_) {
        // vocabulary.json not yet generated (fresh checkout / CI) —
        // images will be cached on first network access via the fetch handler
      }
    })
  );
  self.skipWaiting();
});

/* ---------- Activate: remove stale caches ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ---------- Fetch: cache-first with network fallback ---------- */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // No offline fallback: let the browser show the broken image icon for missing images
        });
    })
  );
});
