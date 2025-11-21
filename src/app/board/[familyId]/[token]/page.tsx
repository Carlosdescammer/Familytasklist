'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  Group,
  Badge,
  SimpleGrid,
  RingProgress,
  Center,
  Loader,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconChecklist,
  IconShoppingCart,
  IconCoin,
  IconClock,
  IconAlertCircle,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react';

interface BoardData {
  familyName: string;
  widgets: string[];
  lastUpdated: string;
  events?: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
    location?: string;
    color?: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    completed: boolean;
    priority: string;
    dueDate?: string;
    assigneeName: string;
  }>;
  shopping?: Array<{
    id: string;
    name: string;
    itemCount: number;
    items: Array<{
      id: string;
      name: string;
      quantity?: number;
      category?: string;
    }>;
  }>;
  budget?: {
    month: string;
    totalBudget: number;
    totalSpent: number;
    percentUsed: number;
  };
  clock?: {
    enabled: boolean;
  };
}

export default function FamilyBoardPage() {
  const params = useParams();
  const familyId = params.familyId as string;
  const token = params.token as string;

  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchBoardData = useCallback(async () => {
    try {
      const res = await fetch(`/api/board/${familyId}/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Board not found or disabled');
        }
        throw new Error('Failed to load board');
      }
      const data = await res.json();
      setBoardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [familyId, token]);

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    fetchBoardData();
    const interval = setInterval(fetchBoardData, 30000);
    return () => clearInterval(interval);
  }, [fetchBoardData]);

  // Update clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Center h="100vh" style={{ background: 'var(--mantine-color-dark-8)' }}>
        <Stack align="center" gap="md">
          <Loader size="xl" color="blue" />
          <Text c="dimmed">Loading Family Board...</Text>
        </Stack>
      </Center>
    );
  }

  if (error || !boardData) {
    return (
      <Center h="100vh" style={{ background: 'var(--mantine-color-dark-8)' }}>
        <Alert
          icon={<IconAlertCircle size={24} />}
          title="Board Not Available"
          color="red"
          variant="filled"
        >
          {error || 'This board is not available. Please check the URL or contact your family admin.'}
        </Alert>
      </Center>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1b1e 0%, #25262b 100%)',
        padding: '20px',
      }}
    >
      <Container size="xl">
        {/* Header */}
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={1} c="white" style={{ fontSize: '2.5rem' }}>
              {boardData.familyName}
            </Title>
            <Text c="dimmed" size="sm">
              Family Board
            </Text>
          </div>
          {boardData.widgets.includes('clock') && (
            <Card
              padding="md"
              radius="md"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <Stack gap={0} align="center">
                <Text
                  style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}
                  c="white"
                >
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text c="dimmed" size="lg">
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </Stack>
            </Card>
          )}
        </Group>

        {/* Widgets Grid */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Events Widget */}
          {boardData.widgets.includes('events') && boardData.events && (
            <Card
              padding="lg"
              radius="md"
              style={{ background: 'rgba(255,255,255,0.05)', height: 'fit-content' }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon size="lg" color="blue" variant="light" radius="md">
                  <IconCalendarEvent size={20} />
                </ThemeIcon>
                <Title order={3} c="white">
                  Upcoming Events
                </Title>
              </Group>
              <Stack gap="sm">
                {boardData.events.length === 0 ? (
                  <Text c="dimmed" ta="center" py="md">
                    No upcoming events
                  </Text>
                ) : (
                  boardData.events.slice(0, 6).map((event) => (
                    <Card
                      key={event.id}
                      padding="sm"
                      radius="sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderLeft: `4px solid ${event.color || '#228be6'}`,
                      }}
                    >
                      <Text c="white" fw={500}>
                        {event.title}
                      </Text>
                      <Group gap="xs">
                        <Text c="dimmed" size="sm">
                          {formatDate(event.startTime)} at {formatTime(event.startTime)}
                        </Text>
                        {event.location && (
                          <Badge size="sm" variant="light">
                            {event.location}
                          </Badge>
                        )}
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            </Card>
          )}

          {/* Tasks Widget */}
          {boardData.widgets.includes('tasks') && boardData.tasks && (
            <Card
              padding="lg"
              radius="md"
              style={{ background: 'rgba(255,255,255,0.05)', height: 'fit-content' }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon size="lg" color="green" variant="light" radius="md">
                  <IconChecklist size={20} />
                </ThemeIcon>
                <Title order={3} c="white">
                  Active Tasks
                </Title>
                <Badge color="gray" variant="light">
                  {boardData.tasks.length}
                </Badge>
              </Group>
              <Stack gap="sm">
                {boardData.tasks.length === 0 ? (
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <ThemeIcon size="xl" color="green" variant="light" radius="xl">
                        <IconCheck size={24} />
                      </ThemeIcon>
                      <Text c="dimmed">All tasks complete!</Text>
                    </Stack>
                  </Center>
                ) : (
                  boardData.tasks.slice(0, 8).map((task) => (
                    <Group
                      key={task.id}
                      justify="space-between"
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Text c="white" size="sm" fw={500}>
                          {task.title}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {task.assigneeName}
                          {task.dueDate && ` - Due ${formatDate(task.dueDate)}`}
                        </Text>
                      </div>
                      <Badge color={getPriorityColor(task.priority)} size="sm">
                        {task.priority}
                      </Badge>
                    </Group>
                  ))
                )}
              </Stack>
            </Card>
          )}

          {/* Shopping Widget */}
          {boardData.widgets.includes('shopping') && boardData.shopping && (
            <Card
              padding="lg"
              radius="md"
              style={{ background: 'rgba(255,255,255,0.05)', height: 'fit-content' }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon size="lg" color="orange" variant="light" radius="md">
                  <IconShoppingCart size={20} />
                </ThemeIcon>
                <Title order={3} c="white">
                  Shopping Lists
                </Title>
              </Group>
              <Stack gap="md">
                {boardData.shopping.length === 0 ? (
                  <Text c="dimmed" ta="center" py="md">
                    No active shopping lists
                  </Text>
                ) : (
                  boardData.shopping.map((list) => (
                    <div key={list.id}>
                      <Group gap="xs" mb="xs">
                        <Text c="white" fw={600}>
                          {list.name}
                        </Text>
                        <Badge color="orange" variant="light" size="sm">
                          {list.itemCount} items
                        </Badge>
                      </Group>
                      <Stack gap={4}>
                        {list.items.slice(0, 5).map((item) => (
                          <Group key={item.id} gap="xs">
                            <Text c="dimmed" size="sm">
                              {item.quantity && `${item.quantity}x `}
                              {item.name}
                            </Text>
                          </Group>
                        ))}
                        {list.items.length > 5 && (
                          <Text c="dimmed" size="xs">
                            +{list.items.length - 5} more items
                          </Text>
                        )}
                      </Stack>
                    </div>
                  ))
                )}
              </Stack>
            </Card>
          )}

          {/* Budget Widget */}
          {boardData.widgets.includes('budget') && boardData.budget && (
            <Card
              padding="lg"
              radius="md"
              style={{ background: 'rgba(255,255,255,0.05)', height: 'fit-content' }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon size="lg" color="teal" variant="light" radius="md">
                  <IconCoin size={20} />
                </ThemeIcon>
                <Title order={3} c="white">
                  Budget Overview
                </Title>
              </Group>
              <Group justify="center" align="center" gap="xl">
                <RingProgress
                  size={140}
                  thickness={14}
                  roundCaps
                  sections={[
                    {
                      value: Math.min(boardData.budget.percentUsed, 100),
                      color:
                        boardData.budget.percentUsed >= 100
                          ? 'red'
                          : boardData.budget.percentUsed >= 80
                          ? 'yellow'
                          : 'teal',
                    },
                  ]}
                  label={
                    <Center>
                      <Text c="white" fw={700} size="xl">
                        {boardData.budget.percentUsed}%
                      </Text>
                    </Center>
                  }
                />
                <Stack gap="xs">
                  <div>
                    <Text c="dimmed" size="sm">
                      Spent
                    </Text>
                    <Text c="white" size="xl" fw={700}>
                      ${boardData.budget.totalSpent.toLocaleString()}
                    </Text>
                  </div>
                  <div>
                    <Text c="dimmed" size="sm">
                      Budget
                    </Text>
                    <Text c="white" size="lg">
                      ${boardData.budget.totalBudget.toLocaleString()}
                    </Text>
                  </div>
                </Stack>
              </Group>
            </Card>
          )}
        </SimpleGrid>

        {/* Footer */}
        <Group justify="center" mt="xl" gap="xs">
          <IconRefresh size={14} color="gray" />
          <Text c="dimmed" size="xs">
            Auto-refreshes every 30 seconds - Last updated:{' '}
            {new Date(boardData.lastUpdated).toLocaleTimeString()}
          </Text>
        </Group>
      </Container>
    </div>
  );
}
