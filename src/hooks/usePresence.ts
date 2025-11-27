/**
 * usePresence Hook
 *
 * React hook for managing user presence status
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { updatePresenceStatus, sendHeartbeat } from '@/lib/socket-client';
import type { UsePresenceReturn } from '@/types/realtime';

export function usePresence(): UsePresenceReturn {
  const [status, setStatus] = useState<'online' | 'away' | 'offline'>('online');

  // Send heartbeat every 2 minutes
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Track user activity to auto-update status
  useEffect(() => {
    let inactivityTimeout: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout);

      // Set status to online if currently away
      if (status === 'away') {
        updateStatus('online');
      }

      // Set to away after 5 minutes of inactivity
      inactivityTimeout = setTimeout(() => {
        updateStatus('away');
      }, 5 * 60 * 1000);
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Initial timer
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimeout);
      events.forEach((event) => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [status, updateStatus]);

  // Update status and emit to server
  const updateStatus = useCallback((newStatus: 'online' | 'away' | 'offline') => {
    setStatus(newStatus);
    updatePresenceStatus(newStatus);
  }, []);

  return {
    status,
    updateStatus,
    sendHeartbeat,
  };
}
