// Nom du cache pour l'application
const CACHE_NAME = 'restaurant-app-v1';
const DYNAMIC_CACHE_NAME = 'restaurant-app-dynamic-v1';

// Fichiers à mettre en cache lors de l'installation
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  'https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap',
  'https://fonts.gstatic.com/s/mountainsofchristmas/v20/3y9D6b4xCq1CvPoXnRopK6e9APZ7xQEBQ.woff2'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Mise en cache des ressources statiques');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Stratégie de mise en cache : Cache First, puis réseau
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les requêtes vers des API externes
  if (
    event.request.method !== 'GET' ||
    !(event.request.url.startsWith(self.location.origin) || 
      event.request.url.startsWith('https://fonts.googleapis.com') ||
      event.request.url.startsWith('https://fonts.gstatic.com'))
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retourner la réponse en cache si elle existe
      if (response) {
        return response;
      }

      // Sinon, récupérer depuis le réseau et mettre en cache
      return fetch(event.request)
        .then((networkResponse) => {
          // Vérifier si la réponse est valide
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Mettre en cache la réponse pour les requêtes ultérieures
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // En cas d'erreur de réseau, on peut retourner une page de secours
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Ressource non disponible hors ligne', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
    })
  );
});

// Gestion des messages du Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Fonction de synchronisation des données
function syncData() {
  return new Promise((resolve) => {
    console.log('Synchronisation des données en arrière-plan');
    // Implémentez la logique de synchronisation ici
    resolve();
  });
}

// Gestion des notifications push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification('Nouvelle notification', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
