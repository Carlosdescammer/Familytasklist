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
  Image,
  Transition,
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
  IconPhoto,
  IconCloudRain,
  IconSun,
  IconCake,
  IconCalendar,
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
  photos?: Array<{
    id: string;
    url: string;
    caption?: string;
    uploaderName: string;
    createdAt: string;
  }>;
  clock?: {
    enabled: boolean;
  };
  weather?: {
    location: string;
    current: {
      temp: string;
      feelsLike: string;
      condition: string;
      humidity: string;
      windSpeed: string;
      icon: string;
    } | null;
    forecast: Array<{
      date: string;
      maxTemp: string;
      minTemp: string;
      condition: string;
      icon: string;
    }>;
    error?: string;
  };
  birthdays?: Array<{
    id: string;
    name: string;
    birthday: string;
    daysUntil: number;
    age: number;
    avatarUrl?: string;
  }>;
  calendar?: {
    month: number;
    year: number;
    events: Array<{
      id: string;
      title: string;
      startTime: string;
      endTime?: string;
      color?: string;
    }>;
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
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

  // Photo carousel auto-advance every 5 seconds
  useEffect(() => {
    if (boardData?.photos && boardData.photos.length > 1) {
      const photoInterval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % boardData.photos!.length);
      }, 5000);
      return () => clearInterval(photoInterval);
    }
  }, [boardData?.photos]);

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
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1b1e 50%, #25262b 100%)',
        padding: '20px',
        animation: 'fadeIn 0.5s ease-in',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .widget-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideUp 0.6s ease-out;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .widget-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .photo-carousel {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
        }
        .photo-carousel img {
          transition: opacity 0.5s ease-in-out;
        }
      `}</style>
      <Container size="xl">
        {/* Header */}
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={1} c="white" style={{ fontSize: '2.5rem' }}>
              {boardData.familyName}
            </Title>
            <Text c="gray.4" size="sm">
              Family Board
            </Text>
          </div>
          {boardData.widgets.includes('clock') && (
            <Card
              padding="md"
              radius="md"
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Stack gap={0} align="center">
                <Text
                  style={{
                    fontSize: '3rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  }}
                  c="white"
                >
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text c="gray.3" size="lg" style={{ fontWeight: 500 }}>
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
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                height: 'fit-content',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
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
                  <Text c="gray.3" ta="center" py="md">
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
                        <Text c="gray.3" size="sm">
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
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                height: 'fit-content',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
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
                      <Text c="gray.3">All tasks complete!</Text>
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
                        <Text c="gray.3" size="xs">
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
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                height: 'fit-content',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
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
                  <Text c="gray.3" ta="center" py="md">
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
                            <Text c="gray.3" size="sm">
                              {item.quantity && `${item.quantity}x `}
                              {item.name}
                            </Text>
                          </Group>
                        ))}
                        {list.items.length > 5 && (
                          <Text c="gray.3" size="xs">
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
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                height: 'fit-content',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
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
                    <Text c="gray.4" size="sm">
                      Spent
                    </Text>
                    <Text c="white" size="xl" fw={700}>
                      ${boardData.budget.totalSpent.toLocaleString()}
                    </Text>
                  </div>
                  <div>
                    <Text c="gray.4" size="sm">
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

          {/* Photos Widget */}
          {boardData.widgets.includes('photos') && boardData.photos && (
            <Card
              padding="lg"
              radius="md"
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                height: 'fit-content',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon size="lg" color="pink" variant="light" radius="md">
                  <IconPhoto size={20} />
                </ThemeIcon>
                <Title order={3} c="white">
                  Family Photos
                </Title>
                <Badge color="pink" variant="light" size="sm">
                  {boardData.photos!.length}
                </Badge>
              </Group>
              {boardData.photos!.length === 0 ? (
                <Text c="gray.3" ta="center" py="xl">
                  No photos yet
                </Text>
              ) : (
                <div className="photo-carousel">
                  <Transition
                    mounted={mounted}
                    transition="fade"
                    duration={500}
                    timingFunction="ease"
                  >
                    {(styles) => (
                      <div style={styles}>
                        <Image
                          src={boardData.photos![currentPhotoIndex].url}
                          alt={boardData.photos![currentPhotoIndex].caption || 'Family photo'}
                          radius="md"
                          h={300}
                          fit="cover"
                          style={{
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          }}
                        />
                        <Stack
                          gap="xs"
                          mt="md"
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '12px',
                            borderRadius: '8px',
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          {boardData.photos![currentPhotoIndex].caption && (
                            <Text c="white" size="sm" fw={500}>
                              {boardData.photos![currentPhotoIndex].caption}
                            </Text>
                          )}
                          <Group justify="space-between">
                            <Text c="gray.3" size="xs">
                              By {boardData.photos![currentPhotoIndex].uploaderName}
                            </Text>
                            <Text c="gray.3" size="xs">
                              {currentPhotoIndex + 1} / {boardData.photos!.length}
                            </Text>
                          </Group>
                        </Stack>
                      </div>
                    )}
                  </Transition>
                </div>
              )}
            </Card>
          )}

          {/* Weather Widget */}
          {boardData.widgets.includes('weather') && boardData.weather && (
            <Card
              padding="lg"
              radius="md"
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                height: 'fit-content',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon size="lg" color="cyan" variant="light" radius="md">
                  {boardData.weather.current ? <IconSun size={20} /> : <IconCloudRain size={20} />}
                </ThemeIcon>
                <Title order={3} c="white">
                  Weather
                </Title>
              </Group>

              {boardData.weather.error ? (
                <Text c="gray.3" ta="center" py="md">
                  {boardData.weather.error}
                </Text>
              ) : boardData.weather.current ? (
                <Stack gap="md">
                  <div>
                    <Text c="gray.4" size="sm" mb="xs">
                      {boardData.weather.location}
                    </Text>
                    <Group gap="xl">
                      <div>
                        <Text c="white" size="3rem" fw={700} lh={1}>
                          {boardData.weather.current.temp}°F
                        </Text>
                        <Text c="gray.3" size="sm">
                          Feels like {boardData.weather.current.feelsLike}°F
                        </Text>
                      </div>
                      <Stack gap={4}>
                        <Text c="white" size="lg" fw={500}>
                          {boardData.weather.current.condition}
                        </Text>
                        <Text c="gray.4" size="sm">
                          Humidity: {boardData.weather.current.humidity}%
                        </Text>
                        <Text c="gray.4" size="sm">
                          Wind: {boardData.weather.current.windSpeed} mph
                        </Text>
                      </Stack>
                    </Group>
                  </div>

                  {boardData.weather.forecast.length > 0 && (
                    <div>
                      <Text c="gray.4" size="sm" mb="xs" fw={500}>
                        3-Day Forecast
                      </Text>
                      <SimpleGrid cols={3}>
                        {boardData.weather.forecast.map((day, index) => (
                          <div
                            key={index}
                            style={{
                              background: 'rgba(0,0,0,0.2)',
                              padding: '8px',
                              borderRadius: '8px',
                              textAlign: 'center',
                            }}
                          >
                            <Text c="gray.3" size="xs" mb={4}>
                              {new Date(day.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                              })}
                            </Text>
                            <Text c="white" size="sm" fw={600}>
                              {day.maxTemp}° / {day.minTemp}°
                            </Text>
                            <Text c="gray.4" size="xs" mt={4}>
                              {day.condition}
                            </Text>
                          </div>
                        ))}
                      </SimpleGrid>
                    </div>
                  )}
                </Stack>
              ) : (
                <Text c="gray.3" ta="center" py="md">
                  Weather data unavailable
                </Text>
              )}
            </Card>
          )}

          {/* Birthdays Widget */}
          {boardData.widgets.includes('birthdays') && boardData.birthdays && (
            <Card
              padding="lg"
              radius="md"
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                height: 'fit-content',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon size="lg" color="grape" variant="light" radius="md">
                  <IconCake size={20} />
                </ThemeIcon>
                <Title order={3} c="white">
                  Upcoming Birthdays
                </Title>
                <Badge color="grape" variant="light" size="sm">
                  {boardData.birthdays.length}
                </Badge>
              </Group>

              {boardData.birthdays.length === 0 ? (
                <Text c="gray.3" ta="center" py="xl">
                  No birthdays in the next 60 days
                </Text>
              ) : (
                <Stack gap="sm">
                  {boardData.birthdays.slice(0, 5).map((birthday) => (
                    <div
                      key={birthday.id}
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '12px',
                        borderRadius: '8px',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <Group justify="space-between">
                        <Group gap="sm">
                          <ThemeIcon size="md" color="grape" variant="light" radius="xl">
                            <IconCake size={16} />
                          </ThemeIcon>
                          <div>
                            <Text c="white" size="sm" fw={500}>
                              {birthday.name}
                            </Text>
                            <Text c="gray.4" size="xs">
                              {new Date(birthday.birthday).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              • Turning {birthday.age}
                            </Text>
                          </div>
                        </Group>
                        <Badge
                          color={birthday.daysUntil === 0 ? 'grape' : 'gray'}
                          variant={birthday.daysUntil === 0 ? 'filled' : 'light'}
                          size="sm"
                        >
                          {birthday.daysUntil === 0
                            ? 'Today!'
                            : `${birthday.daysUntil} day${birthday.daysUntil === 1 ? '' : 's'}`}
                        </Badge>
                      </Group>
                    </div>
                  ))}
                </Stack>
              )}
            </Card>
          )}

          {/* Calendar Widget */}
          {boardData.widgets.includes('calendar') && boardData.calendar && (
            <Card
              padding="lg"
              radius="md"
              className="widget-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                gridColumn: 'span 2',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon size="lg" color="blue" variant="light" radius="md">
                  <IconCalendar size={20} />
                </ThemeIcon>
                <Title order={3} c="white">
                  {new Date(boardData.calendar.year, boardData.calendar.month).toLocaleDateString(
                    'en-US',
                    {
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </Title>
                <Badge color="blue" variant="light" size="sm">
                  {boardData.calendar.events.length} event
                  {boardData.calendar.events.length !== 1 ? 's' : ''}
                </Badge>
              </Group>

              {(() => {
                const year = boardData.calendar!.year;
                const month = boardData.calendar!.month;
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const days = [];

                // Add empty cells for days before the 1st
                for (let i = 0; i < firstDay; i++) {
                  days.push(<div key={`empty-${i}`} />);
                }

                // Add calendar days
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = new Date(year, month, day).toISOString().split('T')[0];
                  const dayEvents = boardData.calendar!.events.filter((e) =>
                    e.startTime.startsWith(dateStr)
                  );
                  const isToday =
                    new Date().toDateString() === new Date(year, month, day).toDateString();

                  days.push(
                    <div
                      key={day}
                      style={{
                        background: isToday
                          ? 'rgba(34, 139, 230, 0.2)'
                          : 'rgba(0,0,0,0.2)',
                        padding: '8px',
                        borderRadius: '8px',
                        border: isToday ? '2px solid rgba(34, 139, 230, 0.5)' : 'none',
                        minHeight: '80px',
                      }}
                    >
                      <Text
                        c={isToday ? 'blue.4' : 'white'}
                        size="sm"
                        fw={isToday ? 700 : 500}
                        mb={4}
                      >
                        {day}
                      </Text>
                      <Stack gap={2}>
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            style={{
                              background: event.color || '#228be6',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              color: 'white',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <Text c="gray.4" size="9px">
                            +{dayEvents.length - 2} more
                          </Text>
                        )}
                      </Stack>
                    </div>
                  );
                }

                return (
                  <SimpleGrid cols={7} spacing="xs">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <Text
                        key={day}
                        c="gray.4"
                        size="xs"
                        fw={600}
                        ta="center"
                        mb="xs"
                      >
                        {day}
                      </Text>
                    ))}
                    {days}
                  </SimpleGrid>
                );
              })()}
            </Card>
          )}
        </SimpleGrid>

        {/* Footer */}
        <Group justify="center" mt="xl" gap="xs">
          <IconRefresh size={14} color="gray" />
          <Text c="gray.5" size="xs">
            Auto-refreshes every 30 seconds - Last updated:{' '}
            {new Date(boardData.lastUpdated).toLocaleTimeString()}
          </Text>
        </Group>
      </Container>
    </div>
  );
}
