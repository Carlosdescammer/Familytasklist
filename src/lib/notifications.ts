import { db } from '@/lib/db';
import { notifications, users, families } from '@/db/schema';
import { sendNotificationEmail, shouldSendEmail } from '@/lib/email';
import { eq } from 'drizzle-orm';

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

  // Send email notification if user has email notifications enabled
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

    if (
      user &&
      family &&
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
  } catch (error) {
    console.error('Error processing email notification:', error);
    // Don't fail the notification creation if email fails
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

  // Send email notifications for each notification
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

    // Send emails for each notification
    notificationsList.forEach((params) => {
      const user = usersMap.get(params.userId);
      const family = familiesMap.get(params.familyId);

      if (
        user &&
        family &&
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
    });
  } catch (error) {
    console.error('Error processing email notifications:', error);
    // Don't fail the notification creation if emails fail
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
