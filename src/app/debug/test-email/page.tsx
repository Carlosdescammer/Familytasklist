'use client';

import { useState } from 'react';
import { Container, Title, Button, Stack, TextInput, Select, Alert, Code } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [notificationType, setNotificationType] = useState('task_assigned');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sendTestEmail = async () => {
    if (!email) {
      notifications.show({
        title: 'Error',
        message: 'Please enter an email address',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          userName: 'Test User',
          familyName: 'Test Family',
          notificationType,
          title: 'Test Email from FamilyList',
          message: `This is a test ${notificationType.replace(/_/g, ' ')} notification.`,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (response.ok) {
        notifications.show({
          title: 'Success!',
          message: `Test email sent to ${email}`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Error',
          message: data.error || 'Failed to send email',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to send test email',
        color: 'red',
      });
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <Container size="sm">
        <Stack gap="md">
          <Title order={2}>Test Email Notifications</Title>

          <Alert color="blue" title="Email Configuration">
            <Stack gap="xs">
              <div>API Key: {process.env.NEXT_PUBLIC_HAS_RESEND ? '✅ Configured' : '❌ Not Set'}</div>
              <div>From Email: noreply@famtask.xyz</div>
            </Stack>
          </Alert>

          <TextInput
            label="Recipient Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Select
            label="Notification Type"
            value={notificationType}
            onChange={(value) => setNotificationType(value || 'task_assigned')}
            data={[
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
            ]}
          />

          <Button onClick={sendTestEmail} loading={loading} fullWidth>
            Send Test Email
          </Button>

          {result && (
            <Alert color={result.success ? 'green' : 'red'} title="Result">
              <Code block>{JSON.stringify(result, null, 2)}</Code>
            </Alert>
          )}
        </Stack>
      </Container>
    </AppLayout>
  );
}
