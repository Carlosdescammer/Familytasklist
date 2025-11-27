/**
 * Reward Card Component
 *
 * Display a reward in the rewards store
 */

'use client';

import { Card, Group, Text, Badge, Button, Stack } from '@mantine/core';
import { IconCoin, IconShoppingCart, IconLock } from '@tabler/icons-react';

interface RewardCardProps {
  reward: {
    id: string;
    title: string;
    description: string | null;
    pointsCost: number;
    category: string;
    icon: string | null;
    isAvailable: boolean;
    stockLimit: number | null;
    stockRemaining: number | null;
  };
  userPoints?: number;
  onRedeem?: () => void;
  showRedeemButton?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  privilege: 'violet',
  item: 'blue',
  activity: 'green',
  treat: 'orange',
  digital: 'cyan',
};

export function RewardCard({
  reward,
  userPoints = 0,
  onRedeem,
  showRedeemButton = true,
}: RewardCardProps) {
  const canAfford = userPoints >= reward.pointsCost;
  const isOutOfStock =
    reward.stockRemaining !== null && reward.stockRemaining <= 0;
  const isUnavailable = !reward.isAvailable || isOutOfStock;

  return (
    <Card shadow="xs" padding="md" withBorder style={{ opacity: isUnavailable ? 0.6 : 1 }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap="xs">
              {reward.icon && <Text size="2rem">{reward.icon}</Text>}
              <Text fw={600} size="md">
                {reward.title}
              </Text>
            </Group>

            {reward.description && (
              <Text size="sm" c="dimmed">
                {reward.description}
              </Text>
            )}

            <Group gap="xs" mt="xs">
              <Badge
                color={CATEGORY_COLORS[reward.category] || 'blue'}
                variant="light"
                size="sm"
              >
                {reward.category}
              </Badge>

              {isOutOfStock && (
                <Badge color="red" variant="filled" size="sm">
                  Out of Stock
                </Badge>
              )}

              {!isOutOfStock &&
                reward.stockRemaining !== null &&
                reward.stockRemaining < 5 && (
                  <Badge color="yellow" variant="light" size="sm">
                    Only {reward.stockRemaining} left
                  </Badge>
                )}
            </Group>
          </Stack>
        </Group>

        <Group justify="space-between" align="center">
          <Group gap={4}>
            <IconCoin size={20} color="var(--mantine-color-yellow-6)" />
            <Text size="lg" fw={700} c="yellow">
              {reward.pointsCost}
            </Text>
          </Group>

          {showRedeemButton && (
            <Button
              leftSection={
                canAfford && !isUnavailable ? (
                  <IconShoppingCart size={16} />
                ) : (
                  <IconLock size={16} />
                )
              }
              onClick={onRedeem}
              disabled={!canAfford || isUnavailable}
              size="sm"
              color={canAfford && !isUnavailable ? 'green' : 'gray'}
            >
              {isUnavailable
                ? 'Unavailable'
                : canAfford
                ? 'Redeem'
                : `Need ${reward.pointsCost - userPoints} more`}
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
