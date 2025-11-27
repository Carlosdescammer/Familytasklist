/**
 * Chore Card Component
 *
 * Display a single chore with details and actions
 */

'use client';

import { Card, Group, Text, Badge, ActionIcon, Menu, Stack } from '@mantine/core';
import {
  IconDots,
  IconEdit,
  IconTrash,
  IconUserPlus,
  IconClock,
  IconCoin,
  IconStar,
} from '@tabler/icons-react';

interface ChoreCardProps {
  chore: {
    id: string;
    title: string;
    description: string | null;
    points: number;
    allowanceCents: number;
    category: string;
    difficulty: string;
    estimatedMinutes: number | null;
    icon: string | null;
    isRecurring: boolean;
  };
  onAssign?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'blue',
  cleaning: 'cyan',
  kitchen: 'green',
  yard: 'lime',
  pets: 'orange',
  homework: 'violet',
  personal: 'grape',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'green',
  medium: 'yellow',
  hard: 'orange',
  expert: 'red',
};

export function ChoreCard({
  chore,
  onAssign,
  onEdit,
  onDelete,
  showActions = true,
}: ChoreCardProps) {
  return (
    <Card shadow="xs" padding="md" withBorder>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="xs">
            {chore.icon && <Text size="lg">{chore.icon}</Text>}
            <Text fw={600} size="md">
              {chore.title}
            </Text>
          </Group>

          {chore.description && (
            <Text size="sm" c="dimmed">
              {chore.description}
            </Text>
          )}

          <Group gap="xs" mt="xs">
            <Badge
              leftSection={<IconStar size={12} />}
              color={CATEGORY_COLORS[chore.category] || 'blue'}
              variant="light"
              size="sm"
            >
              {chore.category}
            </Badge>

            <Badge
              color={DIFFICULTY_COLORS[chore.difficulty] || 'gray'}
              variant="dot"
              size="sm"
            >
              {chore.difficulty}
            </Badge>

            {chore.isRecurring && (
              <Badge color="indigo" variant="outline" size="sm">
                Recurring
              </Badge>
            )}
          </Group>

          <Group gap="md" mt="xs">
            <Group gap={4}>
              <IconCoin size={16} color="var(--mantine-color-yellow-6)" />
              <Text size="sm" fw={500}>
                {chore.points} points
              </Text>
            </Group>

            {chore.allowanceCents > 0 && (
              <Group gap={4}>
                <Text size="sm" fw={500} c="green">
                  ${(chore.allowanceCents / 100).toFixed(2)}
                </Text>
              </Group>
            )}

            {chore.estimatedMinutes && (
              <Group gap={4}>
                <IconClock size={16} />
                <Text size="sm" c="dimmed">
                  {chore.estimatedMinutes} min
                </Text>
              </Group>
            )}
          </Group>
        </Stack>

        {showActions && (
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              {onAssign && (
                <Menu.Item
                  leftSection={<IconUserPlus size={14} />}
                  onClick={onAssign}
                >
                  Assign
                </Menu.Item>
              )}
              {onEdit && (
                <Menu.Item leftSection={<IconEdit size={14} />} onClick={onEdit}>
                  Edit
                </Menu.Item>
              )}
              {onDelete && (
                <>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={onDelete}
                  >
                    Delete
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Card>
  );
}
