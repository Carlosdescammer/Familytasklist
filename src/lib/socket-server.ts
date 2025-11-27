/**
 * Socket.IO Server Configuration
 *
 * This module initializes and configures the Socket.IO server for real-time
 * collaboration features in the FamilyList application.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  UserPresence,
  ActivityEvent,
} from '@/types/realtime';

// Global socket.io server instance
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

// Store family rooms and online users
const familyRooms = new Map<string, Set<string>>(); // familyId -> Set of socketIds
const userSockets = new Map<string, string>(); // userId -> socketId
const socketUsers = new Map<string, UserPresence>(); // socketId -> UserPresence
const userHeartbeats = new Map<string, NodeJS.Timeout>(); // userId -> timeout

/**
 * Initialize Socket.IO server
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
    addTrailingSlash: false,
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Handle family room joining
    socket.on('connection:join-family', (data) => {
      const { familyId, userId, userName } = data;

      // Join the family room
      socket.join(`family:${familyId}`);

      // Store user presence
      const userPresence: UserPresence = {
        userId,
        userName,
        userEmail: '', // Would be filled from database if needed
        status: 'online',
        lastSeen: new Date(),
        socketId: socket.id,
      };

      socketUsers.set(socket.id, userPresence);
      userSockets.set(userId, socket.id);

      // Add to family room tracking
      if (!familyRooms.has(familyId)) {
        familyRooms.set(familyId, new Set());
      }
      familyRooms.get(familyId)?.add(socket.id);

      // Setup heartbeat monitoring
      setupHeartbeat(userId);

      // Notify others in the family
      socket.to(`family:${familyId}`).emit('presence:user-joined', userPresence);

      // Send list of online users to the newly joined user
      const onlineUsers = getOnlineUsersInFamily(familyId);
      socket.emit('presence:online-users', { users: onlineUsers });

      // Emit connection established
      socket.emit('connection:established', { socketId: socket.id, userId });

      console.log(`[Socket.IO] User ${userName} (${userId}) joined family ${familyId}`);
    });

    // Handle family room leaving
    socket.on('connection:leave-family', (data) => {
      const { familyId, userId } = data;
      handleUserLeave(socket.id, familyId, userId);
    });

    // Handle presence status updates
    socket.on('presence:update-status', (status) => {
      const userPresence = socketUsers.get(socket.id);
      if (userPresence) {
        userPresence.status = status;
        userPresence.lastSeen = new Date();
        socketUsers.set(socket.id, userPresence);

        // Broadcast status change to family
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
          if (room.startsWith('family:')) {
            socket.to(room).emit('presence:status-changed', {
              userId: userPresence.userId,
              status,
            });
          }
        });
      }
    });

    // Handle heartbeat
    socket.on('presence:heartbeat', () => {
      const userPresence = socketUsers.get(socket.id);
      if (userPresence) {
        userPresence.lastSeen = new Date();
        socketUsers.set(socket.id, userPresence);
        setupHeartbeat(userPresence.userId);
      }
    });

    // Handle request for online users
    socket.on('request:online-users', (familyId) => {
      const onlineUsers = getOnlineUsersInFamily(familyId);
      socket.emit('presence:online-users', { users: onlineUsers });
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      const userPresence = socketUsers.get(socket.id);
      if (userPresence) {
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
          if (room.startsWith('family:')) {
            socket.to(room).emit('typing:start', {
              userId: userPresence.userId,
              userName: userPresence.userName || 'Someone',
              location: data.location,
            });
          }
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const userPresence = socketUsers.get(socket.id);
      if (userPresence) {
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
          if (room.startsWith('family:')) {
            socket.to(room).emit('typing:stop', {
              userId: userPresence.userId,
              location: data.location,
            });
          }
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      handleDisconnect(socket.id);
    });
  });

  console.log('[Socket.IO] Server initialized');
  return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Get Socket.IO server instance (alias for getSocketServer)
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit event to a specific family room
 */
export function emitToFamily<K extends keyof ServerToClientEvents>(
  familyId: string,
  event: K,
  data: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return;
  }

  // @ts-expect-error - Socket.IO type inference limitation with generic events
  io.to(`family:${familyId}`).emit(event, data);
  console.log(`[Socket.IO] Emitted ${event} to family ${familyId}`);
}

/**
 * Emit event to a specific user
 */
export function emitToUser<K extends keyof ServerToClientEvents>(
  userId: string,
  event: K,
  data: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return;
  }

  const socketId = userSockets.get(userId);
  if (socketId) {
    // @ts-expect-error - Socket.IO type inference limitation with generic events
    io.to(socketId).emit(event, data);
    console.log(`[Socket.IO] Emitted ${event} to user ${userId}`);
  }
}

/**
 * Broadcast activity to family
 */
export function broadcastActivity(familyId: string, activity: ActivityEvent): void {
  emitToFamily(familyId, 'activity:new', activity);
}

/**
 * Get online users in a family
 */
export function getOnlineUsersInFamily(familyId: string): UserPresence[] {
  const roomSockets = familyRooms.get(familyId);
  if (!roomSockets) {
    return [];
  }

  const users: UserPresence[] = [];
  roomSockets.forEach((socketId) => {
    const userPresence = socketUsers.get(socketId);
    if (userPresence && userPresence.status !== 'offline') {
      users.push(userPresence);
    }
  });

  return users;
}

/**
 * Setup heartbeat monitoring for a user
 */
function setupHeartbeat(userId: string): void {
  // Clear existing timeout
  const existingTimeout = userHeartbeats.get(userId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout (mark as away after 5 minutes of no heartbeat)
  const timeout = setTimeout(() => {
    const socketId = userSockets.get(userId);
    if (socketId) {
      const userPresence = socketUsers.get(socketId);
      if (userPresence && userPresence.status === 'online') {
        userPresence.status = 'away';
        userPresence.lastSeen = new Date();
        socketUsers.set(socketId, userPresence);

        // Broadcast status change
        io?.to(socketId).emit('presence:status-changed', {
          userId: userPresence.userId,
          status: 'away',
        });
      }
    }
  }, 5 * 60 * 1000); // 5 minutes

  userHeartbeats.set(userId, timeout);
}

/**
 * Handle user leaving a family room
 */
function handleUserLeave(socketId: string, familyId: string, userId: string): void {
  const userPresence = socketUsers.get(socketId);

  // Remove from family room
  const roomSockets = familyRooms.get(familyId);
  if (roomSockets) {
    roomSockets.delete(socketId);
  }

  // Notify others
  if (userPresence && io) {
    io.to(`family:${familyId}`).emit('presence:user-left', {
      userId: userPresence.userId,
      userName: userPresence.userName || 'User',
    });
  }

  // Clean up heartbeat
  const heartbeatTimeout = userHeartbeats.get(userId);
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    userHeartbeats.delete(userId);
  }

  console.log(`[Socket.IO] User ${userId} left family ${familyId}`);
}

/**
 * Handle socket disconnection
 */
function handleDisconnect(socketId: string): void {
  const userPresence = socketUsers.get(socketId);

  if (userPresence) {
    // Notify all family rooms this user was in
    familyRooms.forEach((roomSockets, familyId) => {
      if (roomSockets.has(socketId)) {
        roomSockets.delete(socketId);
        io?.to(`family:${familyId}`).emit('presence:user-left', {
          userId: userPresence.userId,
          userName: userPresence.userName || 'User',
        });
      }
    });

    // Clean up
    userSockets.delete(userPresence.userId);
    socketUsers.delete(socketId);

    const heartbeatTimeout = userHeartbeats.get(userPresence.userId);
    if (heartbeatTimeout) {
      clearTimeout(heartbeatTimeout);
      userHeartbeats.delete(userPresence.userId);
    }
  }
}

/**
 * Cleanup function
 */
export function cleanupSocketServer(): void {
  if (io) {
    io.close();
    io = null;
  }

  familyRooms.clear();
  userSockets.clear();
  socketUsers.clear();
  userHeartbeats.forEach((timeout) => clearTimeout(timeout));
  userHeartbeats.clear();

  console.log('[Socket.IO] Server cleaned up');
}
