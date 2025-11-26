// Client-side Web Push API utilities

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    // Check if supported
    if (!isPushNotificationSupported()) {
      console.warn('Push notifications are not supported');
      return null;
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as BufferSource,
      });
    }

    console.log('Push subscription successful:', subscription);
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('Successfully unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

// Get current push subscription
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription;
  } catch (error) {
    console.error('Error getting current push subscription:', error);
    return null;
  }
}

// Show a local notification (for testing)
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushNotificationSupported()) {
    throw new Error('Notifications are not supported');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification(title, {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options,
  });
}
