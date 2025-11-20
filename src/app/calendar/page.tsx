'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Button,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Group,
  Card,
  Text,
  Badge,
  Indicator,
  Select,
  MultiSelect,
  ColorInput,
  Checkbox,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { Calendar } from '@mantine/dates';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import dayjs from 'dayjs';

type Event = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  eventType?: string;
  attendees?: string; // Comma-separated user IDs
  url?: string;
  color?: string;
  notes?: string;
  startTime: string;
  endTime: string;
};

type Task = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: string;
  completed: boolean;
};

type ShoppingList = {
  id: string;
  name: string;
  description?: string;
  eventId?: string;
  members?: string;
  isFamilyList: boolean;
  items?: any[];
  event?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  };
};

export default function CalendarPage() {
  const { user } = useCurrentUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [modalOpened, setModalOpened] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventDetailModalOpened, setEventDetailModalOpened] = useState(false);
  const [taskDetailModalOpened, setTaskDetailModalOpened] = useState(false);
  const [shoppingListModalOpened, setShoppingListModalOpened] = useState(false);
  const [shoppingListDetailModalOpened, setShoppingListDetailModalOpened] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedShoppingList, setSelectedShoppingList] = useState<ShoppingList | null>(null);
  const [editingShoppingList, setEditingShoppingList] = useState<ShoppingList | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    eventType: '',
    attendees: [] as string[],
    url: '',
    color: '#228be6',
    notes: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000), // 1 hour later
  });

  const [shoppingListFormData, setShoppingListFormData] = useState({
    name: '',
    description: '',
    eventId: null as string | null,
    members: [] as string[],
    isFamilyList: false,
  });

  const [createShoppingListWithEvent, setCreateShoppingListWithEvent] = useState(false);
  const [shoppingListName, setShoppingListName] = useState('');
  const [linkExistingList, setLinkExistingList] = useState(false);
  const [selectedExistingListId, setSelectedExistingListId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchTasks();
    fetchShoppingLists();
    fetchFamilyMembers();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchShoppingLists = async () => {
    try {
      const res = await fetch('/api/shopping-lists');
      const data = await res.json();
      if (Array.isArray(data)) setShoppingLists(data);
    } catch (error) {
      console.error('Error fetching shopping lists:', error);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const res = await fetch('/api/families');
      if (res.ok) {
        const data = await res.json();
        setFamilyMembers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      notifications.show({ title: 'Error', message: 'Title is required', color: 'red' });
      return;
    }

    if (createShoppingListWithEvent && !shoppingListName.trim()) {
      notifications.show({ title: 'Error', message: 'Shopping list name is required', color: 'red' });
      return;
    }

    if (linkExistingList && !selectedExistingListId) {
      notifications.show({ title: 'Error', message: 'Please select a shopping list to link', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          eventType: formData.eventType,
          attendees: formData.attendees.join(','), // Convert array to comma-separated string
          url: formData.url,
          color: formData.color,
          notes: formData.notes,
          startTime: formData.startTime.toISOString(),
          endTime: formData.endTime.toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to save event');

      const savedEvent = await res.json();

      // Create new shopping list if option is checked and this is a new event
      if (createShoppingListWithEvent && !editingEvent) {
        try {
          const listRes = await fetch('/api/shopping-lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: shoppingListName,
              description: `Shopping list for ${formData.title}`,
              eventId: savedEvent.id,
              members: formData.attendees.join(','),
              isFamilyList: formData.attendees.length === 0,
            }),
          });

          if (listRes.ok) {
            notifications.show({
              title: 'Success',
              message: 'Event and shopping list created',
              color: 'green',
            });
          }
        } catch (listError) {
          console.error('Error creating shopping list:', listError);
          notifications.show({
            title: 'Warning',
            message: 'Event created but shopping list failed',
            color: 'yellow',
          });
        }
      }
      // Link existing shopping list to the event
      else if (linkExistingList && selectedExistingListId && !editingEvent) {
        try {
          const listRes = await fetch(`/api/shopping-lists/${selectedExistingListId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: savedEvent.id,
            }),
          });

          if (listRes.ok) {
            notifications.show({
              title: 'Success',
              message: 'Event created and shopping list linked',
              color: 'green',
            });
          }
        } catch (listError) {
          console.error('Error linking shopping list:', listError);
          notifications.show({
            title: 'Warning',
            message: 'Event created but shopping list link failed',
            color: 'yellow',
          });
        }
      }
      else {
        notifications.show({
          title: 'Success',
          message: editingEvent ? 'Event updated' : 'Event created',
          color: 'green',
        });
      }

      setModalOpened(false);
      resetForm();
      fetchEvents();
      fetchShoppingLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to save event', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      notifications.show({ title: 'Success', message: 'Event deleted', color: 'green' });
      fetchEvents();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to delete event', color: 'red' });
    }
  };

  const handleShoppingListSubmit = async () => {
    if (!shoppingListFormData.name.trim()) {
      notifications.show({ title: 'Error', message: 'Name is required', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      const url = editingShoppingList ? `/api/shopping-lists/${editingShoppingList.id}` : '/api/shopping-lists';
      const method = editingShoppingList ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: shoppingListFormData.name,
          description: shoppingListFormData.description,
          eventId: shoppingListFormData.eventId,
          members: shoppingListFormData.members.join(','),
          isFamilyList: shoppingListFormData.isFamilyList,
        }),
      });

      if (!res.ok) throw new Error('Failed to save shopping list');

      notifications.show({
        title: 'Success',
        message: editingShoppingList ? 'Shopping list updated' : 'Shopping list created',
        color: 'green',
      });

      setShoppingListModalOpened(false);
      setShoppingListFormData({
        name: '',
        description: '',
        eventId: null,
        members: [],
        isFamilyList: false,
      });
      setEditingShoppingList(null);
      fetchShoppingLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to save shopping list', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShoppingList = async (id: string) => {
    try {
      const res = await fetch(`/api/shopping-lists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      notifications.show({ title: 'Success', message: 'Shopping list deleted', color: 'green' });
      setShoppingListDetailModalOpened(false);
      fetchShoppingLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to delete shopping list', color: 'red' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      eventType: '',
      attendees: [],
      url: '',
      color: '#228be6',
      notes: '',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
    });
    setEditingEvent(null);
    setCreateShoppingListWithEvent(false);
    setShoppingListName('');
    setLinkExistingList(false);
    setSelectedExistingListId(null);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      eventType: event.eventType || '',
      attendees: event.attendees ? event.attendees.split(',').filter(Boolean) : [],
      url: event.url || '',
      color: event.color || '#228be6',
      notes: event.notes || '',
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
    });
    setModalOpened(true);
  };

  const todaysEvents = events.filter((event) =>
    dayjs(event.startTime).isSame(selectedDate, 'day')
  );

  const todaysTasks = tasks.filter((task) =>
    task.dueDate && dayjs(task.dueDate).isSame(selectedDate, 'day')
  );

  const todaysShoppingLists = shoppingLists.filter((list) =>
    list.event && dayjs(list.event.startTime).isSame(selectedDate, 'day')
  );

  // Get all upcoming events, tasks, and shopping lists (future items)
  const upcomingEvents = events.filter((event) =>
    dayjs(event.startTime).isAfter(dayjs(), 'day')
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const upcomingTasks = tasks.filter((task) =>
    task.dueDate && dayjs(task.dueDate).isAfter(dayjs(), 'day') && !task.completed
  ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const upcomingShoppingLists = shoppingLists.filter((list) =>
    list.event && dayjs(list.event.startTime).isAfter(dayjs(), 'day')
  ).sort((a, b) => new Date(a.event!.startTime).getTime() - new Date(b.event!.startTime).getTime());

  const renderDay = (date: Date) => {
    const hasEvent = events.some((event) =>
      dayjs(event.startTime).isSame(date, 'day')
    );
    const hasTask = tasks.some((task) =>
      task.dueDate && dayjs(task.dueDate).isSame(date, 'day')
    );
    const hasShoppingList = shoppingLists.some((list) =>
      list.event && dayjs(list.event.startTime).isSame(date, 'day')
    );

    const day = date.getDate();

    const indicators = [];
    if (hasEvent) indicators.push('blue');
    if (hasTask) indicators.push('grape');
    if (hasShoppingList) indicators.push('green');

    if (indicators.length === 0) return <div>{day}</div>;

    if (indicators.length === 1) {
      return (
        <Indicator inline size={6} color={indicators[0]} offset={-2}>
          <div>{day}</div>
        </Indicator>
      );
    }

    if (indicators.length === 2) {
      return (
        <Indicator inline size={6} color={indicators[0]} offset={-2}>
          <Indicator inline size={6} color={indicators[1]} offset={-2} position="bottom-end">
            <div>{day}</div>
          </Indicator>
        </Indicator>
      );
    }

    // 3 indicators
    return (
      <Indicator inline size={6} color={indicators[0]} offset={-2}>
        <Indicator inline size={6} color={indicators[1]} offset={-2} position="bottom-end">
          <Indicator inline size={6} color={indicators[2]} offset={-2} position="top-end">
            <div>{day}</div>
          </Indicator>
        </Indicator>
      </Indicator>
    );
  };

  return (
    <AppLayout>
      <PageAccessGuard pageName="calendar">
        <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>Calendar</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              resetForm();
              setModalOpened(true);
            }}
          >
            Add Event
          </Button>
        </Group>

        <Calendar
          date={selectedDate}
          onDateChange={(date) => setSelectedDate(date)}
          renderDay={renderDay}
        />

        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={3}>{dayjs(selectedDate).format('MMMM D, YYYY')}</Title>
            <Group gap="xs">
              <Badge color="blue" variant="dot">Events</Badge>
              <Badge color="grape" variant="dot">Tasks</Badge>
              <Badge color="green" variant="dot">Shopping Lists</Badge>
            </Group>
          </Group>

          {todaysEvents.length === 0 && todaysTasks.length === 0 && todaysShoppingLists.length === 0 ? (
            <Text c="dimmed">No events, tasks, or shopping lists for this day</Text>
          ) : (
            <>
              {todaysEvents.map((event) => (
                <Card
                  key={`event-${event.id}`}
                  shadow="sm"
                  padding="md"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setEventDetailModalOpened(true);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Badge color={event.color || 'blue'} size="sm">Event</Badge>
                        {event.eventType && <Badge color="gray" size="xs" variant="light">{event.eventType}</Badge>}
                        <Text fw={500}>{event.title}</Text>
                      </Group>
                      <Text size="sm" c="dimmed" mt="xs">
                        {dayjs(event.startTime).format('h:mm A')} -{' '}
                        {dayjs(event.endTime).format('h:mm A')}
                      </Text>
                      {event.location && (
                        <Text size="sm" c="dimmed" mt="xs">
                          📍 {event.location}
                        </Text>
                      )}
                      {event.description && (
                        <Text size="sm" mt="xs" lineClamp={1}>
                          {event.description}
                        </Text>
                      )}
                    </div>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(event);
                        }}
                        leftSection={<IconEdit size={14} />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(event.id);
                        }}
                        leftSection={<IconTrash size={14} />}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Group>
                </Card>
              ))}

              {todaysTasks.map((task) => (
                <Card
                  key={`task-${task.id}`}
                  shadow="sm"
                  padding="md"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => {
                    setSelectedTask(task);
                    setTaskDetailModalOpened(true);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Badge color="grape" size="sm">Task</Badge>
                        <Text fw={500} style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                          {task.title}
                        </Text>
                        {task.completed && (
                          <Badge color="green" size="xs">Completed</Badge>
                        )}
                      </Group>
                      {task.notes && (
                        <Text size="sm" c="dimmed" mt="xs" lineClamp={2}>
                          {task.notes}
                        </Text>
                      )}
                      <Group gap="xs" mt="xs">
                        <Badge size="xs" color={
                          task.priority === 'high' ? 'red' :
                          task.priority === 'medium' ? 'yellow' : 'blue'
                        }>
                          {task.priority}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Due: {dayjs(task.dueDate).format('h:mm A')}
                        </Text>
                      </Group>
                    </div>
                  </Group>
                </Card>
              ))}

              {todaysShoppingLists.map((list) => (
                <Card
                  key={`shopping-${list.id}`}
                  shadow="sm"
                  padding="md"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => {
                    setSelectedShoppingList(list);
                    setShoppingListDetailModalOpened(true);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Badge color="green" size="sm">Shopping List</Badge>
                        {list.isFamilyList && <Badge color="blue" size="xs" variant="light">Family List</Badge>}
                        <Text fw={500}>{list.name}</Text>
                      </Group>
                      {list.description && (
                        <Text size="sm" c="dimmed" mt="xs" lineClamp={1}>
                          {list.description}
                        </Text>
                      )}
                      {list.event && (
                        <Text size="sm" c="dimmed" mt="xs">
                          📅 {list.event.title} - {dayjs(list.event.startTime).format('h:mm A')}
                        </Text>
                      )}
                      {list.items && list.items.length > 0 && (
                        <Text size="xs" c="dimmed" mt="xs">
                          {list.items.filter(i => i.completed).length} of {list.items.length} items completed
                        </Text>
                      )}
                    </div>
                  </Group>
                </Card>
              ))}
            </>
          )}
        </Stack>

        {/* Upcoming Items Section */}
        <Stack gap="md" mt="xl">
          <Group justify="space-between" align="center">
            <Title order={3}>Upcoming</Title>
            <Group gap="xs">
              <Badge color="blue" variant="dot">Events</Badge>
              <Badge color="grape" variant="dot">Tasks</Badge>
              <Badge color="green" variant="dot">Shopping Lists</Badge>
            </Group>
          </Group>

          {upcomingEvents.length === 0 && upcomingTasks.length === 0 && upcomingShoppingLists.length === 0 ? (
            <Text c="dimmed">No upcoming events, tasks, or shopping lists</Text>
          ) : (
            <>
              {upcomingEvents.map((event) => (
                <Card
                  key={`upcoming-event-${event.id}`}
                  shadow="sm"
                  padding="md"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setEventDetailModalOpened(true);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Badge color={event.color || 'blue'} size="sm">Event</Badge>
                        {event.eventType && <Badge color="gray" size="xs" variant="light">{event.eventType}</Badge>}
                        <Text fw={500}>{event.title}</Text>
                      </Group>
                      <Text size="sm" c="dimmed" mt="xs">
                        📅 {dayjs(event.startTime).format('MMMM D, YYYY')} at {dayjs(event.startTime).format('h:mm A')} - {dayjs(event.endTime).format('h:mm A')}
                      </Text>
                      {event.location && (
                        <Text size="sm" c="dimmed" mt="xs">
                          📍 {event.location}
                        </Text>
                      )}
                      {event.description && (
                        <Text size="sm" mt="xs" lineClamp={1}>
                          {event.description}
                        </Text>
                      )}
                    </div>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(event);
                        }}
                        leftSection={<IconEdit size={14} />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(event.id);
                        }}
                        leftSection={<IconTrash size={14} />}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Group>
                </Card>
              ))}

              {upcomingTasks.map((task) => (
                <Card
                  key={`upcoming-task-${task.id}`}
                  shadow="sm"
                  padding="md"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => {
                    setSelectedTask(task);
                    setTaskDetailModalOpened(true);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Badge color="grape" size="sm">Task</Badge>
                        <Text fw={500}>{task.title}</Text>
                      </Group>
                      {task.notes && (
                        <Text size="sm" c="dimmed" mt="xs" lineClamp={2}>
                          {task.notes}
                        </Text>
                      )}
                      <Group gap="xs" mt="xs">
                        <Badge size="xs" color={
                          task.priority === 'high' ? 'red' :
                          task.priority === 'medium' ? 'yellow' : 'blue'
                        }>
                          {task.priority}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          📅 Due: {dayjs(task.dueDate).format('MMMM D, YYYY [at] h:mm A')}
                        </Text>
                      </Group>
                    </div>
                  </Group>
                </Card>
              ))}

              {upcomingShoppingLists.map((list) => (
                <Card
                  key={`upcoming-shopping-${list.id}`}
                  shadow="sm"
                  padding="md"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => {
                    setSelectedShoppingList(list);
                    setShoppingListDetailModalOpened(true);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Badge color="green" size="sm">Shopping List</Badge>
                        {list.isFamilyList && <Badge color="blue" size="xs" variant="light">Family List</Badge>}
                        <Text fw={500}>{list.name}</Text>
                      </Group>
                      {list.description && (
                        <Text size="sm" c="dimmed" mt="xs" lineClamp={1}>
                          {list.description}
                        </Text>
                      )}
                      {list.event && (
                        <Text size="sm" c="dimmed" mt="xs">
                          📅 {list.event.title} - {dayjs(list.event.startTime).format('MMMM D, YYYY [at] h:mm A')}
                        </Text>
                      )}
                      {list.items && list.items.length > 0 && (
                        <Text size="xs" c="dimmed" mt="xs">
                          {list.items.filter(i => i.completed).length} of {list.items.length} items completed
                        </Text>
                      )}
                    </div>
                  </Group>
                </Card>
              ))}
            </>
          )}
        </Stack>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          resetForm();
        }}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
      >
        <Stack>
          <TextInput
            label="Title"
            placeholder="Event title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            placeholder="Event description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <Select
            label="Event Type"
            placeholder="Select event type"
            value={formData.eventType}
            onChange={(value) => setFormData({ ...formData, eventType: value || '' })}
            data={[
              { value: 'Birthday', label: 'Birthday' },
              { value: 'Anniversary', label: 'Anniversary' },
              { value: 'Appointment', label: 'Appointment' },
              { value: 'Family Gathering', label: 'Family Gathering' },
              { value: 'School Event', label: 'School Event' },
              { value: 'Sports Event', label: 'Sports Event' },
              { value: 'Medical', label: 'Medical' },
              { value: 'Work', label: 'Work' },
              { value: 'Vacation', label: 'Vacation' },
              { value: 'Other', label: 'Other' },
            ]}
            clearable
            searchable
          />
          <TextInput
            label="Location"
            placeholder="Address or location name"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            description="Where is this event taking place?"
          />
          <div>
            <Text size="sm" fw={500} mb="xs">
              Attendees
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Select family members who will attend this event
            </Text>
            <Checkbox.Group
              value={formData.attendees}
              onChange={(value) => setFormData({ ...formData, attendees: value })}
            >
              <Stack gap="xs">
                {familyMembers.map((member) => {
                  let label = member.name || member.email.split('@')[0];
                  if (member.relationship) {
                    label = `${label} (${member.relationship})`;
                  }
                  return (
                    <Checkbox
                      key={member.id}
                      value={member.id}
                      label={label}
                    />
                  );
                })}
              </Stack>
            </Checkbox.Group>
          </div>
          <TextInput
            label="Event Link/URL"
            placeholder="https://example.com"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            description="Link to virtual meeting, tickets, or related information"
          />
          <ColorInput
            label="Color"
            value={formData.color}
            onChange={(value) => setFormData({ ...formData, color: value })}
            format="hex"
            swatches={['#228be6', '#fa5252', '#40c057', '#fd7e14', '#be4bdb', '#15aabf', '#fab005']}
            description="Choose a color to visually identify this event"
          />
          <Textarea
            label="Additional Notes"
            placeholder="Any additional information..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            description="Extra details or reminders about this event"
          />
          {!editingEvent && (
            <>
              <Checkbox
                label="Create new shopping list for this event"
                checked={createShoppingListWithEvent}
                onChange={(e) => {
                  setCreateShoppingListWithEvent(e.currentTarget.checked);
                  if (e.currentTarget.checked) {
                    setLinkExistingList(false);
                    setSelectedExistingListId(null);
                  }
                }}
              />
              {createShoppingListWithEvent && (
                <TextInput
                  label="Shopping List Name"
                  placeholder="e.g., Party Supplies"
                  value={shoppingListName}
                  onChange={(e) => setShoppingListName(e.target.value)}
                  required
                />
              )}
              <Checkbox
                label="Link existing shopping list to this event"
                checked={linkExistingList}
                onChange={(e) => {
                  setLinkExistingList(e.currentTarget.checked);
                  if (e.currentTarget.checked) {
                    setCreateShoppingListWithEvent(false);
                    setShoppingListName('');
                  }
                }}
              />
              {linkExistingList && (
                <Select
                  label="Select Shopping List"
                  placeholder="Choose an existing shopping list"
                  value={selectedExistingListId}
                  onChange={(value) => setSelectedExistingListId(value)}
                  data={shoppingLists
                    .filter(list => !list.eventId)
                    .map(list => ({
                      value: list.id,
                      label: `${list.name}${list.isFamilyList ? ' (Family List)' : ''}`
                    }))}
                  required
                  searchable
                  clearable
                  nothingFoundMessage="No available shopping lists. Create one from the Shopping page first."
                />
              )}
            </>
          )}
          <DateTimePicker
            label="Start Time"
            value={formData.startTime}
            onChange={(date) => date && setFormData({ ...formData, startTime: date })}
            required
          />
          <DateTimePicker
            label="End Time"
            value={formData.endTime}
            onChange={(date) => date && setFormData({ ...formData, endTime: date })}
            required
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              {editingEvent ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        opened={eventDetailModalOpened}
        onClose={() => {
          setEventDetailModalOpened(false);
          setSelectedEvent(null);
        }}
        title="Event Details"
        size="lg"
      >
        {selectedEvent && (
          <Stack gap="md">
            <div>
              <Group gap="xs">
                <Text size="sm" fw={500} c="dimmed">Title</Text>
                {selectedEvent.eventType && (
                  <Badge color="gray" size="sm" variant="light">
                    {selectedEvent.eventType}
                  </Badge>
                )}
              </Group>
              <Group gap="xs" mt="xs">
                {selectedEvent.color && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: selectedEvent.color,
                      border: '2px solid #dee2e6',
                    }}
                  />
                )}
                <Text size="lg" fw={600}>{selectedEvent.title}</Text>
              </Group>
            </div>

            <div>
              <Text size="sm" fw={500} c="dimmed">Date & Time</Text>
              <Text mt="xs" fw={500}>{dayjs(selectedEvent.startTime).format('MMMM D, YYYY')}</Text>
              <Text size="sm">
                {dayjs(selectedEvent.startTime).format('h:mm A')} - {dayjs(selectedEvent.endTime).format('h:mm A')}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                Duration: {Math.round((new Date(selectedEvent.endTime).getTime() - new Date(selectedEvent.startTime).getTime()) / (1000 * 60))} minutes
              </Text>
            </div>

            {selectedEvent.location && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Location</Text>
                <Text mt="xs">📍 {selectedEvent.location}</Text>
              </div>
            )}

            {selectedEvent.attendees && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Attendees ({selectedEvent.attendees.split(',').filter(Boolean).length})</Text>
                <Group gap="xs" mt="xs">
                  {selectedEvent.attendees.split(',').filter(Boolean).map((attendeeId) => {
                    const member = familyMembers.find((m) => m.id === attendeeId);
                    if (!member) return null;
                    let label = member.name || member.email.split('@')[0];
                    if (member.relationship) {
                      label = `${label} (${member.relationship})`;
                    }
                    return (
                      <Badge key={attendeeId} size="md" variant="light">
                        {label}
                      </Badge>
                    );
                  })}
                </Group>
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Description</Text>
                <Text mt="xs" style={{ whiteSpace: 'pre-wrap' }}>{selectedEvent.description}</Text>
              </div>
            )}

            {selectedEvent.notes && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Additional Notes</Text>
                <Text mt="xs" style={{ whiteSpace: 'pre-wrap' }}>{selectedEvent.notes}</Text>
              </div>
            )}

            {selectedEvent.url && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Event Link</Text>
                <Text
                  mt="xs"
                  component="a"
                  href={selectedEvent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#228be6', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  {selectedEvent.url}
                </Text>
              </div>
            )}

            {shoppingLists.filter(list => list.eventId === selectedEvent.id).length > 0 && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Shopping Lists</Text>
                <Stack gap="xs" mt="xs">
                  {shoppingLists
                    .filter(list => list.eventId === selectedEvent.id)
                    .map(list => (
                      <Card
                        key={list.id}
                        padding="sm"
                        radius="md"
                        withBorder
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => {
                          setSelectedShoppingList(list);
                          setShoppingListDetailModalOpened(true);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Group justify="space-between">
                          <div style={{ flex: 1 }}>
                            <Group gap="xs">
                              <Badge color="green" size="sm">Shopping List</Badge>
                              {list.isFamilyList && <Badge color="blue" size="xs" variant="light">Family List</Badge>}
                              <Text fw={500}>{list.name}</Text>
                            </Group>
                            {list.items && list.items.length > 0 && (
                              <Text size="xs" c="dimmed" mt="xs">
                                {list.items.filter((i: any) => i.completed).length} of {list.items.length} items completed
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Card>
                    ))}
                </Stack>
              </div>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setEventDetailModalOpened(false);
                  openEditModal(selectedEvent);
                }}
                leftSection={<IconEdit size={16} />}
              >
                Edit
              </Button>
              <Button
                variant="subtle"
                color="red"
                onClick={() => {
                  setEventDetailModalOpened(false);
                  handleDelete(selectedEvent.id);
                }}
                leftSection={<IconTrash size={16} />}
              >
                Delete
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        opened={taskDetailModalOpened}
        onClose={() => {
          setTaskDetailModalOpened(false);
          setSelectedTask(null);
        }}
        title="Task Details"
        size="md"
      >
        {selectedTask && (
          <Stack gap="md">
            <div>
              <Group gap="xs">
                <Text size="sm" fw={500} c="dimmed">Title</Text>
                {selectedTask.completed && (
                  <Badge color="green" size="xs">Completed</Badge>
                )}
              </Group>
              <Text size="lg" fw={600} mt="xs" style={{ textDecoration: selectedTask.completed ? 'line-through' : 'none' }}>
                {selectedTask.title}
              </Text>
            </div>

            <div>
              <Text size="sm" fw={500} c="dimmed">Priority</Text>
              <Badge
                mt="xs"
                size="lg"
                color={
                  selectedTask.priority === 'high' ? 'red' :
                  selectedTask.priority === 'medium' ? 'yellow' : 'blue'
                }
              >
                {selectedTask.priority.toUpperCase()}
              </Badge>
            </div>

            {selectedTask.dueDate && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Due Date</Text>
                <Text mt="xs">{dayjs(selectedTask.dueDate).format('MMMM D, YYYY [at] h:mm A')}</Text>
                {!selectedTask.completed && (
                  <Text size="xs" c={dayjs(selectedTask.dueDate).isBefore(dayjs()) ? 'red' : 'dimmed'} mt="xs">
                    {dayjs(selectedTask.dueDate).isBefore(dayjs())
                      ? `Overdue by ${dayjs().diff(dayjs(selectedTask.dueDate), 'day')} day(s)`
                      : `Due in ${dayjs(selectedTask.dueDate).diff(dayjs(), 'day')} day(s)`
                    }
                  </Text>
                )}
              </div>
            )}

            {selectedTask.notes && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Notes</Text>
                <Text mt="xs" style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.notes}</Text>
              </div>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => setTaskDetailModalOpened(false)}
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Shopping List Create/Edit Modal */}
      <Modal
        opened={shoppingListModalOpened}
        onClose={() => {
          setShoppingListModalOpened(false);
          setShoppingListFormData({
            name: '',
            description: '',
            eventId: null,
            members: [],
            isFamilyList: false,
          });
          setEditingShoppingList(null);
        }}
        title={editingShoppingList ? 'Edit Shopping List' : 'Create Shopping List'}
      >
        <Stack>
          <TextInput
            label="List Name"
            placeholder="e.g., Thanksgiving Dinner Shopping"
            value={shoppingListFormData.name}
            onChange={(e) => setShoppingListFormData({ ...shoppingListFormData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            placeholder="Additional details about this shopping list (optional)"
            value={shoppingListFormData.description}
            onChange={(e) => setShoppingListFormData({ ...shoppingListFormData, description: e.target.value })}
          />
          <Select
            label="Link to Event (Optional)"
            placeholder="Select an event to link this shopping list to"
            value={shoppingListFormData.eventId}
            onChange={(value) => setShoppingListFormData({ ...shoppingListFormData, eventId: value })}
            data={events.map(event => ({
              value: event.id,
              label: `${event.title} - ${dayjs(event.startTime).format('MMM D, YYYY h:mm A')}`
            }))}
            clearable
            searchable
          />
          <Checkbox
            label="Family List (All family members can access)"
            checked={shoppingListFormData.isFamilyList}
            onChange={(e) => setShoppingListFormData({ ...shoppingListFormData, isFamilyList: e.currentTarget.checked })}
          />
          {!shoppingListFormData.isFamilyList && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Members with Access
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                Select family members who can view and edit this list
              </Text>
              <Checkbox.Group
                value={shoppingListFormData.members}
                onChange={(value) => setShoppingListFormData({ ...shoppingListFormData, members: value })}
              >
                <Stack gap="xs">
                  {familyMembers.map((member) => {
                    let label = member.name || member.email.split('@')[0];
                    if (member.relationship) {
                      label = `${label} (${member.relationship})`;
                    }
                    return (
                      <Checkbox
                        key={member.id}
                        value={member.id}
                        label={label}
                      />
                    );
                  })}
                </Stack>
              </Checkbox.Group>
            </div>
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setShoppingListModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleShoppingListSubmit} loading={loading} color="green">
              {editingShoppingList ? 'Update' : 'Create'} Shopping List
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Shopping List Detail Modal */}
      <Modal
        opened={shoppingListDetailModalOpened}
        onClose={() => {
          setShoppingListDetailModalOpened(false);
          setSelectedShoppingList(null);
        }}
        title="Shopping List Details"
        size="lg"
      >
        {selectedShoppingList && (
          <Stack gap="md">
            <div>
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text fw={600} size="xl">{selectedShoppingList.name}</Text>
                    {selectedShoppingList.isFamilyList && (
                      <Badge color="blue" variant="light">Family List</Badge>
                    )}
                  </Group>
                </div>
              </Group>
            </div>

            {selectedShoppingList.description && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Description</Text>
                <Text mt="xs" style={{ whiteSpace: 'pre-wrap' }}>{selectedShoppingList.description}</Text>
              </div>
            )}

            {selectedShoppingList.event && (
              <div>
                <Text size="sm" fw={500} c="dimmed">Linked Event</Text>
                <Group mt="xs" gap="xs">
                  <Badge color="blue">{selectedShoppingList.event.title}</Badge>
                  <Text size="sm" c="dimmed">
                    {dayjs(selectedShoppingList.event.startTime).format('MMM D, YYYY [at] h:mm A')}
                  </Text>
                </Group>
              </div>
            )}

            {selectedShoppingList.items && selectedShoppingList.items.length > 0 && (
              <div>
                <Text size="sm" fw={500} c="dimmed" mb="sm">Shopping Items</Text>
                <Stack gap="xs">
                  {selectedShoppingList.items.map((item: any) => (
                    <Group key={item.id} justify="space-between">
                      <Group gap="xs">
                        <Checkbox checked={item.completed} readOnly />
                        <Text style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                          {item.name}
                          {item.qty && ` (${item.qty})`}
                        </Text>
                      </Group>
                    </Group>
                  ))}
                </Stack>
                <Text size="xs" c="dimmed" mt="sm">
                  {selectedShoppingList.items.filter((i: any) => i.completed).length} of {selectedShoppingList.items.length} items completed
                </Text>
              </div>
            )}

            {(!selectedShoppingList.items || selectedShoppingList.items.length === 0) && (
              <Text c="dimmed" ta="center" py="md">
                No items in this shopping list yet. Add items from the Shopping page.
              </Text>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => handleDeleteShoppingList(selectedShoppingList.id)}
              >
                Delete List
              </Button>
              <Button
                variant="subtle"
                onClick={() => setShoppingListDetailModalOpened(false)}
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
      </PageAccessGuard>
    </AppLayout>
  );
}
