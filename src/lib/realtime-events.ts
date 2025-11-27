/**
 * Real-time Event Emitters
 *
 * Helper functions to emit real-time events via Socket.IO
 * Use these in your API routes to notify clients of changes
 */

import { emitToFamily, broadcastActivity } from './socket-server';
import type { Task, ShoppingItem, ShoppingList, Event, Recipe, User } from '@/db/schema';
import type { ActivityEvent } from '@/types/realtime';
import { v4 as uuidv4 } from 'uuid';

/**
 * Emit task created event
 */
export function emitTaskCreated(
  familyId: string,
  task: Task,
  createdByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'task:created', {
    ...task,
    createdByUser,
  });

  // Broadcast activity
  const activity: ActivityEvent = {
    id: uuidv4(),
    type: 'task:created',
    familyId,
    userId: task.assignedTo || createdByUser?.id || '',
    userName: createdByUser?.name || null,
    userEmail: '',
    title: 'New Task Created',
    description: task.title,
    metadata: { taskId: task.id },
    timestamp: new Date(),
  };
  broadcastActivity(familyId, activity);
}

/**
 * Emit task updated event
 */
export function emitTaskUpdated(
  familyId: string,
  task: Task,
  updatedByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'task:updated', {
    ...task,
    updatedByUser,
  });
}

/**
 * Emit task completed event
 */
export function emitTaskCompleted(
  familyId: string,
  task: Task,
  completedByUser: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'task:completed', {
    task,
    completedByUser,
  });

  // Broadcast activity
  const activity: ActivityEvent = {
    id: uuidv4(),
    type: 'task:completed',
    familyId,
    userId: completedByUser.id,
    userName: completedByUser.name,
    userEmail: '',
    title: 'Task Completed',
    description: `${completedByUser.name || 'Someone'} completed: ${task.title}`,
    metadata: { taskId: task.id },
    timestamp: new Date(),
  };
  broadcastActivity(familyId, activity);
}

/**
 * Emit task deleted event
 */
export function emitTaskDeleted(
  familyId: string,
  taskId: string,
  deletedBy: string
) {
  emitToFamily(familyId, 'task:deleted', {
    taskId,
    deletedBy,
  });

  // Broadcast activity
  const activity: ActivityEvent = {
    id: uuidv4(),
    type: 'task:deleted',
    familyId,
    userId: deletedBy,
    userName: null,
    userEmail: '',
    title: 'Task Deleted',
    description: 'A task was deleted',
    metadata: { taskId },
    timestamp: new Date(),
  };
  broadcastActivity(familyId, activity);
}

/**
 * Emit shopping list created event
 */
export function emitShoppingListCreated(
  familyId: string,
  list: ShoppingList,
  createdByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'shopping:list-created', {
    ...list,
    createdByUser,
  });

  // Broadcast activity
  const activity: ActivityEvent = {
    id: uuidv4(),
    type: 'shopping:list-created',
    familyId,
    userId: list.createdBy || createdByUser?.id || '',
    userName: createdByUser?.name || null,
    userEmail: '',
    title: 'New Shopping List',
    description: list.name,
    metadata: { listId: list.id },
    timestamp: new Date(),
  };
  broadcastActivity(familyId, activity);
}

/**
 * Emit shopping list updated event
 */
export function emitShoppingListUpdated(
  familyId: string,
  list: ShoppingList,
  updatedByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'shopping:list-updated', {
    ...list,
    updatedByUser,
  });
}

/**
 * Emit shopping list deleted event
 */
export function emitShoppingListDeleted(
  familyId: string,
  listId: string,
  deletedBy: string
) {
  emitToFamily(familyId, 'shopping:list-deleted', {
    listId,
    deletedBy,
  });
}

/**
 * Emit shopping item added event
 */
export function emitShoppingItemAdded(
  familyId: string,
  item: ShoppingItem,
  addedByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'shopping:item-added', {
    ...item,
    addedByUser,
  });

  // Broadcast activity
  const activity: ActivityEvent = {
    id: uuidv4(),
    type: 'shopping:item-added',
    familyId,
    userId: addedByUser?.id || '',
    userName: addedByUser?.name || null,
    userEmail: '',
    title: 'Shopping Item Added',
    description: item.name,
    metadata: { itemId: item.id, listId: item.listId },
    timestamp: new Date(),
  };
  broadcastActivity(familyId, activity);
}

/**
 * Emit shopping item updated event
 */
export function emitShoppingItemUpdated(
  familyId: string,
  item: ShoppingItem,
  updatedByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'shopping:item-updated', {
    ...item,
    updatedByUser,
  });
}

/**
 * Emit shopping item checked event
 */
export function emitShoppingItemChecked(
  familyId: string,
  itemId: string,
  listId: string,
  completed: boolean,
  checkedByUser: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'shopping:item-checked', {
    itemId,
    listId,
    completed,
    checkedByUser,
  });

  if (completed) {
    // Broadcast activity
    const activity: ActivityEvent = {
      id: uuidv4(),
      type: 'shopping:item-checked',
      familyId,
      userId: checkedByUser.id,
      userName: checkedByUser.name,
      userEmail: '',
      title: 'Item Checked',
      description: `${checkedByUser.name || 'Someone'} checked off an item`,
      metadata: { itemId, listId },
      timestamp: new Date(),
    };
    broadcastActivity(familyId, activity);
  }
}

/**
 * Emit shopping item deleted event
 */
export function emitShoppingItemDeleted(
  familyId: string,
  itemId: string,
  listId: string,
  deletedBy: string
) {
  emitToFamily(familyId, 'shopping:item-deleted', {
    itemId,
    listId,
    deletedBy,
  });
}

/**
 * Emit calendar event created
 */
export function emitCalendarEventCreated(
  familyId: string,
  event: Event,
  createdByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'calendar:event-created', {
    ...event,
    createdByUser,
  });

  // Broadcast activity
  const activity: ActivityEvent = {
    id: uuidv4(),
    type: 'calendar:event-created',
    familyId,
    userId: event.createdBy || createdByUser?.id || '',
    userName: createdByUser?.name || null,
    userEmail: '',
    title: 'New Event',
    description: event.title,
    metadata: { eventId: event.id },
    timestamp: new Date(),
  };
  broadcastActivity(familyId, activity);
}

/**
 * Emit calendar event updated
 */
export function emitCalendarEventUpdated(
  familyId: string,
  event: Event,
  updatedByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'calendar:event-updated', {
    ...event,
    updatedByUser,
  });

  // Broadcast activity
  const activity: ActivityEvent = {
    id: uuidv4(),
    type: 'calendar:event-updated',
    familyId,
    userId: updatedByUser?.id || '',
    userName: updatedByUser?.name || null,
    userEmail: '',
    title: 'Event Updated',
    description: event.title,
    metadata: { eventId: event.id },
    timestamp: new Date(),
  };
  broadcastActivity(familyId, activity);
}

/**
 * Emit calendar event deleted
 */
export function emitCalendarEventDeleted(
  familyId: string,
  eventId: string,
  deletedBy: string
) {
  emitToFamily(familyId, 'calendar:event-deleted', {
    eventId,
    deletedBy,
  });
}

/**
 * Emit recipe created event
 */
export function emitRecipeCreated(
  familyId: string,
  recipe: Recipe,
  createdByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'recipe:created', {
    ...recipe,
    createdByUser,
  });

  // Broadcast activity
  const activity: ActivityEvent = {
    id: uuidv4(),
    type: 'recipe:created',
    familyId,
    userId: recipe.createdBy || createdByUser?.id || '',
    userName: createdByUser?.name || null,
    userEmail: '',
    title: 'New Recipe',
    description: recipe.title,
    metadata: { recipeId: recipe.id },
    timestamp: new Date(),
  };
  broadcastActivity(familyId, activity);
}

/**
 * Emit recipe updated event
 */
export function emitRecipeUpdated(
  familyId: string,
  recipe: Recipe,
  updatedByUser?: { id: string; name: string | null }
) {
  emitToFamily(familyId, 'recipe:updated', {
    ...recipe,
    updatedByUser,
  });
}

/**
 * Emit recipe deleted event
 */
export function emitRecipeDeleted(
  familyId: string,
  recipeId: string,
  deletedBy: string
) {
  emitToFamily(familyId, 'recipe:deleted', {
    recipeId,
    deletedBy,
  });
}

/**
 * Emit recipe favorited event
 */
export function emitRecipeFavorited(
  familyId: string,
  recipeId: string,
  userId: string,
  isFavorite: boolean
) {
  emitToFamily(familyId, 'recipe:favorited', {
    recipeId,
    userId,
    isFavorite,
  });

  if (isFavorite) {
    // Broadcast activity
    const activity: ActivityEvent = {
      id: uuidv4(),
      type: 'recipe:favorited',
      familyId,
      userId,
      userName: null,
      userEmail: '',
      title: 'Recipe Favorited',
      description: 'Someone favorited a recipe',
      metadata: { recipeId },
      timestamp: new Date(),
    };
    broadcastActivity(familyId, activity);
  }
}
