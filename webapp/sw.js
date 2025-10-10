const CACHE_NAME = 'insighti-v2.1';
const ASSETS = [
  '/index.html',
  '/css/style.css',
  '/js/data.js',
  '/js/api.js',
  '/js/ai-detector.js',
  '/js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    // Let external API requests (Render backend) pass through without caching
    return;
  }
  
  // Same-origin static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});


