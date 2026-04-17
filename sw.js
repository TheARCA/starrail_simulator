// sw.js
const CACHE_NAME = 'hsr-sim-v1';

// Just caching the absolute essentials to satisfy the PWA requirement
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
