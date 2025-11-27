import { db } from '@/lib/db';
import { notifications, users, families, pushTokens } from '@/db/schema';
import { sendNotificationEmail, shouldSendEmail } from '@/lib/email';
import { eq, and, inArray } from 'drizzle-orm';
import { sendPushNotificationToMultiple, type PushNotificationPayload } from '@/lib/web-push-server';

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'all_tasks_complete'
  | 'event_reminder'
  | 'event_created'
  | 'shopping_list_created'
  | 'shopping_list_updated'
  | 'budget_alert'
  | 'budget_limit_reached'
  | 'family_member_joined'
  | 'recipe_shared';

interface CreateNotificationParams {
  familyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedTaskId?: string;
  relatedUserId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await db
    .insert(notifications)
    .values({
      familyId: params.familyId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedTaskId: params.relatedTaskId || null,
      relatedUserId: params.relatedUserId || null,
      read: false,
    })
    .returning();

  // Send email and push notifications if user has notifications enabled
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, params.userId),
      columns: {
        email: true,
        name: true,
        emailNotifications: true,
        notificationPreferences: true,
      },
    });

    const family = await db.query.families.findFirst({
      where: eq(families.id, params.familyId),
      columns: {
        name: true,
      },
    });

    if (user && family) {
      // Send email notification if enabled
      if (
        shouldSendEmail(
          user.emailNotifications,
          user.notificationPreferences,
          params.type
        )
      ) {
        // Send email notification asynchronously (don't wait for it)
        sendNotificationEmail({
          to: user.email,
          userName: user.name || user.email.split('@')[0],
          familyName: family.name,
          notificationType: params.type,
          title: params.title,
          message: params.message,
        }).catch((error) => {
          console.error('Error sending notification email:', error);
        });
      }

      // Send push notification asynchronously (don't wait for it)
      const pushPayload = createPushPayload(
        params.type,
        params.title,
        params.message,
        params.relatedTaskId,
        params.relatedUserId
      );
      sendPushNotificationsToUser(params.userId, pushPayload).catch((error) => {
        console.error('Error sending push notification:', error);
      });
    }
  } catch (error) {
    console.error('Error processing notifications:', error);
    // Don't fail the notification creation if email/push fails
  }

  return notification[0];
}

export async function createNotifications(notificationsList: CreateNotificationParams[]) {
  if (notificationsList.length === 0) return [];

  const values = notificationsList.map(params => ({
    familyId: params.familyId,
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedTaskId: params.relatedTaskId || null,
    relatedUserId: params.relatedUserId || null,
    read: false,
  }));

  const createdNotifications = await db
    .insert(notifications)
    .values(values)
    .returning();

  // Send email and push notifications for each notification
  // Group by user to batch fetches
  const userIds = Array.from(new Set(notificationsList.map(n => n.userId)));
  const familyIds = Array.from(new Set(notificationsList.map(n => n.familyId)));

  try {
    // Fetch all users and families in parallel
    const [usersMap, familiesMap] = await Promise.all([
      db.query.users.findMany({
        where: (users, { inArray }) => inArray(users.id, userIds),
        columns: {
          id: true,
          email: true,
          name: true,
          emailNotifications: true,
          notificationPreferences: true,
        },
      }).then(users => new Map(users.map(u => [u.id, u]))),
      db.query.families.findMany({
        where: (families, { inArray }) => inArray(families.id, familyIds),
        columns: {
          id: true,
          name: true,
        },
      }).then(families => new Map(families.map(f => [f.id, f]))),
    ]);

    // Send emails and push notifications for each notification
    notificationsList.forEach((params) => {
      const user = usersMap.get(params.userId);
      const family = familiesMap.get(params.familyId);

      if (user && family) {
        // Send email notification if enabled
        if (
          shouldSendEmail(
            user.emailNotifications,
            user.notificationPreferences,
            params.type
          )
        ) {
          // Send email notification asynchronously (don't wait for it)
          sendNotificationEmail({
            to: user.email,
            userName: user.name || user.email.split('@')[0],
            familyName: family.name,
            notificationType: params.type,
            title: params.title,
            message: params.message,
          }).catch((error) => {
            console.error('Error sending notification email:', error);
          });
        }

        // Send push notification asynchronously (don't wait for it)
        const pushPayload = createPushPayload(
          params.type,
          params.title,
          params.message,
          params.relatedTaskId,
          params.relatedUserId
        );
        sendPushNotificationsToUser(params.userId, pushPayload).catch((error) => {
          console.error('Error sending push notification:', error);
        });
      }
    });
  } catch (error) {
    console.error('Error processing notifications:', error);
    // Don't fail the notification creation if emails/push fail
  }

  return createdNotifications;
}

// Notification templates for consistent messaging
export const NotificationTemplates = {
  budgetAlert: (category: string, percentageUsed: number) => ({
    title: 'Budget Alert',
    message: `Your ${category} budget is at ${percentageUsed}% capacity. Consider reviewing your spending.`,
  }),
  budgetLimitReached: (category: string) => ({
    title: 'Budget Limit Reached',
    message: `Your ${category} budget limit has been reached. Please review your expenses.`,
  }),
};

// Helper function to send push notifications to a user
async function sendPushNotificationsToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    // Get active push tokens for this user
    const tokens = await db.query.pushTokens.findMany({
      where: and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.isActive, true)
      ),
    });

    if (tokens.length === 0) {
      return; // No push subscriptions for this user
    }

    // Parse stored subscription JSON strings
    const subscriptions = tokens.map((token) => JSON.parse(token.token));

    // Send push notifications
    const result = await sendPushNotificationToMultiple(subscriptions, payload);

    // Clean up expired subscriptions
    if (result.expiredSubscriptions.length > 0) {
      const expiredTokenStrings = result.expiredSubscriptions.map((sub) =>
        JSON.stringify(sub)
      );

      await db
        .delete(pushTokens)
        .where(inArray(pushTokens.token, expiredTokenStrings));

      console.log(
        `Cleaned up ${result.expiredSubscriptions.length} expired push subscriptions for user ${userId}`
      );
    }
  } catch (error) {
    console.error('Error sending push notifications to user:', error);
    // Don't fail the notification creation if push fails
  }
}

// Helper function to create push notification payload from notification
function createPushPayload(
  type: NotificationType,
  title: string,
  message: string,
  relatedTaskId?: string,
  relatedUserId?: string
): PushNotificationPayload {
  const basePayload = {
    title,
    body: message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    timestamp: Date.now(),
    requireInteraction: false,
  };

  // Add type-specific data and deep linking
  switch (type) {
    case 'task_assigned':
    case 'task_completed':
    case 'all_tasks_complete':
      return {
        ...basePayload,
        data: {
          type: 'task',
          taskId: relatedTaskId,
          userId: relatedUserId,
        },
        url: relatedTaskId ? `/tasks?id=${relatedTaskId}` : '/tasks',
        tag: relatedTaskId ? `task-${relatedTaskId}` : 'tasks',
        requireInteraction: type === 'task_assigned',
      };

    case 'event_created':
    case 'event_reminder':
      return {
        ...basePayload,
        data: {
          type: 'calendar',
        },
        url: '/calendar',
        tag: 'calendar',
        requireInteraction: type === 'event_reminder',
      };

    case 'shopping_list_created':
    case 'shopping_list_updated':
      return {
        ...basePayload,
        data: {
          type: 'shopping',
        },
        url: '/shopping',
        tag: 'shopping',
      };

    case 'budget_alert':
    case 'budget_limit_reached':
      return {
        ...basePayload,
        data: {
          type: 'budget',
        },
        url: '/budget',
        tag: 'budget',
        requireInteraction: type === 'budget_limit_reached',
      };

    case 'family_member_joined':
      return {
        ...basePayload,
        data: {
          type: 'family',
          userId: relatedUserId,
        },
        url: '/family',
        tag: 'family',
      };

    case 'recipe_shared':
      return {
        ...basePayload,
        data: {
          type: 'recipe',
        },
        url: '/recipes',
        tag: 'recipes',
      };

    default:
      return {
        ...basePayload,
        data: {
          type: 'general',
        },
        url: '/',
        tag: 'general',
      };
  }
}
