/**
 * Encrypted Messages Page
 */

'use client';

import { Container, Stack, Title, Badge, Group } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEncryption } from '@/hooks/useEncryption';
import { EncryptedChat } from '@/components/EncryptedChat';

export default function MessagesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const encryption = useEncryption(user?.id || null);

  if (userLoading || encryption.loading) {
    return <Container>Loading...</Container>;
  }

  if (!user) {
    return <Container>Please log in to access encrypted messages</Container>;
  }

  // Encryption is now auto-setup and auto-unlocked
  // No manual intervention needed

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={1}>Secure Messages</Title>
          {encryption.isSetup && encryption.isUnlocked && (
            <Badge leftSection={<IconLock size={12} />} color="green" variant="light">
              End-to-End Encrypted
            </Badge>
          )}
        </Group>

        {user.familyId && (
          <EncryptedChat
            familyId={user.familyId}
            userId={user.id}
            userName={user.name || user.email}
          />
        )}
      </Stack>
    </Container>
  );
}
