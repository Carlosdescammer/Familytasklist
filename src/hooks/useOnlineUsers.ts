/**
 * useOnlineUsers Hook
 *
 * React hook for tracking online users in a family
 */

'use client';

import { useState, useEffect } from 'react';
import { useSocketEvent } from './useSocket';
import type { UserPresence, UseOnlineUsersReturn } from '@/types/realtime';
import { requestOnlineUsers } from '@/lib/socket-client';

export function useOnlineUsers(familyId: string | null): UseOnlineUsersReturn {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Request online users when component mounts
  useEffect(() => {
    if (familyId) {
      try {
        requestOnlineUsers(familyId);
      } catch (err) {
        setError(err as Error);
      }
    }
  }, [familyId]);

  // Listen for online users list
  useSocketEvent<{ users: UserPresence[] }>('presence:online-users', (data) => {
    setOnlineUsers(data.users);
    setLoading(false);
  });

  // Listen for users joining
  useSocketEvent<UserPresence>('presence:user-joined', (userPresence) => {
    setOnlineUsers((prev) => {
      // Check if user is already in the list
      const exists = prev.some((u) => u.userId === userPresence.userId);
      if (exists) {
        // Update existing user
        return prev.map((u) =>
          u.userId === userPresence.userId ? userPresence : u
        );
      } else {
        // Add new user
        return [...prev, userPresence];
      }
    });
  });

  // Listen for users leaving
  useSocketEvent<{ userId: string; userName: string }>('presence:user-left', (data) => {
    setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
  });

  // Listen for status changes
  useSocketEvent<{ userId: string; status: 'online' | 'away' | 'offline' }>(
    'presence:status-changed',
    (data) => {
      setOnlineUsers((prev) =>
        prev.map((u) =>
          u.userId === data.userId ? { ...u, status: data.status } : u
        )
      );
    }
  );

  return {
    onlineUsers,
    loading,
    error,
  };
}
