/**
 * Real-time Event Types for Socket.IO
 *
 * This file defines all TypeScript types for Socket.IO events
 * used throughout the FamilyList application for real-time collaboration.
 */

import type { Task, ShoppingItem, ShoppingList, Event, Recipe, User } from '@/db/schema';

// ============================================================================
// Socket Connection Events
// ============================================================================

export interface ServerToClientEvents {
  // Connection events
  'connection:established': (data: { socketId: string; userId: string }) => void;
  'connection:error': (error: { message: string }) => void;

  // Presence events
  'presence:user-joined': (data: UserPresence) => void;
  'presence:user-left': (data: { userId: string; userName: string }) => void;
  'presence:online-users': (data: { users: UserPresence[] }) => void;
  'presence:status-changed': (data: { userId: string; status: 'online' | 'away' | 'offline' }) => void;

  // Task events
  'task:created': (task: Task & { createdByUser?: { id: string; name: string | null } }) => void;
  'task:updated': (task: Task & { updatedByUser?: { id: string; name: string | null } }) => void;
  'task:deleted': (data: { taskId: string; deletedBy: string }) => void;
  'task:completed': (data: { task: Task; completedByUser: { id: string; name: string | null } }) => void;

  // Shopping events
  'shopping:list-created': (list: ShoppingList & { createdByUser?: { id: string; name: string | null } }) => void;
  'shopping:list-updated': (list: ShoppingList & { updatedByUser?: { id: string; name: string | null } }) => void;
  'shopping:list-deleted': (data: { listId: string; deletedBy: string }) => void;
  'shopping:item-added': (item: ShoppingItem & { addedByUser?: { id: string; name: string | null } }) => void;
  'shopping:item-updated': (item: ShoppingItem & { updatedByUser?: { id: string; name: string | null } }) => void;
  'shopping:item-deleted': (data: { itemId: string; listId: string; deletedBy: string }) => void;
  'shopping:item-checked': (data: { itemId: string; listId: string; completed: boolean; checkedByUser: { id: string; name: string | null } }) => void;

  // Calendar events
  'calendar:event-created': (event: Event & { createdByUser?: { id: string; name: string | null } }) => void;
  'calendar:event-updated': (event: Event & { updatedByUser?: { id: string; name: string | null } }) => void;
  'calendar:event-deleted': (data: { eventId: string; deletedBy: string }) => void;

  // Recipe events
  'recipe:created': (recipe: Recipe & { createdByUser?: { id: string; name: string | null } }) => void;
  'recipe:updated': (recipe: Recipe & { updatedByUser?: { id: string; name: string | null } }) => void;
  'recipe:deleted': (data: { recipeId: string; deletedBy: string }) => void;
  'recipe:favorited': (data: { recipeId: string; userId: string; isFavorite: boolean }) => void;

  // Activity events
  'activity:new': (activity: ActivityEvent) => void;

  // Typing indicators
  'typing:start': (data: { userId: string; userName: string; location: string }) => void;
  'typing:stop': (data: { userId: string; location: string }) => void;

  // Encrypted message events
  'message:encrypted': (data: { message: any }) => void;
}

export interface ClientToServerEvents {
  // Connection events
  'connection:join-family': (data: { familyId: string; userId: string; userName: string }) => void;
  'connection:leave-family': (data: { familyId: string; userId: string }) => void;

  // Presence events
  'presence:update-status': (status: 'online' | 'away' | 'offline') => void;
  'presence:heartbeat': () => void;

  // Request current state
  'request:online-users': (familyId: string) => void;

  // Typing indicators
  'typing:start': (data: { location: string }) => void;
  'typing:stop': (data: { location: string }) => void;
}

// ============================================================================
// Data Types
// ============================================================================

export interface UserPresence {
  userId: string;
  userName: string | null;
  userEmail: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  socketId: string;
}

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  familyId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export type ActivityEventType =
  | 'task:created'
  | 'task:completed'
  | 'task:deleted'
  | 'shopping:list-created'
  | 'shopping:item-added'
  | 'shopping:item-checked'
  | 'calendar:event-created'
  | 'calendar:event-updated'
  | 'recipe:created'
  | 'recipe:favorited'
  | 'user:joined-family';

// ============================================================================
// Socket State Types
// ============================================================================

export interface SocketState {
  connected: boolean;
  familyId: string | null;
  userId: string | null;
  error: Error | null;
}

export interface RealtimeConfig {
  familyId: string;
  userId: string;
  userName: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseSocketReturn {
  socket: any | null; // Socket instance (typed as any to avoid Socket.IO type imports in client)
  connected: boolean;
  error: Error | null;
  emit: (event: string, data?: any) => void;
}

export interface UseRealtimeSyncReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseOnlineUsersReturn {
  onlineUsers: UserPresence[];
  loading: boolean;
  error: Error | null;
}

export interface UsePresenceReturn {
  status: 'online' | 'away' | 'offline';
  updateStatus: (status: 'online' | 'away' | 'offline') => void;
  sendHeartbeat: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SocketEventCallback<T = any> = (data: T) => void;

export interface SocketEventSubscription {
  event: string;
  callback: SocketEventCallback;
  unsubscribe: () => void;
}
