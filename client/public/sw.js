// TapTalk AAC — Air-Gap Service Worker
// Increment APP_VERSION to force a full cache refresh across all devices.
const APP_VERSION = "v2026.2";
const APP_CACHE = `taptalk-app-${APP_VERSION}`;
const MEDIA_CACHE = `taptalk-media-${APP_VERSION}`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/vocabulary.json",
];

// Install: pre-cache app shell assets.
// skipWaiting() activates this SW immediately after install.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete ALL caches from previous versions (atomic update).
// Old media cache is wiped; new cache builds on demand as assets are accessed.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== APP_CACHE && k !== MEDIA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  const isMedia =
    url.pathname.startsWith("/aac-images/") ||
    url.pathname.startsWith("/aac-audio/");

  if (isMedia) {
    // STRICT CACHE-FIRST: Once cached, never re-download until version bump.
    // This is the "air-gap" guarantee — works 100% offline after first load.
    event.respondWith(cacheFirst(event.request, MEDIA_CACHE));
    return;
  }

  // App shell (HTML, JS, CSS): network-first with cache fallback.
  event.respondWith(networkFirstWithFallback(event.request, APP_CACHE));
});

// Strict cache-first strategy for media assets.
// Network is only hit when the asset is NOT in cache.
// Once fetched and cached, it is NEVER re-fetched until APP_VERSION changes.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(
      `{"error":"Asset unavailable offline","path":"${request.url}"}`,
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Network-first strategy for app shell.
// Tries network, falls back to cache if offline.
async function networkFirstWithFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return (
      cached ||
      new Response("TapTalk AAC is offline and this page is not cached.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}
