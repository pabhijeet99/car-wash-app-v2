// Car Wash Manager - Service Worker (no external dependencies)

const CACHE_NAME = 'carwash-v2';
const APP_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/auth.js',
  './js/sheets.js',
  './manifest.json',
  './icons/icon.svg'
];

// Install — cache all core app files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first for API calls, cache first for app assets
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Never cache Google Apps Script API calls
  if (url.indexOf('script.google.com') !== -1) {
    return;
  }

  // For navigation and app assets: try network first, fall back to cache
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Cache successful responses
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Network failed — serve from cache (offline support)
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
