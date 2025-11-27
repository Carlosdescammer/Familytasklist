/**
 * E2EE Setup Prompt Component
 *
 * Prompts users to set up encryption if not already configured
 */

'use client';

import { useState, useEffect } from 'react';
import { Alert, Button, Group } from '@mantine/core';
import { IconLock, IconX } from '@tabler/icons-react';
import { useEncryption } from '@/hooks/useEncryption';
import { E2EESetupWizard } from './E2EESetupWizard';

interface E2EESetupPromptProps {
  userId: string;
}

export function E2EESetupPrompt({ userId }: E2EESetupPromptProps) {
  const encryption = useEncryption(userId);
  const [dismissed, setDismissed] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Check if user has dismissed the prompt before
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('e2ee-prompt-dismissed');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      // Auto-show again after 7 days
      if (dismissedDate > new Date()) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    // Dismiss for 7 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem('e2ee-prompt-dismissed', dismissUntil.toISOString());
  };

  const handleSetup = () => {
    setShowWizard(true);
  };

  // Don't show if already set up, still loading, or dismissed
  if (encryption.loading || encryption.isSetup || dismissed) {
    return null;
  }

  return (
    <>
      <Alert
        color="blue"
        title="Secure Your Messages"
        icon={<IconLock size={16} />}
        withCloseButton
        onClose={handleDismiss}
        styles={{
          root: {
            marginBottom: 16,
          },
        }}
      >
        <Group justify="space-between" align="center">
          <div style={{ flex: 1 }}>
            Set up end-to-end encryption to send secure, private messages to your family.
            Only you and your family can read them - not even we can!
          </div>
          <Button
            size="xs"
            onClick={handleSetup}
            leftSection={<IconLock size={14} />}
          >
            Set Up Now
          </Button>
        </Group>
      </Alert>

      <E2EESetupWizard
        userId={userId}
        opened={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={() => {
          setShowWizard(false);
          setDismissed(true);
        }}
      />
    </>
  );
}
