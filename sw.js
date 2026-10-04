// Service Worker v2
// - App code (HTML/JS/JSON/CSS): NETWORK-FIRST, so updates always reach users.
//   Falls back to the cached copy only when offline.
// - Large static files (model weights, icons, images): CACHE-FIRST, since they
//   rarely change and are expensive to re-download.
//
// To force every phone to drop its old cache after a big change,
// bump CACHE_NAME (e.g. v2 -> v3).
const CACHE_NAME = 'talkease-cache-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

function isAppCode(request) {
  const url = new URL(request.url);
  return (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    /\.(html|js|css|json)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Let the browser handle cross-origin requests (CDN libraries etc.) itself
  if (new URL(request.url).origin !== self.location.origin) return;

  if (isAppCode(request)) {
    // Network-first
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});