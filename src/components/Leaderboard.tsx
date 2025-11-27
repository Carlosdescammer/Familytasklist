/**
 * Leaderboard Component
 *
 * Display family leaderboard with rankings
 */

'use client';

import { Card, Stack, Group, Avatar, Text, Badge, Paper } from '@mantine/core';
import { IconTrophy, IconFlame, IconCrown } from '@tabler/icons-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  points: number;
  currentStreak: number;
  isCurrentUser: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  sortBy?: 'points' | 'streak';
}

export function Leaderboard({ entries, sortBy = 'points' }: LeaderboardProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return <IconCrown size={20} color="var(--mantine-color-yellow-6)" />;
    if (rank === 2)
      return <IconTrophy size={20} color="var(--mantine-color-gray-5)" />;
    if (rank === 3)
      return <IconTrophy size={20} color="var(--mantine-color-orange-7)" />;
    return null;
  };

  return (
    <Stack gap="sm">
      {entries.map((entry) => (
        <Card
          key={entry.userId}
          shadow="xs"
          padding="md"
          withBorder
          style={{
            backgroundColor: entry.isCurrentUser
              ? 'var(--mantine-color-blue-0)'
              : undefined,
          }}
        >
          <Group justify="space-between">
            <Group gap="md">
              <Paper
                w={40}
                h={40}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getRankBadge(entry.rank) || (
                  <Text fw={700} size="lg">
                    #{entry.rank}
                  </Text>
                )}
              </Paper>

              <Avatar src={entry.avatarUrl} size="md" />

              <div>
                <Group gap="xs">
                  <Text fw={600}>
                    {entry.name || entry.email.split('@')[0]}
                  </Text>
                  {entry.isCurrentUser && (
                    <Badge size="xs" color="blue" variant="light">
                      You
                    </Badge>
                  )}
                </Group>
                <Group gap="md" mt={4}>
                  <Group gap={4}>
                    <IconTrophy size={14} />
                    <Text size="sm" c="dimmed">
                      {entry.points} points
                    </Text>
                  </Group>
                  {entry.currentStreak > 0 && (
                    <Group gap={4}>
                      <IconFlame size={14} color="var(--mantine-color-orange-6)" />
                      <Text size="sm" c="dimmed">
                        {entry.currentStreak} day streak
                      </Text>
                    </Group>
                  )}
                </Group>
              </div>
            </Group>

            <Badge
              size="lg"
              variant="light"
              color={sortBy === 'points' ? 'yellow' : 'orange'}
            >
              {sortBy === 'points' ? entry.points : entry.currentStreak}
            </Badge>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
