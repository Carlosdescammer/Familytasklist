/**
 * RealtimeActivityFeed Component
 *
 * Displays real-time activity updates for the family
 */

'use client';

import { useState, useEffect } from 'react';
import { Stack, Text, Group, Avatar, Paper, ScrollArea, Box } from '@mantine/core';
import {
  IconCheck,
  IconShoppingCart,
  IconCalendar,
  IconChefHat,
  IconStar,
  IconUserPlus,
} from '@tabler/icons-react';
import { useSocketEvent } from '@/hooks/useSocket';
import type { ActivityEvent, ActivityEventType } from '@/types/realtime';

interface RealtimeActivityFeedProps {
  maxItems?: number;
  height?: number | string;
}

export function RealtimeActivityFeed({
  maxItems = 10,
  height = 400,
}: RealtimeActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  // Listen for new activity events
  useSocketEvent<ActivityEvent>('activity:new', (activity) => {
    setActivities((prev) => {
      const newActivities = [activity, ...prev];
      return newActivities.slice(0, maxItems);
    });
  });

  if (activities.length === 0) {
    return (
      <Box p="md" ta="center">
        <Text size="sm" c="dimmed">
          No recent activity
        </Text>
      </Box>
    );
  }

  return (
    <ScrollArea h={height}>
      <Stack gap="sm" p="sm">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </Stack>
    </ScrollArea>
  );
}

function ActivityItem({ activity }: { activity: ActivityEvent }) {
  const Icon = getIconForActivityType(activity.type);
  const color = getColorForActivityType(activity.type);
  const timeAgo = getTimeAgo(activity.timestamp);

  return (
    <Paper p="sm" withBorder>
      <Group gap="sm" wrap="nowrap">
        <Avatar size="md" radius="xl" color={color}>
          {Icon && <Icon size={20} />}
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} lineClamp={1}>
            {activity.title}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {activity.description}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {activity.userName || 'Someone'} · {timeAgo}
          </Text>
        </Box>
      </Group>
    </Paper>
  );
}

function getIconForActivityType(type: ActivityEventType) {
  switch (type) {
    case 'task:created':
    case 'task:completed':
    case 'task:deleted':
      return IconCheck;
    case 'shopping:list-created':
    case 'shopping:item-added':
    case 'shopping:item-checked':
      return IconShoppingCart;
    case 'calendar:event-created':
    case 'calendar:event-updated':
      return IconCalendar;
    case 'recipe:created':
      return IconChefHat;
    case 'recipe:favorited':
      return IconStar;
    case 'user:joined-family':
      return IconUserPlus;
    default:
      return null;
  }
}

function getColorForActivityType(type: ActivityEventType): string {
  switch (type) {
    case 'task:created':
    case 'task:completed':
      return 'green';
    case 'task:deleted':
      return 'red';
    case 'shopping:list-created':
    case 'shopping:item-added':
    case 'shopping:item-checked':
      return 'blue';
    case 'calendar:event-created':
    case 'calendar:event-updated':
      return 'orange';
    case 'recipe:created':
    case 'recipe:favorited':
      return 'pink';
    case 'user:joined-family':
      return 'teal';
    default:
      return 'gray';
  }
}

function getTimeAgo(timestamp: Date): string {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
