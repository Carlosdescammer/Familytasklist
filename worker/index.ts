// Custom service worker for handling push notifications
// This file is merged with the next-pwa generated service worker

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Handle push notifications
self.addEventListener('push', (event: PushEvent) => {
  console.log('[Service Worker] Push notification received:', event);

  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();

    const options: any = {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      image: payload.image,
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      vibrate: payload.vibrate,
      timestamp: payload.timestamp || Date.now(),
      actions: payload.actions || [
        {
          action: 'open',
          title: 'Open',
        },
        {
          action: 'close',
          title: 'Close',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(payload.title, options));
  } catch (error) {
    console.error('[Service Worker] Error processing push notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  // Handle action button clicks
  if (event.action === 'close') {
    return;
  }

  // Get the URL to open from notification data
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open with this URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close events (optional analytics)
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('[Service Worker] Notification closed:', event);
  // You can add analytics tracking here if needed
});

// ===== BACKGROUND SYNC =====
// Handle background sync events
self.addEventListener('sync', (event: any) => {
  console.log('[Service Worker] Background sync event:', event.tag);

  if (event.tag === 'sync-queue') {
    event.waitUntil(syncQueuedRequests());
  }
});

async function syncQueuedRequests() {
  try {
    // Open the IndexedDB
    const db = await openSyncDB();
    const transaction = db.transaction(['pending-requests'], 'readonly');
    const store = transaction.objectStore('pending-requests');
    const requests = await getAllFromStore(store);

    console.log(`[Service Worker] Syncing ${requests.length} queued requests`);

    for (const request of requests) {
      try {
        // Attempt to replay the request
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        if (response.ok) {
          // Request succeeded, remove from queue
          await removeFromQueue(db, request.id);
          console.log(`[Service Worker] Successfully synced request: ${request.url}`);
        } else {
          // Request failed, increment retry count
          await incrementRetryCount(db, request.id);
          console.log(`[Service Worker] Failed to sync request (will retry): ${request.url}`);
        }
      } catch (error) {
        console.error(`[Service Worker] Error syncing request: ${request.url}`, error);
        await incrementRetryCount(db, request.id);
      }
    }

    // Show notification if synced successfully
    if (requests.length > 0) {
      await self.registration.showNotification('Sync Complete', {
        body: `${requests.length} offline action(s) synced successfully`,
        icon: '/icon-192.png',
        tag: 'sync-complete',
      });
    }
  } catch (error) {
    console.error('[Service Worker] Error during background sync:', error);
  }
}

function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('familylist-sync-queue', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store: IDBObjectStore): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeFromQueue(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function incrementRetryCount(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const request = getRequest.result;
      if (request) {
        request.retryCount++;
        const putRequest = store.put(request);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ===== ADVANCED CACHING =====
const CACHE_NAME = 'familylist-v1';
const IMAGE_CACHE = 'familylist-images-v1';
const API_CACHE = 'familylist-api-v1';

// Cache-first strategy for images
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Image caching strategy
  if (event.request.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstImage(event.request));
    return;
  }

  // API caching strategy (network-first with fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(event.request));
    return;
  }
});

async function cacheFirstImage(request: Request): Promise<Response> {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a fallback image if available
    console.error('[Service Worker] Failed to fetch image:', error);
    return new Response('', { status: 404, statusText: 'Image not found' });
  }
}

async function networkFirstAPI(request: Request): Promise<Response> {
  const cache = await caches.open(API_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[Service Worker] Returning cached API response');
      return cached;
    }
    throw error;
  }
}

// Clean up old caches on activation
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== CACHE_NAME &&
              cacheName !== IMAGE_CACHE &&
              cacheName !== API_CACHE
            );
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

export {};
