/**
 * useTypingIndicator Hook
 *
 * React hook for managing typing indicators
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { startTyping, stopTyping } from '@/lib/socket-client';
import { useSocketEvent } from './useSocket';

interface TypingUser {
  userId: string;
  userName: string;
  location: string;
}

export function useTypingIndicator(location: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);

  // Listen for typing start events
  useSocketEvent<{ userId: string; userName: string; location: string }>(
    'typing:start',
    (data) => {
      if (data.location === location) {
        setTypingUsers((prev) => {
          // Don't add if already in list
          if (prev.some((u) => u.userId === data.userId)) {
            return prev;
          }
          return [...prev, data];
        });

        // Auto-remove after 5 seconds if no stop event
        setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId || u.location !== data.location)
          );
        }, 5000);
      }
    }
  );

  // Listen for typing stop events
  useSocketEvent<{ userId: string; location: string }>('typing:stop', (data) => {
    if (data.location === location) {
      setTypingUsers((prev) =>
        prev.filter((u) => u.userId !== data.userId || u.location !== data.location)
      );
    }
  });

  // Emit typing stop
  const onTypingStop = useCallback(() => {
    if (isTypingRef.current) {
      stopTyping(location);
      isTypingRef.current = false;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [location]);

  // Emit typing start
  const onTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      startTyping(location);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of no activity
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 3000);
  }, [location, onTypingStop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        stopTyping(location);
      }
    };
  }, [location]);

  return {
    typingUsers,
    onTypingStart,
    onTypingStop,
  };
}
