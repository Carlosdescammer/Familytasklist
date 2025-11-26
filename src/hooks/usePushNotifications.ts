import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
  isPushNotificationSupported,
} from '@/lib/web-push-client';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    setIsSupported(isPushNotificationSupported());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check current subscription status
  const refreshSubscription = useCallback(async () => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      const currentSub = await getCurrentPushSubscription();
      setSubscription(currentSub);
      setIsSubscribed(currentSub !== null);

      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Load subscription status on mount
  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications are not supported');
      return false;
    }

    setIsLoading(true);

    try {
      const newSubscription = await subscribeToPushNotifications();

      if (newSubscription) {
        setSubscription(newSubscription);
        setIsSubscribed(true);
        setPermission('granted');

        // Save subscription to backend
        await saveSubscriptionToBackend(newSubscription);

        return true;
      }

      setPermission(Notification.permission);
      return false;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return false;
    }

    setIsLoading(true);

    try {
      const success = await unsubscribeFromPushNotifications();

      if (success) {
        // Remove subscription from backend
        await removeSubscriptionFromBackend(subscription);

        setSubscription(null);
        setIsSubscribed(false);
      }

      return success;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscription,
    subscribe,
    unsubscribe,
    refreshSubscription,
  };
}

// Helper function to save subscription to backend
async function saveSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        deviceType: getDeviceType(),
        deviceName: getDeviceName(),
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription to backend');
    }

    console.log('Subscription saved to backend successfully');
  } catch (error) {
    console.error('Error saving subscription to backend:', error);
    throw error;
  }
}

// Helper function to remove subscription from backend
async function removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from backend');
    }

    console.log('Subscription removed from backend successfully');
  } catch (error) {
    console.error('Error removing subscription from backend:', error);
    throw error;
  }
}

// Helper function to detect device type
function getDeviceType(): string {
  const ua = navigator.userAgent;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

// Helper function to get device name
function getDeviceName(): string {
  const ua = navigator.userAgent;

  // Check for specific browsers
  if (ua.indexOf('Firefox') > -1) {
    return 'Firefox';
  } else if (ua.indexOf('Edg') > -1) {
    return 'Edge';
  } else if (ua.indexOf('Chrome') > -1) {
    return 'Chrome';
  } else if (ua.indexOf('Safari') > -1) {
    return 'Safari';
  } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
    return 'Opera';
  }

  return 'Unknown Browser';
}
