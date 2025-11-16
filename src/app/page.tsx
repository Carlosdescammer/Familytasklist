'use client';

import { Title, Grid, Card, Text, Group, Stack, Badge, Progress, Button, RingProgress, Center } from '@mantine/core';
import { IconCalendar, IconShoppingCart, IconCheckbox, IconTrophy, IconStar, IconCoins, IconCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/AppLayout';
import { notifications } from '@mantine/notifications';

export default function Dashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    events: 0,
    shopping: 0,
    tasks: 0,
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);

  useEffect(() => {
    // Fetch stats from APIs
    const fetchStats = async () => {
      try {
        const [eventsRes, shoppingRes, tasksRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/shopping'),
          fetch('/api/tasks'),
        ]);

        const events = await eventsRes.json();
        const shopping = await shoppingRes.json();
        const tasks = await tasksRes.json();

        setStats({
          events: Array.isArray(events) ? events.length : 0,
          shopping: Array.isArray(shopping)
            ? shopping.filter((item: any) => !item.completed).length
            : 0,
          tasks: Array.isArray(tasks) ? tasks.filter((task: any) => !task.completed).length : 0,
        });

        // Filter tasks assigned to current user
        if (session?.user?.id && Array.isArray(tasks)) {
          const userTasks = tasks.filter((task: any) => task.assignedTo === session.user.id);
          setMyTasks(userTasks);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [session?.user?.id]);

  useEffect(() => {
    // Fetch user profile for gamification data
    const fetchProfile = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/users/${session.user.id}/child-settings`);
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchProfile();
  }, [session?.user?.id]);

  const handleCompleteTask = async (taskId: string, pointsToAward: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      if (res.ok) {
        notifications.show({
          title: 'Great job!',
          message: `You earned ${pointsToAward} Family Bucks!`,
          color: 'green',
          icon: <IconCoins size={20} />,
        });

        // Refresh tasks and profile
        const tasksRes = await fetch('/api/tasks');
        const tasks = await tasksRes.json();
        if (session?.user?.id && Array.isArray(tasks)) {
          const userTasks = tasks.filter((task: any) => task.assignedTo === session.user.id);
          setMyTasks(userTasks);
        }

        const profileRes = await fetch(`/api/users/${session?.user?.id}/child-settings`);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setUserProfile(data);
        }
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to complete task',
        color: 'red',
      });
    }
  };

  const isChildWithGamification = session?.user?.role === 'child' && userProfile?.gamificationEnabled;

  // Calculate level based on total points earned
  const calculateLevel = (points: number) => {
    return Math.floor(points / 100) + 1;
  };

  const calculateProgress = (points: number) => {
    const level = calculateLevel(points);
    const pointsInCurrentLevel = points % 100;
    return (pointsInCurrentLevel / 100) * 100;
  };

  const activeTasks = myTasks.filter((task: any) => !task.completed);
  const completedTasks = myTasks.filter((task: any) => task.completed);

  // Child-friendly gamified dashboard
  if (isChildWithGamification) {
    const level = calculateLevel(userProfile?.totalPointsEarned || 0);
    const progressPercent = calculateProgress(userProfile?.totalPointsEarned || 0);
    const pointsToNextLevel = 100 - (userProfile?.totalPointsEarned || 0) % 100;

    return (
      <AppLayout>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <div>
              <Title order={1} style={{ fontSize: '2rem' }}>
                Hey {userProfile?.name || session?.user?.name || 'Champion'}! 👋
              </Title>
              <Text size="lg" c="dimmed">
                Ready to earn some Family Bucks?
              </Text>
            </div>
            <Badge size="xl" variant="gradient" gradient={{ from: 'gold', to: 'yellow' }}>
              Level {level}
            </Badge>
          </Group>

          {/* Points Display */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card
                shadow="md"
                padding="xl"
                radius="lg"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                <Group justify="space-between" align="flex-start" mb="md">
                  <div>
                    <Text size="sm" opacity={0.9} mb={5}>
                      Your Family Bucks
                    </Text>
                    <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                      {userProfile?.familyBucks || 0}
                    </Text>
                  </div>
                  <IconCoins size={50} opacity={0.8} />
                </Group>
                <Text size="sm" opacity={0.8}>
                  Keep completing tasks to earn more!
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="md" padding="xl" radius="lg" withBorder>
                <Group justify="space-between" align="flex-start" mb="md">
                  <div>
                    <Text size="sm" c="dimmed" mb={5}>
                      Total Earned
                    </Text>
                    <Group gap="xs" align="center">
                      <Text size="2.5rem" fw={700} c="yellow" style={{ lineHeight: 1 }}>
                        {userProfile?.totalPointsEarned || 0}
                      </Text>
                      <IconTrophy size={40} color="gold" />
                    </Group>
                  </div>
                </Group>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" fw={500}>
                      Progress to Level {level + 1}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {pointsToNextLevel} points to go!
                    </Text>
                  </Group>
                  <Progress value={progressPercent} size="lg" radius="xl" />
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* My Tasks */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <IconCheckbox size={24} />
                <Text size="xl" fw={600}>
                  My Tasks
                </Text>
              </Group>
              <Badge size="lg" variant="filled" color="blue">
                {activeTasks.length} Active
              </Badge>
            </Group>

            {activeTasks.length === 0 ? (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <IconStar size={60} color="gold" />
                  <Text size="lg" fw={500}>
                    Amazing! All tasks completed! 🎉
                  </Text>
                  <Text size="sm" c="dimmed">
                    Check back later for new tasks
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Stack gap="md">
                {activeTasks.map((task: any) => (
                  <Card
                    key={task.id}
                    padding="md"
                    radius="md"
                    withBorder
                    style={{ borderLeft: '4px solid #4c6ef5' }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <div style={{ flex: 1 }}>
                        <Text fw={500} size="md" mb={4}>
                          {task.title}
                        </Text>
                        {task.notes && (
                          <Text size="sm" c="dimmed" mb={8}>
                            {task.notes}
                          </Text>
                        )}
                        <Group gap="xs">
                          {task.priority && (
                            <Badge size="sm" variant="light" color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'blue'}>
                              {task.priority}
                            </Badge>
                          )}
                          <Badge size="sm" variant="filled" color="green" leftSection={<IconCoins size={12} />}>
                            +{userProfile?.pointsPerTask || 10} Bucks
                          </Badge>
                        </Group>
                      </div>
                      <Button
                        size="md"
                        variant="gradient"
                        gradient={{ from: 'teal', to: 'lime' }}
                        leftSection={<IconCheck size={18} />}
                        onClick={() => handleCompleteTask(task.id, userProfile?.pointsPerTask || 10)}
                      >
                        Complete!
                      </Button>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Card>

          {/* Achievements Section */}
          {completedTasks.length > 0 && (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group mb="md">
                <IconTrophy size={24} color="gold" />
                <Text size="xl" fw={600}>
                  Recent Achievements
                </Text>
              </Group>
              <Grid>
                {completedTasks.slice(0, 3).map((task: any) => (
                  <Grid.Col key={task.id} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card padding="sm" radius="md" withBorder style={{ background: '#f8f9fa' }}>
                      <Group gap="xs" mb="xs">
                        <IconCheck size={20} color="green" />
                        <Text size="sm" fw={500} lineClamp={1}>
                          {task.title}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Earned {userProfile?.pointsPerTask || 10} Family Bucks!
                      </Text>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            </Card>
          )}
        </Stack>
      </AppLayout>
    );
  }

  // Regular dashboard for parents and non-gamified children
  return (
    <AppLayout>
      <Stack gap="lg">
        <Title order={1}>Dashboard</Title>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Upcoming Events</Text>
                <IconCalendar size={24} />
              </Group>
              <Text size="xl" fw={700}>
                {stats.events}
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                Total events in calendar
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Shopping Items</Text>
                <IconShoppingCart size={24} />
              </Group>
              <Text size="xl" fw={700}>
                {stats.shopping}
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                Items left to buy
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Pending Tasks</Text>
                <IconCheckbox size={24} />
              </Group>
              <Text size="xl" fw={700}>
                {stats.tasks}
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                Tasks to complete
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="lg" fw={500}>
                Quick Links
              </Text>
              <Badge color="blue">Family App</Badge>
            </Group>
            <Text size="sm" c="dimmed">
              Welcome to FamilyList! Use the navigation menu to manage your family's calendar,
              shopping list, and tasks.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </AppLayout>
  );
}
