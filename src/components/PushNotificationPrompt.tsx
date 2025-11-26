'use client';

import { useEffect, useState } from 'react';
import { Card, Text, Button, Group, CloseButton, Alert, Stack } from '@mantine/core';
import { IconBell, IconBellOff, IconInfoCircle } from '@tabler/icons-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationPromptProps {
  onDismiss?: () => void;
}

export function PushNotificationPrompt({ onDismiss }: PushNotificationPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  // Check if user has previously dismissed the prompt
  useEffect(() => {
    const wasDismissed = localStorage.getItem('pushNotificationPromptDismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pushNotificationPromptDismissed', 'true');
    onDismiss?.();
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      handleDismiss();
    }
  };

  const handleDisable = async () => {
    await unsubscribe();
  };

  // Don't show if not supported, already subscribed, denied, or dismissed
  if (!isSupported || dismissed || permission === 'denied') {
    return null;
  }

  // Show subscribed status if user has enabled notifications
  if (isSubscribed) {
    return (
      <Alert
        icon={<IconBell size={16} />}
        title="Push Notifications Enabled"
        color="green"
        withCloseButton
        onClose={handleDismiss}
      >
        <Group justify="space-between" align="flex-start">
          <Text size="sm">
            You'll receive notifications for tasks, shopping updates, and more.
          </Text>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconBellOff size={14} />}
            onClick={handleDisable}
            loading={isLoading}
          >
            Disable
          </Button>
        </Group>
      </Alert>
    );
  }

  // Show enable prompt if permission is default (not yet requested)
  return (
    <Card withBorder shadow="sm" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group>
            <IconBell size={24} />
            <div>
              <Text fw={500} size="sm">
                Enable Push Notifications
              </Text>
              <Text size="xs" c="dimmed">
                Stay updated on tasks, shopping lists, and family activities
              </Text>
            </div>
          </Group>
          <CloseButton onClick={handleDismiss} />
        </Group>

        <Group>
          <Button
            leftSection={<IconBell size={16} />}
            onClick={handleEnable}
            loading={isLoading}
            size="sm"
          >
            Enable Notifications
          </Button>
          <Button
            variant="subtle"
            color="gray"
            onClick={handleDismiss}
            size="sm"
          >
            Maybe Later
          </Button>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="xs">
            Get notified when family members assign you tasks, add items to shopping
            lists, create events, and more.
          </Text>
        </Alert>
      </Stack>
    </Card>
  );
}
