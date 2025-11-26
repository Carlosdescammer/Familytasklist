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

export {};
