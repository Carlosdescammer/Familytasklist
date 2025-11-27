/**
 * Chore Assignment Card Component
 *
 * Display a chore assignment with status and actions
 */

'use client';

import { Card, Group, Text, Badge, Button, Stack, Avatar } from '@mantine/core';
import {
  IconCheck,
  IconClock,
  IconCoin,
  IconStar,
  IconAlertCircle,
} from '@tabler/icons-react';

interface ChoreAssignmentCardProps {
  assignment: {
    id: string;
    status: string;
    dueDate: string | null;
    completedAt: string | null;
    verifiedAt: string | null;
    notes: string | null;
  };
  chore: {
    title: string;
    description: string | null;
    points: number;
    allowanceCents: number;
    category: string;
    difficulty: string;
    icon: string | null;
  };
  assignedToUser: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  onComplete?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  isAssignee?: boolean;
  isParent?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'blue',
  completed: 'yellow',
  verified: 'green',
  rejected: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'To Do',
  completed: 'Done - Needs Review',
  verified: 'Verified',
  rejected: 'Needs Work',
};

export function ChoreAssignmentCard({
  assignment,
  chore,
  assignedToUser,
  onComplete,
  onVerify,
  onReject,
  showActions = true,
  isAssignee = false,
  isParent = false,
}: ChoreAssignmentCardProps) {
  const isOverdue =
    assignment.dueDate &&
    new Date(assignment.dueDate) < new Date() &&
    assignment.status === 'pending';

  return (
    <Card shadow="xs" padding="md" withBorder>
      <Stack gap="md">
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
                color={STATUS_COLORS[assignment.status] || 'gray'}
                variant="filled"
                size="sm"
              >
                {STATUS_LABELS[assignment.status] || assignment.status}
              </Badge>

              {isOverdue && (
                <Badge
                  leftSection={<IconAlertCircle size={12} />}
                  color="red"
                  variant="light"
                  size="sm"
                >
                  Overdue
                </Badge>
              )}
            </Group>
          </Stack>

          <Avatar
            src={assignedToUser.avatarUrl}
            alt={assignedToUser.name || assignedToUser.email}
            size="md"
          />
        </Group>

        <Group gap="md">
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

          {assignment.dueDate && (
            <Group gap={4}>
              <IconClock size={16} />
              <Text size="sm" c={isOverdue ? 'red' : 'dimmed'}>
                {new Date(assignment.dueDate).toLocaleDateString()}
              </Text>
            </Group>
          )}
        </Group>

        {assignment.notes && (
          <Text size="sm" c="dimmed" fs="italic">
            Note: {assignment.notes}
          </Text>
        )}

        {showActions && (
          <Group gap="xs">
            {isAssignee &&
              assignment.status === 'pending' &&
              onComplete && (
                <Button
                  leftSection={<IconCheck size={16} />}
                  onClick={onComplete}
                  size="sm"
                  color="green"
                >
                  Mark Complete
                </Button>
              )}

            {isParent && assignment.status === 'completed' && (
              <>
                {onVerify && (
                  <Button
                    leftSection={<IconCheck size={16} />}
                    onClick={onVerify}
                    size="sm"
                    color="green"
                  >
                    Verify
                  </Button>
                )}
                {onReject && (
                  <Button
                    onClick={onReject}
                    size="sm"
                    color="red"
                    variant="light"
                  >
                    Needs Work
                  </Button>
                )}
              </>
            )}
          </Group>
        )}

        {assignment.completedAt && (
          <Text size="xs" c="dimmed">
            Completed: {new Date(assignment.completedAt).toLocaleString()}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
