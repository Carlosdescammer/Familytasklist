/**
 * Achievement Badge Component
 *
 * Display an achievement badge with unlock status
 */

'use client';

import { Card, Stack, Text, Badge, Group, Tooltip } from '@mantine/core';
import { IconLock, IconStar } from '@tabler/icons-react';

interface AchievementBadgeProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    points: number;
    rarity: string;
    color: string;
  };
  unlocked: boolean;
  unlockedAt?: string;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'gray',
  uncommon: 'green',
  rare: 'blue',
  epic: 'violet',
  legendary: 'orange',
};

export function AchievementBadge({
  achievement,
  unlocked,
  unlockedAt,
}: AchievementBadgeProps) {
  return (
    <Tooltip
      label={achievement.description}
      multiline
      w={220}
      withArrow
      position="top"
    >
      <Card
        shadow="xs"
        padding="md"
        withBorder
        style={{
          opacity: unlocked ? 1 : 0.5,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Stack align="center" gap="xs">
          <div
            style={{
              fontSize: '3rem',
              filter: unlocked ? 'none' : 'grayscale(100%)',
            }}
          >
            {unlocked ? achievement.icon : <IconLock size={48} />}
          </div>

          <Text fw={600} size="sm" ta="center">
            {achievement.name}
          </Text>

          <Group gap="xs">
            <Badge
              color={RARITY_COLORS[achievement.rarity] || 'gray'}
              variant="light"
              size="xs"
            >
              {achievement.rarity}
            </Badge>

            {achievement.points > 0 && (
              <Badge
                leftSection={<IconStar size={10} />}
                color="yellow"
                variant="light"
                size="xs"
              >
                +{achievement.points}
              </Badge>
            )}
          </Group>

          {unlocked && unlockedAt && (
            <Text size="xs" c="dimmed">
              {new Date(unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </Stack>
      </Card>
    </Tooltip>
  );
}
