
const CACHE_NAME = 'legal-lens-v1.0.1';
const RUNTIME_CACHE = 'legal-lens-runtime';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/chat.html',
  '/community.html',
  '/offline.html',
  '/css/main.css',
  '/css/landing.css',
  '/css/theme.css',
  '/css/community.css',
  '/js/main.js',
  '/js/theme.js',
  '/js/chat.js',
  '/js/community.js',
  '/js/magnifier.js',
  '/js/fir-modal.js',
  '/js/pwa.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
];
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    if (request.destination === 'font' || url.hostname.includes('fonts')) {
      event.respondWith(
        caches.match(request).then((response) => {
          return response || fetch(request).then((fetchResponse) => {
            return caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, fetchResponse.clone());
              return fetchResponse;
            });
          });
        })
      );
    }
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || new Response(
              JSON.stringify({ 
                error: 'Offline', 
                message: 'You are currently offline. Some features may be limited.' 
              }),
              { 
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
        })
    );
    return;
  }
  if (
    request.destination === 'document' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            // Return cached version and update in background
            fetch(request)
              .then((fetchResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, fetchResponse);
                });
              })
              .catch(() => {});
            return response;
          }
          
          // Not in cache, fetch from network
          return fetch(request)
            .then((fetchResponse) => {
              return caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, fetchResponse.clone());
                return fetchResponse;
              });
            })
            .catch(() => {
              if (request.destination === 'document') {
                return caches.match('/index.html');
              }
            });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          return caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
      .catch(() => {
        if (request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#ddd" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      })
  );
});

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncStories());
  } else if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Legal Lens';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/assets/images/icon-192x192.png',
    badge: '/assets/images/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
    requireInteraction: false,
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open', icon: '/assets/images/icon-96x96.png' },
      { action: 'close', title: 'Close', icon: '/assets/images/icon-96x96.png' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});
async function syncStories() {
  console.log('[SW] Syncing stories...');
}

async function syncComments() {
  console.log('[SW] Syncing comments...');
}

console.log('[SW] Service Worker loaded');
