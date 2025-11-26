// Badging API utilities for showing notification counts on app icon
// Supports both App Badge API and setAppBadge

export interface BadgeOptions {
  count?: number;
  clear?: boolean;
}

// Check if Badging API is supported
export function isBadgingSupported(): boolean {
  return 'setAppBadge' in navigator || 'clearAppBadge' in navigator;
}

// Set the app badge with a count
export async function setAppBadge(count?: number): Promise<boolean> {
  if (!isBadgingSupported()) {
    console.warn('Badging API is not supported in this browser');
    return false;
  }

  try {
    if ('setAppBadge' in navigator) {
      await (navigator as any).setAppBadge(count);
      console.log(`App badge set to: ${count ?? 'flag'}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting app badge:', error);
    return false;
  }
}

// Clear the app badge
export async function clearAppBadge(): Promise<boolean> {
  if (!isBadgingSupported()) {
    return false;
  }

  try {
    if ('clearAppBadge' in navigator) {
      await (navigator as any).clearAppBadge();
      console.log('App badge cleared');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clearing app badge:', error);
    return false;
  }
}

// Update badge based on pending counts
export async function updateBadgeFromCounts(counts: {
  tasks?: number;
  notifications?: number;
  messages?: number;
  pending?: number;
}): Promise<boolean> {
  const totalCount =
    (counts.tasks || 0) +
    (counts.notifications || 0) +
    (counts.messages || 0) +
    (counts.pending || 0);

  if (totalCount === 0) {
    return clearAppBadge();
  }

  return setAppBadge(totalCount);
}

// Badge manager class for advanced badge management
export class BadgeManager {
  private counts: Map<string, number> = new Map();

  // Set count for a specific category
  setCount(category: string, count: number): void {
    this.counts.set(category, Math.max(0, count));
    this.updateBadge();
  }

  // Increment count for a category
  increment(category: string, amount: number = 1): void {
    const current = this.counts.get(category) || 0;
    this.counts.set(category, current + amount);
    this.updateBadge();
  }

  // Decrement count for a category
  decrement(category: string, amount: number = 1): void {
    const current = this.counts.get(category) || 0;
    this.counts.set(category, Math.max(0, current - amount));
    this.updateBadge();
  }

  // Clear count for a category
  clearCategory(category: string): void {
    this.counts.delete(category);
    this.updateBadge();
  }

  // Clear all counts
  clearAll(): void {
    this.counts.clear();
    clearAppBadge();
  }

  // Get total count across all categories
  getTotalCount(): number {
    let total = 0;
    this.counts.forEach((count) => {
      total += count;
    });
    return total;
  }

  // Get count for a specific category
  getCount(category: string): number {
    return this.counts.get(category) || 0;
  }

  // Update the app badge with total count
  private updateBadge(): void {
    const total = this.getTotalCount();
    if (total === 0) {
      clearAppBadge();
    } else {
      setAppBadge(total);
    }
  }

  // Get all category counts
  getAllCounts(): Record<string, number> {
    const result: Record<string, number> = {};
    this.counts.forEach((count, category) => {
      result[category] = count;
    });
    return result;
  }
}

// Global badge manager instance
export const badgeManager = new BadgeManager();

// Helper functions for common badge operations
export async function setBadgeForUnreadTasks(count: number): Promise<boolean> {
  badgeManager.setCount('tasks', count);
  return true;
}

export async function setBadgeForNotifications(count: number): Promise<boolean> {
  badgeManager.setCount('notifications', count);
  return true;
}

export async function setBadgeForMessages(count: number): Promise<boolean> {
  badgeManager.setCount('messages', count);
  return true;
}

export async function setBadgeForPendingSync(count: number): Promise<boolean> {
  badgeManager.setCount('pending', count);
  return true;
}

// Clear all badges
export async function clearAllBadges(): Promise<boolean> {
  badgeManager.clearAll();
  return true;
}

// Get current badge count
export function getCurrentBadgeCount(): number {
  return badgeManager.getTotalCount();
}
