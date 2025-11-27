/**
 * useRealtimeSync Hook
 *
 * React hook for syncing data in real-time with Socket.IO
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocketEvent } from './useSocket';
import type { UseRealtimeSyncReturn } from '@/types/realtime';

interface RealtimeSyncOptions<T> {
  /**
   * Initial data
   */
  initialData?: T | null;

  /**
   * Function to fetch fresh data from the server
   */
  fetchData: () => Promise<T>;

  /**
   * Socket.IO events to listen to for updates
   */
  syncEvents: string[];

  /**
   * Optional transform function for incoming event data
   */
  transformEventData?: (eventData: any) => Partial<T> | null;

  /**
   * Whether to fetch data on mount
   */
  fetchOnMount?: boolean;
}

export function useRealtimeSync<T>(
  options: RealtimeSyncOptions<T>
): UseRealtimeSyncReturn<T> {
  const {
    initialData = null,
    fetchData,
    syncEvents,
    transformEventData,
    fetchOnMount = true,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  // Fetch data function
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const freshData = await fetchData();
      if (isMountedRef.current) {
        setData(freshData);
        setLoading(false);
      }
    } catch (err) {
      console.error('[useRealtimeSync] Error fetching data:', err);
      if (isMountedRef.current) {
        setError(err as Error);
        setLoading(false);
      }
    }
  }, [fetchData]);

  // Fetch on mount
  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOnMount, refetch]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback(
    (eventData: any) => {
      if (!transformEventData) {
        // No transform function, refetch all data
        refetch();
        return;
      }

      // Try to transform and merge event data
      const transformedData = transformEventData(eventData);
      if (transformedData) {
        setData((prevData) => {
          if (!prevData) return prevData;
          return { ...prevData, ...transformedData };
        });
      } else {
        // If transform returns null, refetch all data
        refetch();
      }
    },
    [transformEventData, refetch]
  );

  // Subscribe to sync events
  syncEvents.forEach((event) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSocketEvent(event, handleRealtimeUpdate);
  });

  return {
    data,
    loading,
    error,
    refetch,
  };
}
