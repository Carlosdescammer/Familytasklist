'use client';

import { useEffect, useState, useCallback } from 'react';
import { syncQueue, queueRequest, registerSync } from '@/lib/sync-queue';

export interface OfflineQueueStatus {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
}

/**
 * Hook to manage offline queue and sync status
 */
export function useOfflineQueue(): OfflineQueueStatus {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const updatePendingCount = useCallback(async () => {
    try {
      const requests = await syncQueue.getAllRequests();
      setPendingCount(requests.length);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  }, []);

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    // Initial fetch
    updatePendingCount();

    // Handle online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events from service worker
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'SYNC_START') {
          setIsSyncing(true);
        } else if (event.data.type === 'SYNC_COMPLETE') {
          setIsSyncing(false);
          updatePendingCount();
        } else if (event.data.type === 'SYNC_FAILED') {
          setIsSyncing(false);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updatePendingCount]);

  return {
    pendingCount,
    isOnline,
    isSyncing,
  };
}

/**
 * Hook to wrap fetch requests with offline queue support
 */
export function useOfflineFetch() {
  const { isOnline } = useOfflineQueue();

  const offlineFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      try {
        // Try to make the request
        const response = await fetch(url, options);

        // If successful, return the response
        if (response.ok) {
          return response;
        }

        // If failed and offline, queue the request
        if (!navigator.onLine) {
          throw new Error('offline');
        }

        return response;
      } catch (error) {
        // If offline or network error, queue the request
        if (!navigator.onLine || (error as Error).message === 'offline') {
          // Only queue mutation requests (POST, PUT, PATCH, DELETE)
          if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
            await queueRequest(url, options);
            await registerSync('sync-requests');

            // Return a pseudo-success response
            return new Response(
              JSON.stringify({
                queued: true,
                message: 'Request queued for sync when online'
              }),
              {
                status: 202, // Accepted
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        }

        throw error;
      }
    },
    [isOnline]
  );

  return offlineFetch;
}

/**
 * Hook to manually trigger background sync
 */
export function useBackgroundSync() {
  const triggerSync = useCallback(async () => {
    try {
      await registerSync('sync-requests');
      console.log('Background sync triggered');
    } catch (error) {
      console.error('Failed to trigger background sync:', error);
    }
  }, []);

  return { triggerSync };
}

/**
 * Hook to clear all pending requests
 */
export function useClearQueue() {
  const clearQueue = useCallback(async () => {
    try {
      await syncQueue.clearAll();
      console.log('Queue cleared');
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }, []);

  return { clearQueue };
}
