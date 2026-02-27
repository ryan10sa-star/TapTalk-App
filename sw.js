/* ============================================================
   TapTalk AAC — sw.js
   Cache-first Service Worker.  Works perfectly in airplane mode.
   ============================================================ */

const CACHE_NAME = 'taptalk-v3';

/** Static app-shell assets — must all be present; cached atomically on install */
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './manifest.json',
  './icon.svg',
];

/**
 * AAC pictogram images — populated by `npm run fetch-images` before deploy.
 * Cached individually with allSettled so a missing file never breaks install.
 */
const AAC_IMAGE_ASSETS = [
  './aac-images/yes.png',
  './aac-images/no.png',
  './aac-images/rocks.png',
  './aac-images/ball.png',
  './aac-images/walk.png',
  './aac-images/coloring.png',
  './aac-images/book.png',
  './aac-images/math.png',
  './aac-images/writing.png',
];

/* ---------- Install: pre-cache shell + AAC images ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      /* App shell must all succeed — fail fast if any is missing */
      await cache.addAll(STATIC_ASSETS);
      /* AAC images are populated at build time; tolerate missing files
         so the SW still installs cleanly in a fresh dev checkout */
      await Promise.allSettled(
        AAC_IMAGE_ASSETS.map((url) => cache.add(url))
      );
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
          /* Offline fallback: return an SVG placeholder for image requests */
          if (
            event.request.destination === 'image' ||
            event.request.url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
          ) {
            return new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
                 <rect width="100" height="100" fill="#1a1a2e" rx="10"/>
                 <text x="50" y="58" text-anchor="middle" fill="#4a90d9"
                       font-size="11" font-family="sans-serif">Offline</text>
               </svg>`,
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
        });
    })
  );
});
