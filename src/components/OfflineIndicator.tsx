'use client';

import { useEffect, useState } from 'react';
import { Alert, Transition, Group, Text, Badge, Loader } from '@mantine/core';
import { IconWifiOff, IconCloudCheck, IconCloudX } from '@tabler/icons-react';
import { syncQueue } from '@/lib/sync-queue';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    // Check pending requests
    const checkPendingRequests = async () => {
      try {
        const requests = await syncQueue.getAllRequests();
        setPendingCount(requests.length);
      } catch (error) {
        console.error('Error checking pending requests:', error);
      }
    };

    checkPendingRequests();

    // Update online status
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      // Hide after 3 seconds when back online
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_START') {
          setIsSyncing(true);
        } else if (event.data.type === 'SYNC_COMPLETE') {
          setIsSyncing(false);
          checkPendingRequests();
        } else if (event.data.type === 'SYNC_FAILED') {
          setIsSyncing(false);
        }
      });
    }

    // Poll for pending requests every 30 seconds
    const interval = setInterval(checkPendingRequests, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Show indicator when offline or when there are pending requests
  useEffect(() => {
    if (!isOnline || pendingCount > 0) {
      setShowIndicator(true);
    } else if (isOnline && pendingCount === 0 && !isSyncing) {
      // Auto-hide when back online and synced
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, isSyncing]);

  // Don't render if online and no pending requests
  if (isOnline && pendingCount === 0 && !isSyncing && !showIndicator) {
    return null;
  }

  return (
    <Transition
      mounted={showIndicator}
      transition="slide-down"
      duration={300}
      timingFunction="ease"
    >
      {(styles) => (
        <Alert
          style={styles}
          variant="light"
          color={isOnline ? (isSyncing ? 'blue' : 'green') : 'yellow'}
          title={
            <Group gap="xs">
              {!isOnline ? (
                <>
                  <IconWifiOff size={20} />
                  <Text fw={500}>You are offline</Text>
                </>
              ) : isSyncing ? (
                <>
                  <Loader size="xs" />
                  <Text fw={500}>Syncing changes...</Text>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <IconCloudX size={20} />
                  <Text fw={500}>Pending changes</Text>
                </>
              ) : (
                <>
                  <IconCloudCheck size={20} />
                  <Text fw={500}>Back online</Text>
                </>
              )}
            </Group>
          }
          mb="md"
        >
          <Group gap="sm">
            {!isOnline ? (
              <Text size="sm">
                Changes will be saved locally and synced when you reconnect.
              </Text>
            ) : isSyncing ? (
              <Text size="sm">
                Synchronizing your offline changes with the server...
              </Text>
            ) : pendingCount > 0 ? (
              <Group gap="xs">
                <Text size="sm">
                  You have {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'} waiting to sync.
                </Text>
                <Badge size="sm" variant="light">
                  {pendingCount}
                </Badge>
              </Group>
            ) : (
              <Text size="sm">
                All changes have been synced successfully.
              </Text>
            )}
          </Group>
        </Alert>
      )}
    </Transition>
  );
}
