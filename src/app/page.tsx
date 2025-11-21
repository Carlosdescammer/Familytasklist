'use client';

import { Title, Grid, Card, Text, Group, Stack, Badge, Progress, Button, RingProgress, Center, Divider, Skeleton, ScrollArea, List, ThemeIcon } from '@mantine/core';
import { IconCalendar, IconShoppingCart, IconCheckbox, IconTrophy, IconStar, IconCoins, IconCheck, IconChefHat, IconUsers, IconSettings, IconPigMoney, IconClock, IconCircleCheck, IconCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import AppLayout from '@/components/AppLayout';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

type Event = {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  color?: string;
};

type Task = {
  id: string;
  title: string;
  notes?: string;
  priority?: string;
  completed: boolean;
  assignedTo?: string;
  assignedUser?: { name: string };
};

type ShoppingItem = {
  id: string;
  name: string;
  quantity?: number;
  completed: boolean;
  category?: string;
};

type BudgetData = {
  totalBudget: number;
  totalSpent: number;
  percentUsed: number;
  month: string;
};

export default function Dashboard() {
  const { user, loading } = useCurrentUser();
  const [stats, setStats] = useState({
    events: 0,
    shopping: 0,
    tasks: 0,
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // Fetch stats from APIs
    const fetchStats = async () => {
      setLoadingData(true);
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
        if (user?.id && Array.isArray(tasks)) {
          const userTasks = tasks.filter((task: any) => task.assignedTo === user.id);
          setMyTasks(userTasks);
        }

        // Set upcoming events (sorted by date, limited to 5)
        if (Array.isArray(events)) {
          const now = new Date();
          const upcoming = events
            .filter((e: Event) => new Date(e.startTime) >= now)
            .sort((a: Event, b: Event) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 5);
          setUpcomingEvents(upcoming);
        }

        // Set recent active tasks (limited to 5)
        if (Array.isArray(tasks)) {
          const activeTasks = tasks
            .filter((t: Task) => !t.completed)
            .slice(0, 5);
          setRecentTasks(activeTasks);
        }

        // Set shopping items (uncompleted, limited to 5)
        if (Array.isArray(shopping)) {
          const uncompleted = shopping
            .filter((item: ShoppingItem) => !item.completed)
            .slice(0, 8);
          setShoppingItems(uncompleted);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  // Fetch budget data for current month
  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const [budgetRes, expensesRes] = await Promise.all([
          fetch(`/api/budgets?month=${currentMonth}`),
          fetch(`/api/expenses?month=${currentMonth}`),
        ]);

        if (budgetRes.ok && expensesRes.ok) {
          const budgets = await budgetRes.json();
          const expenses = await expensesRes.json();

          // Get the first/main budget for the month
          const budget = Array.isArray(budgets) ? budgets[0] : budgets;
          const totalBudget = budget?.totalBudget ? parseFloat(budget.totalBudget) : 0;

          // Calculate total spent
          const totalSpent = Array.isArray(expenses)
            ? expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || 0), 0)
            : 0;

          const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

          setBudgetData({
            totalBudget,
            totalSpent,
            percentUsed,
            month: currentMonth,
          });
        }
      } catch (error) {
        console.error('Error fetching budget data:', error);
      }
    };

    fetchBudgetData();
  }, []);

  useEffect(() => {
    // Fetch user profile for gamification data
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const res = await fetch(`/api/users/${user.id}/child-settings`);
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchProfile();
  }, [user?.id]);

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
        if (user?.id && Array.isArray(tasks)) {
          const userTasks = tasks.filter((task: any) => task.assignedTo === user.id);
          setMyTasks(userTasks);
        }

        const profileRes = await fetch(`/api/users/${user?.id}/child-settings`);
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

  const isChildWithGamification = user?.role === 'child' && userProfile?.gamificationEnabled;

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
                Hey {userProfile?.name || user?.name || 'Champion'}! 👋
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

  // Helper to format date
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getBudgetColor = (percent: number) => {
    if (percent >= 100) return 'red';
    if (percent >= 80) return 'orange';
    if (percent >= 60) return 'yellow';
    return 'green';
  };

  // Regular dashboard for parents and non-gamified children
  return (
    <AppLayout>
      <Stack gap="lg">
        <Title order={1}>Dashboard</Title>

        {/* Quick Links */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text size="lg" fw={500} mb="md">Quick Links</Text>
          <Grid>
            <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
              <Card component={Link} href="/calendar" padding="md" radius="md" withBorder style={{ cursor: 'pointer', textDecoration: 'none' }}>
                <Stack gap="xs" align="center">
                  <IconCalendar size={28} color="var(--mantine-color-blue-6)" />
                  <Text fw={500} size="sm">Calendar</Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
              <Card component={Link} href="/shopping" padding="md" radius="md" withBorder style={{ cursor: 'pointer', textDecoration: 'none' }}>
                <Stack gap="xs" align="center">
                  <IconShoppingCart size={28} color="var(--mantine-color-green-6)" />
                  <Text fw={500} size="sm">Shopping</Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
              <Card component={Link} href="/tasks" padding="md" radius="md" withBorder style={{ cursor: 'pointer', textDecoration: 'none' }}>
                <Stack gap="xs" align="center">
                  <IconCheckbox size={28} color="var(--mantine-color-orange-6)" />
                  <Text fw={500} size="sm">Tasks</Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
              <Card component={Link} href="/recipes" padding="md" radius="md" withBorder style={{ cursor: 'pointer', textDecoration: 'none' }}>
                <Stack gap="xs" align="center">
                  <IconChefHat size={28} color="var(--mantine-color-red-6)" />
                  <Text fw={500} size="sm">Recipes</Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
              <Card component={Link} href="/family" padding="md" radius="md" withBorder style={{ cursor: 'pointer', textDecoration: 'none' }}>
                <Stack gap="xs" align="center">
                  <IconUsers size={28} color="var(--mantine-color-violet-6)" />
                  <Text fw={500} size="sm">Family</Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
              <Card component={Link} href="/budget" padding="md" radius="md" withBorder style={{ cursor: 'pointer', textDecoration: 'none' }}>
                <Stack gap="xs" align="center">
                  <IconPigMoney size={28} color="var(--mantine-color-pink-6)" />
                  <Text fw={500} size="sm">Budget</Text>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Summary Stats Row */}
        <Grid>
          <Grid.Col span={{ base: 6, sm: 3 }}>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm">Events</Text>
                <IconCalendar size={20} color="var(--mantine-color-blue-6)" />
              </Group>
              <Text size="xl" fw={700}>{stats.events}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3 }}>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm">Shopping</Text>
                <IconShoppingCart size={20} color="var(--mantine-color-green-6)" />
              </Group>
              <Text size="xl" fw={700}>{stats.shopping}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3 }}>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm">Tasks</Text>
                <IconCheckbox size={20} color="var(--mantine-color-orange-6)" />
              </Group>
              <Text size="xl" fw={700}>{stats.tasks}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3 }}>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm">Budget</Text>
                <IconPigMoney size={20} color="var(--mantine-color-pink-6)" />
              </Group>
              <Text size="xl" fw={700}>
                {budgetData ? `${Math.round(budgetData.percentUsed)}%` : '-'}
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Main Content Grid */}
        <Grid>
          {/* Budget Overview */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
              <Group justify="space-between" mb="md">
                <Group>
                  <IconPigMoney size={24} color="var(--mantine-color-pink-6)" />
                  <Text fw={600} size="lg">Monthly Budget</Text>
                </Group>
                <Button component={Link} href="/budget" variant="subtle" size="xs">
                  View Details
                </Button>
              </Group>

              {budgetData && budgetData.totalBudget > 0 ? (
                <Stack gap="md">
                  <Group justify="center">
                    <RingProgress
                      size={140}
                      thickness={14}
                      roundCaps
                      sections={[
                        { value: Math.min(budgetData.percentUsed, 100), color: getBudgetColor(budgetData.percentUsed) },
                      ]}
                      label={
                        <Center>
                          <Stack gap={0} align="center">
                            <Text size="xl" fw={700}>{Math.round(budgetData.percentUsed)}%</Text>
                            <Text size="xs" c="dimmed">used</Text>
                          </Stack>
                        </Center>
                      }
                    />
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" c="dimmed">Spent</Text>
                      <Text fw={600} c={getBudgetColor(budgetData.percentUsed)}>
                        ${budgetData.totalSpent.toFixed(2)}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text size="xs" c="dimmed">Budget</Text>
                      <Text fw={600}>${budgetData.totalBudget.toFixed(2)}</Text>
                    </div>
                  </Group>
                  <Progress
                    value={Math.min(budgetData.percentUsed, 100)}
                    color={getBudgetColor(budgetData.percentUsed)}
                    size="lg"
                    radius="xl"
                  />
                  <Text size="xs" c="dimmed" ta="center">
                    ${Math.max(0, budgetData.totalBudget - budgetData.totalSpent).toFixed(2)} remaining for {new Date().toLocaleString('default', { month: 'long' })}
                  </Text>
                </Stack>
              ) : (
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <IconPigMoney size={40} color="var(--mantine-color-gray-5)" />
                    <Text size="sm" c="dimmed">No budget set for this month</Text>
                    <Button component={Link} href="/budget" variant="light" size="sm">
                      Set Budget
                    </Button>
                  </Stack>
                </Center>
              )}
            </Card>
          </Grid.Col>

          {/* Upcoming Events */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
              <Group justify="space-between" mb="md">
                <Group>
                  <IconCalendar size={24} color="var(--mantine-color-blue-6)" />
                  <Text fw={600} size="lg">Upcoming Events</Text>
                </Group>
                <Button component={Link} href="/calendar" variant="subtle" size="xs">
                  View Calendar
                </Button>
              </Group>

              {loadingData ? (
                <Stack gap="sm">
                  {[1, 2, 3].map(i => <Skeleton key={i} height={40} radius="md" />)}
                </Stack>
              ) : upcomingEvents.length > 0 ? (
                <Stack gap="sm">
                  {upcomingEvents.map((event) => (
                    <Card key={event.id} padding="sm" radius="md" withBorder>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                          <ThemeIcon
                            size="sm"
                            radius="xl"
                            color={event.color || 'blue'}
                            variant="light"
                          >
                            <IconCalendar size={14} />
                          </ThemeIcon>
                          <Text size="sm" fw={500} lineClamp={1}>
                            {event.title}
                          </Text>
                        </Group>
                        <Badge size="sm" variant="light" color="gray">
                          <Group gap={4}>
                            <IconClock size={12} />
                            {formatEventDate(event.startTime)}
                          </Group>
                        </Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <IconCalendar size={40} color="var(--mantine-color-gray-5)" />
                    <Text size="sm" c="dimmed">No upcoming events</Text>
                    <Button component={Link} href="/calendar" variant="light" size="sm">
                      Add Event
                    </Button>
                  </Stack>
                </Center>
              )}
            </Card>
          </Grid.Col>

          {/* Tasks List */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
              <Group justify="space-between" mb="md">
                <Group>
                  <IconCheckbox size={24} color="var(--mantine-color-orange-6)" />
                  <Text fw={600} size="lg">Active Tasks</Text>
                </Group>
                <Button component={Link} href="/tasks" variant="subtle" size="xs">
                  View All
                </Button>
              </Group>

              {loadingData ? (
                <Stack gap="sm">
                  {[1, 2, 3].map(i => <Skeleton key={i} height={40} radius="md" />)}
                </Stack>
              ) : recentTasks.length > 0 ? (
                <Stack gap="sm">
                  {recentTasks.map((task) => (
                    <Card key={task.id} padding="sm" radius="md" withBorder>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                          <ThemeIcon
                            size="sm"
                            radius="xl"
                            color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'blue'}
                            variant="light"
                          >
                            <IconCircle size={14} />
                          </ThemeIcon>
                          <div style={{ flex: 1 }}>
                            <Text size="sm" fw={500} lineClamp={1}>
                              {task.title}
                            </Text>
                            {task.assignedUser && (
                              <Text size="xs" c="dimmed">
                                Assigned to {task.assignedUser.name}
                              </Text>
                            )}
                          </div>
                        </Group>
                        {task.priority && (
                          <Badge
                            size="xs"
                            variant="light"
                            color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'blue'}
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <IconCircleCheck size={40} color="var(--mantine-color-green-5)" />
                    <Text size="sm" c="dimmed">All tasks completed!</Text>
                    <Button component={Link} href="/tasks" variant="light" size="sm">
                      Add Task
                    </Button>
                  </Stack>
                </Center>
              )}
            </Card>
          </Grid.Col>

          {/* Shopping List */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
              <Group justify="space-between" mb="md">
                <Group>
                  <IconShoppingCart size={24} color="var(--mantine-color-green-6)" />
                  <Text fw={600} size="lg">Shopping List</Text>
                </Group>
                <Button component={Link} href="/shopping" variant="subtle" size="xs">
                  View All
                </Button>
              </Group>

              {loadingData ? (
                <Stack gap="sm">
                  {[1, 2, 3].map(i => <Skeleton key={i} height={30} radius="md" />)}
                </Stack>
              ) : shoppingItems.length > 0 ? (
                <Stack gap="xs">
                  {shoppingItems.map((item) => (
                    <Group key={item.id} gap="sm" wrap="nowrap">
                      <ThemeIcon size="xs" radius="xl" color="green" variant="light">
                        <IconCircle size={10} />
                      </ThemeIcon>
                      <Text size="sm" style={{ flex: 1 }} lineClamp={1}>
                        {item.name}
                      </Text>
                      {item.quantity && item.quantity > 1 && (
                        <Badge size="xs" variant="outline" color="gray">
                          x{item.quantity}
                        </Badge>
                      )}
                      {item.category && (
                        <Badge size="xs" variant="light">
                          {item.category}
                        </Badge>
                      )}
                    </Group>
                  ))}
                  {stats.shopping > shoppingItems.length && (
                    <Text size="xs" c="dimmed" ta="center" mt="xs">
                      +{stats.shopping - shoppingItems.length} more items
                    </Text>
                  )}
                </Stack>
              ) : (
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <IconShoppingCart size={40} color="var(--mantine-color-gray-5)" />
                    <Text size="sm" c="dimmed">Shopping list is empty</Text>
                    <Button component={Link} href="/shopping" variant="light" size="sm">
                      Add Items
                    </Button>
                  </Stack>
                </Center>
              )}
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </AppLayout>
  );
}
