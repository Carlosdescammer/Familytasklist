/**
 * Socket.IO Client Utilities
 *
 * This module provides client-side Socket.IO connection management
 * and utilities for real-time features.
 */

import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RealtimeConfig,
  SocketEventCallback,
} from '@/types/realtime';

// Global socket instance
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

// Connection configuration
let currentConfig: RealtimeConfig | null = null;

// Event listeners registry
const eventListeners = new Map<string, Set<SocketEventCallback>>();

/**
 * Initialize Socket.IO client connection
 */
export function initSocketClient(config: RealtimeConfig): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket?.connected && currentConfig?.familyId === config.familyId) {
    return socket;
  }

  // Disconnect existing socket if config changed
  if (socket) {
    disconnectSocket();
  }

  currentConfig = config;

  const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  socket = io(socketUrl, {
    path: '/api/socket',
    autoConnect: config.autoConnect !== false,
    reconnection: config.reconnection !== false,
    reconnectionDelay: config.reconnectionDelay || 1000,
    reconnectionAttempts: config.reconnectionAttempts || 10,
    transports: ['websocket', 'polling'],
  });

  // Setup connection event handlers
  setupConnectionHandlers(config);

  // Auto-connect if enabled
  if (config.autoConnect !== false) {
    socket.connect();
  }

  console.log('[Socket.IO Client] Initialized');
  return socket;
}

/**
 * Setup connection event handlers
 */
function setupConnectionHandlers(config: RealtimeConfig): void {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('[Socket.IO Client] Connected:', socket?.id);

    // Join family room
    if (config.familyId && config.userId) {
      joinFamily(config.familyId, config.userId, config.userName);
    }

    // Setup heartbeat interval (every 2 minutes)
    const heartbeatInterval = setInterval(() => {
      if (socket?.connected) {
        socket.emit('presence:heartbeat');
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 2 * 60 * 1000);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO Client] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket.IO Client] Connection error:', error);
  });

  socket.on('connection:established', (data) => {
    console.log('[Socket.IO Client] Connection established:', data);
  });

  socket.on('connection:error', (error) => {
    console.error('[Socket.IO Client] Connection error:', error);
  });

  // Re-attach event listeners
  reattachEventListeners();
}

/**
 * Re-attach event listeners after reconnection
 */
function reattachEventListeners(): void {
  if (!socket) return;

  eventListeners.forEach((callbacks, event) => {
    callbacks.forEach((callback) => {
      socket!.on(event as any, callback);
    });
  });
}

/**
 * Get Socket.IO client instance
 */
export function getSocketClient(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}

/**
 * Get Socket.IO client instance (alias for getSocketClient)
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}

/**
 * Join a family room
 */
export function joinFamily(familyId: string, userId: string, userName: string): void {
  if (!socket) {
    console.warn('[Socket.IO Client] Socket not initialized');
    return;
  }

  socket.emit('connection:join-family', { familyId, userId, userName });
  console.log('[Socket.IO Client] Joined family room:', familyId);
}

/**
 * Leave a family room
 */
export function leaveFamily(familyId: string, userId: string): void {
  if (!socket) {
    console.warn('[Socket.IO Client] Socket not initialized');
    return;
  }

  socket.emit('connection:leave-family', { familyId, userId });
  console.log('[Socket.IO Client] Left family room:', familyId);
}

/**
 * Subscribe to an event
 */
export function on<K extends keyof ServerToClientEvents>(
  event: K,
  callback: SocketEventCallback<Parameters<ServerToClientEvents[K]>[0]>
): () => void {
  if (!socket) {
    console.warn('[Socket.IO Client] Socket not initialized');
    return () => {};
  }

  // Add to registry
  if (!eventListeners.has(event as string)) {
    eventListeners.set(event as string, new Set());
  }
  eventListeners.get(event as string)!.add(callback);

  // Attach listener
  socket.on(event as any, callback);

  console.log('[Socket.IO Client] Subscribed to:', event);

  // Return unsubscribe function
  return () => {
    off(event, callback);
  };
}

/**
 * Unsubscribe from an event
 */
export function off<K extends keyof ServerToClientEvents>(
  event: K,
  callback: SocketEventCallback
): void {
  if (!socket) return;

  socket.off(event as any, callback);

  // Remove from registry
  const callbacks = eventListeners.get(event as string);
  if (callbacks) {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      eventListeners.delete(event as string);
    }
  }

  console.log('[Socket.IO Client] Unsubscribed from:', event);
}

/**
 * Emit an event to the server
 */
export function emit<K extends keyof ClientToServerEvents>(
  event: K,
  data?: Parameters<ClientToServerEvents[K]>[0]
): void {
  if (!socket) {
    console.warn('[Socket.IO Client] Socket not initialized');
    return;
  }

  if (!socket.connected) {
    console.warn('[Socket.IO Client] Socket not connected');
    return;
  }

  if (data !== undefined) {
    // @ts-expect-error - Socket.IO type inference limitation with generic events
    socket.emit(event, data);
  } else {
    // @ts-expect-error - Socket.IO type inference limitation with generic events
    socket.emit(event);
  }
  console.log('[Socket.IO Client] Emitted:', event);
}

/**
 * Update presence status
 */
export function updatePresenceStatus(status: 'online' | 'away' | 'offline'): void {
  emit('presence:update-status', status);
}

/**
 * Send heartbeat
 */
export function sendHeartbeat(): void {
  emit('presence:heartbeat');
}

/**
 * Request online users
 */
export function requestOnlineUsers(familyId: string): void {
  emit('request:online-users', familyId);
}

/**
 * Start typing indicator
 */
export function startTyping(location: string): void {
  emit('typing:start', { location });
}

/**
 * Stop typing indicator
 */
export function stopTyping(location: string): void {
  emit('typing:stop', { location });
}

/**
 * Connect socket
 */
export function connectSocket(): void {
  if (!socket) {
    console.warn('[Socket.IO Client] Socket not initialized');
    return;
  }

  if (!socket.connected) {
    socket.connect();
    console.log('[Socket.IO Client] Connecting...');
  }
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (!socket) return;

  // Leave family room before disconnecting
  if (currentConfig?.familyId && currentConfig?.userId) {
    leaveFamily(currentConfig.familyId, currentConfig.userId);
  }

  socket.disconnect();
  socket = null;
  currentConfig = null;
  eventListeners.clear();

  console.log('[Socket.IO Client] Disconnected');
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Get current configuration
 */
export function getCurrentConfig(): RealtimeConfig | null {
  return currentConfig;
}

/**
 * Reconnect socket
 */
export function reconnectSocket(): void {
  if (!socket) {
    console.warn('[Socket.IO Client] Socket not initialized');
    return;
  }

  if (socket.connected) {
    socket.disconnect();
  }

  setTimeout(() => {
    socket?.connect();
  }, 100);

  console.log('[Socket.IO Client] Reconnecting...');
}
