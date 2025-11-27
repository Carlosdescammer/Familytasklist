/**
 * RealtimeProvider Component
 *
 * Initializes Socket.IO connection and provides real-time functionality
 * to the application
 */

'use client';

import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { usePresence } from '@/hooks/usePresence';
import type { RealtimeConfig } from '@/types/realtime';

interface RealtimeProviderProps {
  config: RealtimeConfig | null;
  children?: React.ReactNode;
}

export function RealtimeProvider({ config, children }: RealtimeProviderProps) {
  // Initialize Socket.IO connection
  const { connected, error } = useSocket(config);

  // Initialize presence tracking
  const { status } = usePresence();

  // Log connection status for debugging
  useEffect(() => {
    if (connected) {
      console.log('[RealtimeProvider] Connected to real-time server');
    } else if (error) {
      console.error('[RealtimeProvider] Connection error:', error);
    }
  }, [connected, error]);

  // Log presence status for debugging
  useEffect(() => {
    console.log('[RealtimeProvider] Presence status:', status);
  }, [status]);

  // This component doesn't render anything visible
  // It just manages the Socket.IO connection
  return <>{children}</>;
}
