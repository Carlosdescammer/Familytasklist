// Server-side Web Push utilities using the web-push library
import webpush from 'web-push';

// Initialize web-push with VAPID keys
function initializeWebPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@familylist.app';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured');
    return false;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  return true;
}

// Initialize on module load
const isInitialized = initializeWebPush();

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
  url?: string; // Deep link URL to open when clicked
}

// Send a push notification to a single subscription
export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!isInitialized) {
    return {
      success: false,
      error: 'Web Push not initialized - VAPID keys missing',
    };
  }

  try {
    const notificationPayload = JSON.stringify(payload);

    await webpush.sendNotification(subscription as any, notificationPayload);

    console.log('Push notification sent successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error sending push notification:', error);

    // Handle specific errors
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription no longer valid (expired or unsubscribed)
      return {
        success: false,
        error: 'Subscription expired or invalid',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to send push notification',
    };
  }
}

// Send push notifications to multiple subscriptions
export async function sendPushNotificationToMultiple(
  subscriptions: PushSubscriptionJSON[],
  payload: PushNotificationPayload
): Promise<{
  successCount: number;
  failureCount: number;
  expiredSubscriptions: PushSubscriptionJSON[];
}> {
  if (!isInitialized) {
    return {
      successCount: 0,
      failureCount: subscriptions.length,
      expiredSubscriptions: [],
    };
  }

  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendPushNotification(subscription, payload))
  );

  let successCount = 0;
  let failureCount = 0;
  const expiredSubscriptions: PushSubscriptionJSON[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
    } else {
      failureCount++;

      // Check if subscription expired
      if (
        result.status === 'fulfilled' &&
        result.value.error?.includes('expired')
      ) {
        expiredSubscriptions.push(subscriptions[index]);
      }
    }
  });

  console.log(
    `Sent push notifications: ${successCount} succeeded, ${failureCount} failed, ${expiredSubscriptions.length} expired`
  );

  return {
    successCount,
    failureCount,
    expiredSubscriptions,
  };
}

// Helper function to create a notification payload for task assignments
export function createTaskNotificationPayload(
  taskTitle: string,
  taskId: string,
  assignerName: string
): PushNotificationPayload {
  return {
    title: 'New Task Assigned',
    body: `${assignerName} assigned you: ${taskTitle}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type: 'task',
      taskId,
    },
    url: `/tasks?id=${taskId}`,
    tag: `task-${taskId}`,
    requireInteraction: true,
    timestamp: Date.now(),
  };
}

// Helper function to create a notification payload for shopping list updates
export function createShoppingNotificationPayload(
  itemName: string,
  listId: string,
  adderName: string
): PushNotificationPayload {
  return {
    title: 'Shopping List Updated',
    body: `${adderName} added ${itemName} to the shopping list`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type: 'shopping',
      listId,
    },
    url: `/shopping?list=${listId}`,
    tag: `shopping-${listId}`,
    timestamp: Date.now(),
  };
}

// Helper function to create a notification payload for calendar events
export function createCalendarNotificationPayload(
  eventTitle: string,
  eventId: string,
  startTime: Date
): PushNotificationPayload {
  const timeUntil = Math.floor((startTime.getTime() - Date.now()) / (1000 * 60));
  const timeString =
    timeUntil < 60
      ? `in ${timeUntil} minutes`
      : `in ${Math.floor(timeUntil / 60)} hours`;

  return {
    title: 'Upcoming Event',
    body: `${eventTitle} starts ${timeString}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type: 'calendar',
      eventId,
    },
    url: `/calendar?event=${eventId}`,
    tag: `event-${eventId}`,
    requireInteraction: true,
    timestamp: Date.now(),
  };
}

// Helper function to create a notification payload for budget alerts
export function createBudgetNotificationPayload(
  percentage: number,
  month: string
): PushNotificationPayload {
  return {
    title: 'Budget Alert',
    body: `Your budget for ${month} is ${percentage}% spent`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type: 'budget',
      month,
    },
    url: '/budget',
    tag: `budget-${month}`,
    requireInteraction: true,
    timestamp: Date.now(),
  };
}

// Helper function to create a notification payload for forum replies
export function createForumReplyNotificationPayload(
  postTitle: string,
  postId: string,
  replierName: string
): PushNotificationPayload {
  return {
    title: 'New Forum Reply',
    body: `${replierName} replied to your post: ${postTitle}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type: 'forum',
      postId,
    },
    url: `/forums/post/${postId}`,
    tag: `forum-${postId}`,
    timestamp: Date.now(),
  };
}

// Helper function to create a notification payload for points awarded
export function createPointsNotificationPayload(
  points: number,
  reason: string
): PushNotificationPayload {
  return {
    title: 'Points Earned!',
    body: `You earned ${points} family bucks for ${reason}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type: 'points',
      points,
    },
    url: '/profile',
    tag: 'points',
    timestamp: Date.now(),
  };
}
