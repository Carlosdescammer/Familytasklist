/**
 * Encrypted Messages Page
 */

'use client';

import { useState } from 'react';
import { Container, Stack, Title, Button, Group } from '@mantine/core';
import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEncryption } from '@/hooks/useEncryption';
import { E2EESetupWizard } from '@/components/E2EESetupWizard';
import { PassphraseUnlockModal } from '@/components/PassphraseUnlockModal';
import { EncryptedChat } from '@/components/EncryptedChat';

export default function MessagesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const encryption = useEncryption(user?.id || null);

  const [setupWizardOpened, setSetupWizardOpened] = useState(false);
  const [unlockModalOpened, setUnlockModalOpened] = useState(false);

  if (userLoading || encryption.loading) {
    return <Container>Loading...</Container>;
  }

  if (!user) {
    return <Container>Please log in to access encrypted messages</Container>;
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={1}>Secure Messages</Title>
          <Group gap="xs">
            {encryption.isSetup && encryption.isUnlocked && (
              <Button
                variant="light"
                color="red"
                leftSection={<IconLock size={16} />}
                onClick={() => encryption.lockEncryption()}
              >
                Lock
              </Button>
            )}
            {encryption.isSetup && !encryption.isUnlocked && (
              <Button
                variant="light"
                color="green"
                leftSection={<IconLockOpen size={16} />}
                onClick={() => setUnlockModalOpened(true)}
              >
                Unlock
              </Button>
            )}
            {!encryption.isSetup && (
              <Button
                leftSection={<IconLock size={16} />}
                onClick={() => setSetupWizardOpened(true)}
              >
                Set Up Encryption
              </Button>
            )}
          </Group>
        </Group>

        {user.familyId && (
          <EncryptedChat
            familyId={user.familyId}
            userId={user.id}
            userName={user.name || user.email}
          />
        )}
      </Stack>

      {/* Setup Wizard */}
      {user && (
        <E2EESetupWizard
          userId={user.id}
          opened={setupWizardOpened}
          onClose={() => setSetupWizardOpened(false)}
          onComplete={() => {}}
        />
      )}

      {/* Unlock Modal */}
      {user && (
        <PassphraseUnlockModal
          userId={user.id}
          opened={unlockModalOpened}
          onClose={() => setUnlockModalOpened(false)}
          onUnlock={() => {}}
        />
      )}
    </Container>
  );
}
