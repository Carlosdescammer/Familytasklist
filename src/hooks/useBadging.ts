// React hooks for managing app badges
import { useEffect, useCallback, useState } from 'react';
import {
  isBadgingSupported,
  setAppBadge,
  clearAppBadge,
  badgeManager,
  setBadgeForUnreadTasks,
  setBadgeForNotifications,
  setBadgeForPendingSync,
} from '@/lib/badging';

// Hook to check if badging is supported
export function useIsBadgingSupported(): boolean {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isBadgingSupported());
  }, []);

  return isSupported;
}

// Hook to manage app badge
export function useAppBadge() {
  const isSupported = useIsBadgingSupported();

  const setBadge = useCallback(
    async (count?: number) => {
      if (!isSupported) return false;
      return setAppBadge(count);
    },
    [isSupported]
  );

  const clearBadge = useCallback(async () => {
    if (!isSupported) return false;
    return clearAppBadge();
  }, [isSupported]);

  return {
    isSupported,
    setBadge,
    clearBadge,
  };
}

// Hook to manage badge counts by category
export function useBadgeManager() {
  const isSupported = useIsBadgingSupported();
  const [totalCount, setTotalCount] = useState(0);

  // Update total count whenever badge manager changes
  const updateTotal = useCallback(() => {
    setTotalCount(badgeManager.getTotalCount());
  }, []);

  const setCount = useCallback(
    (category: string, count: number) => {
      if (!isSupported) return;
      badgeManager.setCount(category, count);
      updateTotal();
    },
    [isSupported, updateTotal]
  );

  const increment = useCallback(
    (category: string, amount: number = 1) => {
      if (!isSupported) return;
      badgeManager.increment(category, amount);
      updateTotal();
    },
    [isSupported, updateTotal]
  );

  const decrement = useCallback(
    (category: string, amount: number = 1) => {
      if (!isSupported) return;
      badgeManager.decrement(category, amount);
      updateTotal();
    },
    [isSupported, updateTotal]
  );

  const clearCategory = useCallback(
    (category: string) => {
      if (!isSupported) return;
      badgeManager.clearCategory(category);
      updateTotal();
    },
    [isSupported, updateTotal]
  );

  const clearAll = useCallback(() => {
    if (!isSupported) return;
    badgeManager.clearAll();
    updateTotal();
  }, [isSupported, updateTotal]);

  const getCount = useCallback(
    (category: string): number => {
      return badgeManager.getCount(category);
    },
    []
  );

  const getAllCounts = useCallback((): Record<string, number> => {
    return badgeManager.getAllCounts();
  }, []);

  return {
    isSupported,
    totalCount,
    setCount,
    increment,
    decrement,
    clearCategory,
    clearAll,
    getCount,
    getAllCounts,
  };
}

// Hook to automatically update badge based on unread tasks
export function useTasksBadge(unreadCount: number) {
  const isSupported = useIsBadgingSupported();

  useEffect(() => {
    if (isSupported) {
      setBadgeForUnreadTasks(unreadCount);
    }
  }, [isSupported, unreadCount]);
}

// Hook to automatically update badge based on notifications
export function useNotificationsBadge(notificationCount: number) {
  const isSupported = useIsBadgingSupported();

  useEffect(() => {
    if (isSupported) {
      setBadgeForNotifications(notificationCount);
    }
  }, [isSupported, notificationCount]);
}

// Hook to automatically update badge based on pending sync items
export function usePendingSyncBadge(pendingCount: number) {
  const isSupported = useIsBadgingSupported();

  useEffect(() => {
    if (isSupported) {
      setBadgeForPendingSync(pendingCount);
    }
  }, [isSupported, pendingCount]);
}

// Combined hook to manage all badge categories automatically
export function useAutoBadge(counts: {
  tasks?: number;
  notifications?: number;
  messages?: number;
  pending?: number;
}) {
  const { isSupported, setCount } = useBadgeManager();

  useEffect(() => {
    if (!isSupported) return;

    if (counts.tasks !== undefined) {
      setCount('tasks', counts.tasks);
    }
    if (counts.notifications !== undefined) {
      setCount('notifications', counts.notifications);
    }
    if (counts.messages !== undefined) {
      setCount('messages', counts.messages);
    }
    if (counts.pending !== undefined) {
      setCount('pending', counts.pending);
    }
  }, [
    isSupported,
    setCount,
    counts.tasks,
    counts.notifications,
    counts.messages,
    counts.pending,
  ]);

  return {
    isSupported,
    totalCount: badgeManager.getTotalCount(),
  };
}

// Hook to clear badge on component mount (useful for pages)
export function useClearBadgeOnMount() {
  const { clearBadge } = useAppBadge();

  useEffect(() => {
    clearBadge();
  }, [clearBadge]);
}

// Hook to update badge when page visibility changes
export function useBadgeOnVisibilityChange(
  updateFn: () => void,
  clearOnVisible: boolean = false
) {
  const { clearBadge } = useAppBadge();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, update badge
        updateFn();
      } else if (clearOnVisible) {
        // Page is visible, clear badge
        clearBadge();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateFn, clearBadge, clearOnVisible]);
}
