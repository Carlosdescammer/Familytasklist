'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Card,
  Stack,
  TextInput,
  Select,
  Button,
  Text,
  Alert,
  Group,
  Textarea,
} from '@mantine/core';
import { IconMail, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const NOTIFICATION_TYPES = [
  { value: 'task_assigned', label: 'Task Assigned' },
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'all_tasks_complete', label: 'All Tasks Complete' },
  { value: 'event_created', label: 'Event Created' },
  { value: 'event_reminder', label: 'Event Reminder' },
  { value: 'shopping_list_created', label: 'Shopping List Created' },
  { value: 'shopping_list_updated', label: 'Shopping List Updated' },
  { value: 'budget_alert', label: 'Budget Alert' },
  { value: 'budget_limit_reached', label: 'Budget Limit Reached' },
  { value: 'family_member_joined', label: 'Family Member Joined' },
  { value: 'recipe_shared', label: 'Recipe Shared' },
];

const DEFAULT_MESSAGES: Record<string, { title: string; message: string }> = {
  task_assigned: {
    title: 'New Task Assigned',
    message: 'You have been assigned a new task: Clean the kitchen',
  },
  task_completed: {
    title: 'Task Completed',
    message: 'John has completed the task: Clean the kitchen',
  },
  all_tasks_complete: {
    title: 'All Tasks Complete!',
    message: 'Great job! You have completed all your assigned tasks.',
  },
  event_created: {
    title: 'New Event Created',
    message: 'Family dinner has been scheduled for tomorrow at 6 PM',
  },
  event_reminder: {
    title: 'Event Reminder',
    message: 'Reminder: Family dinner is starting in 1 hour',
  },
  shopping_list_created: {
    title: 'New Shopping List',
    message: 'A new shopping list "Weekly Groceries" has been created',
  },
  shopping_list_updated: {
    title: 'Shopping List Updated',
    message: 'The shopping list "Weekly Groceries" has been updated',
  },
  budget_alert: {
    title: 'Budget Alert',
    message: 'Your Groceries budget is at 80% capacity',
  },
  budget_limit_reached: {
    title: 'Budget Limit Reached',
    message: 'Your Groceries budget limit has been reached',
  },
  family_member_joined: {
    title: 'New Family Member',
    message: 'Sarah has joined your family!',
  },
  recipe_shared: {
    title: 'Recipe Shared',
    message: 'Mom shared a new recipe: Chocolate Chip Cookies',
  },
};

export default function EmailDebugPage() {
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('Test User');
  const [familyName, setFamilyName] = useState('Test Family');
  const [notificationType, setNotificationType] = useState<string>('task_assigned');
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const currentDefaults = DEFAULT_MESSAGES[notificationType] || DEFAULT_MESSAGES.task_assigned;

  const handleSendTest = async () => {
    if (!email) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a recipient email address',
        color: 'red',
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const res = await fetch('/api/debug/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          userName,
          familyName,
          notificationType,
          title: customTitle || currentDefaults.title,
          message: customMessage || currentDefaults.message,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setLastResult({ success: true, message: 'Test email sent successfully!' });
        notifications.show({
          title: 'Success',
          message: 'Test email sent successfully!',
          color: 'green',
          icon: <IconCheck />,
        });
      } else {
        setLastResult({ success: false, message: data.error || 'Failed to send email' });
        notifications.show({
          title: 'Error',
          message: data.error || 'Failed to send email',
          color: 'red',
          icon: <IconAlertCircle />,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setLastResult({ success: false, message: errorMsg });
      notifications.show({
        title: 'Error',
        message: errorMsg,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Email Notification Debug Tool</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Test email notifications by sending test emails to any address
          </Text>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Send Test Email</Title>

            <TextInput
              label="Recipient Email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftSection={<IconMail size={16} />}
            />

            <Group grow>
              <TextInput
                label="User Name"
                placeholder="John Doe"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />

              <TextInput
                label="Family Name"
                placeholder="The Smiths"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </Group>

            <Select
              label="Notification Type"
              placeholder="Select notification type"
              data={NOTIFICATION_TYPES}
              value={notificationType}
              onChange={(value) => {
                if (value) {
                  setNotificationType(value);
                  // Reset custom fields when changing type
                  setCustomTitle('');
                  setCustomMessage('');
                }
              }}
              searchable
            />

            <TextInput
              label="Email Title (optional - defaults shown below)"
              placeholder={currentDefaults.title}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />

            <Textarea
              label="Email Message (optional - defaults shown below)"
              placeholder={currentDefaults.message}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              minRows={3}
            />

            <Alert color="blue" variant="light">
              <Stack gap="xs">
                <Text size="sm" fw={500}>Default content for {NOTIFICATION_TYPES.find(t => t.value === notificationType)?.label}:</Text>
                <Text size="sm">
                  <strong>Title:</strong> {currentDefaults.title}
                </Text>
                <Text size="sm">
                  <strong>Message:</strong> {currentDefaults.message}
                </Text>
              </Stack>
            </Alert>

            <Button
              onClick={handleSendTest}
              loading={sending}
              leftSection={<IconMail size={16} />}
              size="md"
              fullWidth
            >
              Send Test Email
            </Button>
          </Stack>
        </Card>

        {lastResult && (
          <Alert
            color={lastResult.success ? 'green' : 'red'}
            icon={lastResult.success ? <IconCheck /> : <IconAlertCircle />}
          >
            {lastResult.message}
          </Alert>
        )}

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={4}>Configuration Status</Title>
            <Text size="sm">
              <strong>Resend API Key:</strong> {process.env.NEXT_PUBLIC_RESEND_CONFIGURED === 'true' ? '✓ Configured' : '✗ Not configured'}
            </Text>
            <Text size="sm">
              <strong>From Email:</strong> noreply@famtask.xyz
            </Text>
            <Text size="sm">
              <strong>Base URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'https://famtask.xyz'}
            </Text>
          </Stack>
        </Card>

        <Alert color="yellow" variant="light">
          <Text size="sm">
            <strong>Note:</strong> This is a debug tool for testing email notifications.
            In production, emails are sent automatically when notifications are created in the app.
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}
