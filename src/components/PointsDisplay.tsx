/**
 * Points Display Component
 *
 * Display user's current points with animation
 */

'use client';

import { Group, Text, Paper } from '@mantine/core';
import { IconCoin } from '@tabler/icons-react';

interface PointsDisplayProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PointsDisplay({
  points,
  size = 'md',
  showLabel = true,
}: PointsDisplayProps) {
  const iconSize = size === 'sm' ? 20 : size === 'md' ? 28 : 36;
  const fontSize = size === 'sm' ? 'lg' : size === 'md' ? 'xl' : '2rem';

  return (
    <Paper p={size === 'sm' ? 'xs' : 'md'} withBorder>
      <Group gap="xs">
        <IconCoin size={iconSize} color="var(--mantine-color-yellow-6)" />
        <div>
          <Text size={fontSize} fw={700} c="yellow">
            {points.toLocaleString()}
          </Text>
          {showLabel && (
            <Text size="xs" c="dimmed">
              points
            </Text>
          )}
        </div>
      </Group>
    </Paper>
  );
}
