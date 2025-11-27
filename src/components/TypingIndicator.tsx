/**
 * TypingIndicator Component
 *
 * Shows who is currently typing in a specific location
 */

'use client';

import { Text, Group, Loader } from '@mantine/core';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

interface TypingIndicatorProps {
  location: string;
}

export function TypingIndicator({ location }: TypingIndicatorProps) {
  const { typingUsers } = useTypingIndicator(location);

  if (typingUsers.length === 0) {
    return null;
  }

  const names = typingUsers.map((u) => u.userName || 'Someone');
  let text = '';

  if (names.length === 1) {
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else if (names.length === 3) {
    text = `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
  } else {
    text = `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
  }

  return (
    <Group gap="xs">
      <Loader size="xs" type="dots" />
      <Text size="sm" c="dimmed" fs="italic">
        {text}
      </Text>
    </Group>
  );
}
