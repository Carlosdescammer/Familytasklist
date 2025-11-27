/**
 * Rewards Page
 *
 * Browse and redeem rewards with points
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Group,
  Tabs,
  SimpleGrid,
  Paper,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Loader,
  Divider,
} from '@mantine/core';
import {
  IconPlus,
  IconGift,
  IconTrophy,
  IconFlame,
  IconCrown,
} from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { RewardCard } from '@/components/RewardCard';
import { PointsDisplay } from '@/components/PointsDisplay';
import { Leaderboard } from '@/components/Leaderboard';
import { AchievementBadge } from '@/components/AchievementBadge';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';

export default function RewardsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<string | null>('store');
  const [rewards, setRewards] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpened, setCreateModalOpened] = useState(false);

  // New reward form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState(100);
  const [category, setCategory] = useState('privilege');
  const [icon, setIcon] = useState('');
  const [stockLimit, setStockLimit] = useState<number | ''>('');

  const isParent = user?.role === 'parent' || user?.role === 'admin';

  useEffect(() => {
    if (user?.familyId) {
      fetchRewards();
      fetchAchievements();
      fetchLeaderboard();
      checkAchievements();
    }
  }, [user?.familyId]);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gamification/rewards?available=true');
      const data = await res.json();
      setRewards(data.rewards || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const res = await fetch('/api/gamification/achievements');
      const data = await res.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/gamification/leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const checkAchievements = async () => {
    try {
      const res = await fetch('/api/gamification/achievements/check', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.unlockedCount > 0) {
        notifications.show({
          title: 'Achievement Unlocked!',
          message: `You unlocked ${data.unlockedCount} new achievement${
            data.unlockedCount > 1 ? 's' : ''
          }!`,
          color: 'green',
        });
        fetchAchievements();
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const handleCreateReward = async () => {
    if (!title || !pointsCost) {
      notifications.show({
        title: 'Error',
        message: 'Title and points cost are required',
        color: 'red',
      });
      return;
    }

    try {
      const res = await fetch('/api/gamification/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          pointsCost,
          category,
          icon,
          stockLimit: stockLimit || null,
        }),
      });

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Reward created successfully',
          color: 'green',
        });
        setCreateModalOpened(false);
        resetForm();
        fetchRewards();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create reward',
        color: 'red',
      });
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (
      !confirm(
        'Are you sure you want to redeem this reward? Your points will be deducted.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/gamification/rewards/${rewardId}/redeem`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Reward redeemed! A parent will fulfill it soon.',
          color: 'green',
        });
        fetchRewards();
        // Re-fetch user to update points
        window.location.reload();
      } else {
        const data = await res.json();
        notifications.show({
          title: 'Error',
          message: data.error || 'Failed to redeem reward',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to redeem reward',
        color: 'red',
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPointsCost(100);
    setCategory('privilege');
    setIcon('');
    setStockLimit('');
  };

  if (userLoading || loading) {
    return (
      <AppLayout>
        <Container>
          <Stack align="center" py="xl">
            <Loader />
            <Text>Loading rewards...</Text>
          </Stack>
        </Container>
      </AppLayout>
    );
  }

  if (!user) {
    return <AppLayout><Container>Please log in to view rewards</Container></AppLayout>;
  }

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);

  return (
    <AppLayout>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Rewards & Achievements</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Earn points, unlock achievements, and claim rewards
            </Text>
          </div>
          <Group>
            <PointsDisplay points={user.gamificationPoints || 0} size="lg" />
            {isParent && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpened(true)}
              >
                Create Reward
              </Button>
            )}
          </Group>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="store" leftSection={<IconGift size={16} />}>
              Rewards Store
            </Tabs.Tab>
            <Tabs.Tab value="achievements" leftSection={<IconTrophy size={16} />}>
              Achievements ({unlockedAchievements.length}/{achievements.length})
            </Tabs.Tab>
            <Tabs.Tab value="leaderboard" leftSection={<IconCrown size={16} />}>
              Leaderboard
            </Tabs.Tab>
          </Tabs.List>

          {/* Rewards Store */}
          <Tabs.Panel value="store" pt="md">
            {rewards.length === 0 ? (
              <Paper p="xl" withBorder>
                <Text ta="center" c="dimmed">
                  {isParent
                    ? 'No rewards yet. Create rewards for your family to redeem!'
                    : 'No rewards available yet. Ask a parent to add some!'}
                </Text>
              </Paper>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {rewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    userPoints={user.gamificationPoints || 0}
                    onRedeem={() => handleRedeemReward(reward.id)}
                  />
                ))}
              </SimpleGrid>
            )}
          </Tabs.Panel>

          {/* Achievements */}
          <Tabs.Panel value="achievements" pt="md">
            <Stack gap="xl">
              {unlockedAchievements.length > 0 && (
                <div>
                  <Group gap="xs" mb="md">
                    <IconTrophy size={20} color="var(--mantine-color-yellow-6)" />
                    <Text fw={600} size="lg">
                      Unlocked ({unlockedAchievements.length})
                    </Text>
                  </Group>
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {unlockedAchievements.map((achievement) => (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        unlocked={true}
                        unlockedAt={achievement.unlockedAt}
                      />
                    ))}
                  </SimpleGrid>
                </div>
              )}

              {lockedAchievements.length > 0 && (
                <div>
                  <Divider my="md" />
                  <Group gap="xs" mb="md">
                    <Text fw={600} size="lg" c="dimmed">
                      Locked ({lockedAchievements.length})
                    </Text>
                  </Group>
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {lockedAchievements.map((achievement) => (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        unlocked={false}
                      />
                    ))}
                  </SimpleGrid>
                </div>
              )}

              {achievements.length === 0 && (
                <Paper p="xl" withBorder>
                  <Text ta="center" c="dimmed">
                    No achievements available yet
                  </Text>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Leaderboard */}
          <Tabs.Panel value="leaderboard" pt="md">
            {leaderboard.length === 0 ? (
              <Paper p="xl" withBorder>
                <Text ta="center" c="dimmed">
                  No family members found
                </Text>
              </Paper>
            ) : (
              <Leaderboard entries={leaderboard} sortBy="points" />
            )}
          </Tabs.Panel>
        </Tabs>

        {/* Create Reward Modal */}
        <Modal
          opened={createModalOpened}
          onClose={() => setCreateModalOpened(false)}
          title="Create New Reward"
          size="lg"
        >
          <Stack gap="md">
            <TextInput
              label="Title"
              placeholder="Extra 30 minutes screen time"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Textarea
              label="Description"
              placeholder="Describe the reward..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            <Group grow>
              <NumberInput
                label="Points Cost"
                value={pointsCost}
                onChange={(val) => setPointsCost(Number(val) || 0)}
                min={1}
                required
              />

              <NumberInput
                label="Stock Limit (optional)"
                placeholder="Unlimited"
                value={stockLimit}
                onChange={(val) => setStockLimit(typeof val === 'number' ? val : '')}
                min={1}
              />
            </Group>

            <Select
              label="Category"
              value={category}
              onChange={(val) => setCategory(val || 'privilege')}
              data={[
                { value: 'privilege', label: 'Privilege' },
                { value: 'item', label: 'Item' },
                { value: 'activity', label: 'Activity' },
                { value: 'treat', label: 'Treat' },
                { value: 'digital', label: 'Digital' },
              ]}
            />

            <TextInput
              label="Icon (emoji)"
              placeholder="🎮"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setCreateModalOpened(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReward}>Create Reward</Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
    </AppLayout>
  );
}
