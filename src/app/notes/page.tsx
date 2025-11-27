/**
 * Encrypted Notes Page
 *
 * Private encrypted notes - only visible to you
 */

'use client';

import { useState, useRef } from 'react';
import { Container, Stack, Title, Button, Group, Badge, Text, Paper } from '@mantine/core';
import { IconLock, IconPlus, IconShieldLock } from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { EncryptedNotesList } from '@/components/EncryptedNotesList';
import AppLayout from '@/components/AppLayout';

export default function NotesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const notesListRef = useRef<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (userLoading) {
    return <AppLayout><Container>Loading...</Container></AppLayout>;
  }

  if (!user) {
    return <AppLayout><Container>Please log in to access encrypted notes</Container></AppLayout>;
  }

  if (!user.familyId) {
    return (
      <AppLayout>
        <Container>
          <Paper p="xl" withBorder>
            <Stack align="center" gap="md">
              <IconShieldLock size={48} />
              <Text>Please join or create a family first</Text>
            </Stack>
          </Paper>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>My Private Notes</Title>
            <Text size="sm" c="dimmed" mt={4}>
              End-to-end encrypted - only you can read these
            </Text>
          </div>
          <Group gap="xs">
            <Badge leftSection={<IconLock size={12} />} color="green" variant="light">
              Private & Encrypted
            </Badge>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => notesListRef.current?.openNewNote()}
            >
              New Note
            </Button>
          </Group>
        </Group>

        {/* Info Banner */}
        <Paper p="md" withBorder>
          <Group gap="md" align="flex-start">
            <IconShieldLock size={24} color="var(--mantine-color-blue-6)" style={{ marginTop: 2 }} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                Your notes are end-to-end encrypted
              </Text>
              <Text size="sm" opacity={0.8}>
                Only you can read these notes. Not even your family members or our servers can access them.
                Perfect for passwords, PINs, personal thoughts, and sensitive information.
              </Text>
            </Stack>
          </Group>
        </Paper>

        {/* Notes List */}
        <EncryptedNotesList
          ref={notesListRef}
          familyId={user.familyId}
          userId={user.id}
          onRefresh={refreshKey}
        />
      </Stack>
    </Container>
    </AppLayout>
  );
}
