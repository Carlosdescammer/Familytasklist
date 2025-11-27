/**
 * OnlineUsers Component
 *
 * Displays a list of currently online family members with presence status
 */

'use client';

import { Avatar, Badge, Group, Stack, Text, Tooltip, Box } from '@mantine/core';
import { IconCircleFilled } from '@tabler/icons-react';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import type { UserPresence } from '@/types/realtime';

interface OnlineUsersProps {
  familyId: string | null;
  variant?: 'list' | 'avatars';
  maxDisplay?: number;
}

export function OnlineUsers({ familyId, variant = 'avatars', maxDisplay }: OnlineUsersProps) {
  const { onlineUsers, loading } = useOnlineUsers(familyId);

  if (loading || !familyId) {
    return null;
  }

  if (onlineUsers.length === 0) {
    return null;
  }

  const displayUsers = maxDisplay ? onlineUsers.slice(0, maxDisplay) : onlineUsers;
  const remainingCount = maxDisplay && onlineUsers.length > maxDisplay
    ? onlineUsers.length - maxDisplay
    : 0;

  if (variant === 'list') {
    return (
      <Stack gap="xs">
        <Text size="sm" fw={600} c="dimmed">
          Online ({onlineUsers.length})
        </Text>
        {displayUsers.map((user) => (
          <Group key={user.userId} gap="sm">
            <Avatar size="sm" radius="xl" color="blue">
              {getInitials(user.userName)}
            </Avatar>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {user.userName || 'Anonymous'}
              </Text>
              <Text size="xs" c="dimmed">
                {user.userEmail}
              </Text>
            </Box>
            <PresenceIndicator status={user.status} />
          </Group>
        ))}
        {remainingCount > 0 && (
          <Text size="xs" c="dimmed">
            +{remainingCount} more
          </Text>
        )}
      </Stack>
    );
  }

  // Avatars variant (default)
  return (
    <Group gap="xs">
      {displayUsers.map((user) => (
        <Tooltip
          key={user.userId}
          label={
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                {user.userName || 'Anonymous'}
              </Text>
              <Text size="xs" c="dimmed">
                {getStatusText(user.status)}
              </Text>
            </Stack>
          }
          position="top"
        >
          <Box pos="relative">
            <Avatar size="md" radius="xl" color="blue">
              {getInitials(user.userName)}
            </Avatar>
            <Box
              pos="absolute"
              bottom={0}
              right={0}
              style={{
                borderRadius: '50%',
                border: '2px solid var(--mantine-color-body)',
              }}
            >
              <PresenceIndicator status={user.status} size="sm" />
            </Box>
          </Box>
        </Tooltip>
      ))}
      {remainingCount > 0 && (
        <Tooltip label={`${remainingCount} more online`} position="top">
          <Avatar size="md" radius="xl" color="gray">
            +{remainingCount}
          </Avatar>
        </Tooltip>
      )}
    </Group>
  );
}

function PresenceIndicator({ status, size = 'md' }: { status: UserPresence['status']; size?: 'sm' | 'md' }) {
  const color = status === 'online' ? 'green' : status === 'away' ? 'yellow' : 'gray';
  const iconSize = size === 'sm' ? 12 : 16;

  return (
    <Badge
      size={size}
      variant="light"
      color={color}
      leftSection={<IconCircleFilled size={iconSize} />}
    >
      {status}
    </Badge>
  );
}

function getInitials(name: string | null): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getStatusText(status: UserPresence['status']): string {
  switch (status) {
    case 'online':
      return 'Active now';
    case 'away':
      return 'Away';
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
}
