// Web Share API utilities for sharing tasks, recipes, and events
// Includes fallback for browsers that don't support Web Share API

export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date?: string;
  location?: string;
}

/**
 * Check if the Web Share API is supported
 */
export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Generic share function with fallback to clipboard
 */
export async function share(data: ShareData): Promise<{ success: boolean; fallback?: boolean }> {
  // Check if Web Share API is supported
  if (isShareSupported()) {
    try {
      await navigator.share(data);
      return { success: true, fallback: false };
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name === 'AbortError') {
        return { success: false, fallback: false };
      }
      // Fall through to fallback
      console.error('Share failed:', error);
    }
  }

  // Fallback: Copy to clipboard
  try {
    const shareText = `${data.title}\n${data.text}${data.url ? `\n${data.url}` : ''}`;
    await navigator.clipboard.writeText(shareText);
    return { success: true, fallback: true };
  } catch (error) {
    console.error('Clipboard fallback failed:', error);
    return { success: false, fallback: false };
  }
}

/**
 * Share a task
 */
export async function shareTask(task: Task): Promise<{ success: boolean; fallback?: boolean }> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const taskUrl = `${baseUrl}/tasks?id=${task.id}`;

  const dueText = task.dueDate
    ? `\nDue: ${new Date(task.dueDate).toLocaleDateString()}`
    : '';

  const descriptionText = task.description
    ? `\n${task.description}`
    : '';

  return share({
    title: `Task: ${task.title}`,
    text: `Check out this task from FamilyList${descriptionText}${dueText}`,
    url: taskUrl,
  });
}

/**
 * Share a recipe
 */
export async function shareRecipe(recipe: Recipe): Promise<{ success: boolean; fallback?: boolean }> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const recipeUrl = `${baseUrl}/recipes?id=${recipe.id}`;

  let recipeText = `Check out this recipe from FamilyList: ${recipe.title}`;

  if (recipe.description) {
    recipeText += `\n${recipe.description}`;
  }

  if (recipe.ingredients && recipe.ingredients.length > 0) {
    recipeText += `\n\nIngredients:\n${recipe.ingredients.slice(0, 5).map(i => `- ${i}`).join('\n')}`;
    if (recipe.ingredients.length > 5) {
      recipeText += `\n... and ${recipe.ingredients.length - 5} more`;
    }
  }

  return share({
    title: `Recipe: ${recipe.title}`,
    text: recipeText,
    url: recipeUrl,
  });
}

/**
 * Share an event
 */
export async function shareEvent(event: Event): Promise<{ success: boolean; fallback?: boolean }> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const eventUrl = `${baseUrl}/calendar?id=${event.id}`;

  const dateText = event.date
    ? `\n${new Date(event.date).toLocaleString()}`
    : '';

  const locationText = event.location
    ? `\nLocation: ${event.location}`
    : '';

  const descriptionText = event.description
    ? `\n${event.description}`
    : '';

  return share({
    title: `Event: ${event.title}`,
    text: `Join this event from FamilyList${dateText}${locationText}${descriptionText}`,
    url: eventUrl,
  });
}

/**
 * Share a shopping list
 */
export async function shareShoppingList(
  listId: string,
  listName: string,
  items: string[]
): Promise<{ success: boolean; fallback?: boolean }> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const listUrl = `${baseUrl}/shopping?id=${listId}`;

  let listText = `Check out this shopping list: ${listName}`;

  if (items && items.length > 0) {
    listText += `\n\nItems:\n${items.slice(0, 10).map(i => `- ${i}`).join('\n')}`;
    if (items.length > 10) {
      listText += `\n... and ${items.length - 10} more items`;
    }
  }

  return share({
    title: `Shopping List: ${listName}`,
    text: listText,
    url: listUrl,
  });
}

/**
 * Share the app itself
 */
export async function shareApp(): Promise<{ success: boolean; fallback?: boolean }> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return share({
    title: 'FamilyList App',
    text: 'Check out FamilyList - the ultimate family organization app for tasks, shopping, events, and more!',
    url: baseUrl,
  });
}
