// Garage Manager - Service Worker (no external dependencies)

const CACHE_NAME = 'garage-v11';
const APP_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/auth.js',
  './js/sheets.js',
  './js/jobcard.js',
  './js/joblist.js',
  './js/parts.js',
  './js/billing.js',
  './js/delivery.js',
  './js/history.js',
  './js/vendor/html5-qrcode.min.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Install - cache all core app files, skip waiting to activate immediately
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clear old caches and notify all clients that an update is ready
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      // Notify all open tabs/windows that the app has been updated
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
      });
    })
  );
  self.clients.claim();
});

// Fetch - network first for API calls, cache first for app assets
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Never cache Google Apps Script API calls
  if (url.indexOf('script.google.com') !== -1) {
    return;
  }

  // Never cache external CDN resources (fonts, icons)
  if (url.indexOf('fonts.googleapis.com') !== -1 ||
      url.indexOf('fonts.gstatic.com') !== -1 ||
      url.indexOf('unpkg.com') !== -1) {
    return;
  }

  // For navigation and app assets: try network first, fall back to cache
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
