// Periodic Background Sync API utilities
// Allows the app to periodically sync data in the background

export interface PeriodicSyncOptions {
  minInterval: number; // Minimum interval in milliseconds
}

// Check if Periodic Background Sync is supported
export function isPeriodicSyncSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'periodicSync' in ServiceWorkerRegistration.prototype
  );
}

// Register a periodic sync tag
export async function registerPeriodicSync(
  tag: string,
  options?: PeriodicSyncOptions
): Promise<boolean> {
  if (!isPeriodicSyncSupported()) {
    console.warn('Periodic Background Sync is not supported in this browser');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;

    // Default to syncing every 12 hours (43200000 ms)
    const minInterval = options?.minInterval || 43200000;

    await periodicSync.register(tag, {
      minInterval,
    });

    console.log(`Periodic sync registered: ${tag} (every ${minInterval}ms)`);
    return true;
  } catch (error) {
    console.error('Failed to register periodic sync:', error);
    return false;
  }
}

// Unregister a periodic sync tag
export async function unregisterPeriodicSync(tag: string): Promise<boolean> {
  if (!isPeriodicSyncSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;

    await periodicSync.unregister(tag);

    console.log(`Periodic sync unregistered: ${tag}`);
    return true;
  } catch (error) {
    console.error('Failed to unregister periodic sync:', error);
    return false;
  }
}

// Get all registered periodic sync tags
export async function getPeriodicSyncTags(): Promise<string[]> {
  if (!isPeriodicSyncSupported()) {
    return [];
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;

    const tags = await periodicSync.getTags();
    return tags;
  } catch (error) {
    console.error('Failed to get periodic sync tags:', error);
    return [];
  }
}

// Helper functions for common periodic sync operations
export async function registerTasksSync(
  intervalHours: number = 12
): Promise<boolean> {
  return registerPeriodicSync('sync-tasks', {
    minInterval: intervalHours * 60 * 60 * 1000,
  });
}

export async function registerCalendarSync(
  intervalHours: number = 6
): Promise<boolean> {
  return registerPeriodicSync('sync-calendar', {
    minInterval: intervalHours * 60 * 60 * 1000,
  });
}

export async function registerShoppingSync(
  intervalHours: number = 12
): Promise<boolean> {
  return registerPeriodicSync('sync-shopping', {
    minInterval: intervalHours * 60 * 60 * 1000,
  });
}

export async function registerNotificationsSync(
  intervalHours: number = 1
): Promise<boolean> {
  return registerPeriodicSync('sync-notifications', {
    minInterval: intervalHours * 60 * 60 * 1000,
  });
}

export async function registerAllPeriodicSyncs(): Promise<void> {
  await Promise.all([
    registerTasksSync(12), // Sync tasks every 12 hours
    registerCalendarSync(6), // Sync calendar every 6 hours
    registerShoppingSync(12), // Sync shopping every 12 hours
    registerNotificationsSync(1), // Sync notifications every hour
  ]);
}

export async function unregisterAllPeriodicSyncs(): Promise<void> {
  const tags = await getPeriodicSyncTags();
  await Promise.all(tags.map((tag) => unregisterPeriodicSync(tag)));
}
