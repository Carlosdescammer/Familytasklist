import { db } from '@/lib/db';
import { notifications } from '@/db/schema';

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
