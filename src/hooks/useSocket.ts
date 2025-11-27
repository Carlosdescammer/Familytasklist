/**
 * useSocket Hook
 *
 * React hook for managing Socket.IO connections
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { initSocketClient, disconnectSocket, getSocket } from '@/lib/socket-client';
import type {
  RealtimeConfig,
  UseSocketReturn,
  SocketEventCallback
} from '@/types/realtime';

export function useSocket(config: RealtimeConfig | null): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!config) {
      return;
    }

    try {
      // Initialize socket connection
      const socket = initSocketClient(config);
      socketRef.current = socket;

      // Set up connection event handlers
      socket.on('connect', () => {
        console.log('[useSocket] Connected to Socket.IO server');
        setConnected(true);
        setError(null);

        // Join family room
        socket.emit('connection:join-family', {
          familyId: config.familyId,
          userId: config.userId,
          userName: config.userName,
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('[useSocket] Disconnected from Socket.IO server:', reason);
        setConnected(false);

        // Auto-reconnect on unexpected disconnects
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          reconnectTimeoutRef.current = setTimeout(() => {
            socket.connect();
          }, 1000);
        }
      });

      socket.on('connect_error', (err) => {
        console.error('[useSocket] Connection error:', err);
        setError(err);
        setConnected(false);
      });

      socket.on('connection:error', (data) => {
        console.error('[useSocket] Socket connection error:', data.message);
        setError(new Error(data.message));
      });

      socket.on('connection:established', (data) => {
        console.log('[useSocket] Connection established:', data);
      });

      // Connect if autoConnect is enabled
      if (config.autoConnect !== false) {
        socket.connect();
      }

      return () => {
        // Clean up on unmount
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Leave family room before disconnecting
        if (socket.connected) {
          socket.emit('connection:leave-family', {
            familyId: config.familyId,
            userId: config.userId,
          });
        }

        disconnectSocket();
        setConnected(false);
      };
    } catch (err) {
      console.error('[useSocket] Failed to initialize socket:', err);
      setError(err as Error);
      return;
    }
  }, [config]);

  const emit = useCallback((event: string, data?: any) => {
    const socket = getSocket();
    if (socket && socket.connected) {
      (socket as any).emit(event, data);
    } else {
      console.warn('[useSocket] Cannot emit event - socket not connected');
    }
  }, []);

  return {
    socket: socketRef.current,
    connected,
    error,
    emit,
  };
}

/**
 * useSocketEvent Hook
 *
 * Subscribe to a specific Socket.IO event
 */
export function useSocketEvent<T = any>(
  event: string,
  callback: SocketEventCallback<T>
): void {
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const eventHandler = (data: T) => {
      callbackRef.current(data);
    };

    (socket as any).on(event, eventHandler);

    return () => {
      (socket as any).off(event, eventHandler);
    };
  }, [event]);
}
