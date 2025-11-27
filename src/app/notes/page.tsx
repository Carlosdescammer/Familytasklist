/**
 * Encrypted Notes Page
 *
 * Private encrypted notes - only visible to you
 */

'use client';

import { useState } from 'react';
import { Container, Stack, Title, Button, Group, Badge, Text, Paper } from '@mantine/core';
import { IconLock, IconPlus, IconShieldLock } from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { EncryptedNoteEditor } from '@/components/EncryptedNoteEditor';
import { EncryptedNotesList } from '@/components/EncryptedNotesList';

export default function NotesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [editorOpened, setEditorOpened] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (userLoading) {
    return <Container>Loading...</Container>;
  }

  if (!user) {
    return <Container>Please log in to access encrypted notes</Container>;
  }

  if (!user.familyId) {
    return (
      <Container>
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <IconShieldLock size={48} />
            <Text>Please join or create a family first</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
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
              onClick={() => setEditorOpened(true)}
            >
              New Note
            </Button>
          </Group>
        </Group>

        {/* Info Banner */}
        <Paper p="md" withBorder bg="blue.0">
          <Group gap="xs">
            <IconShieldLock size={20} color="var(--mantine-color-blue-6)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                Your notes are end-to-end encrypted
              </Text>
              <Text size="xs" c="dimmed">
                Only you can read these notes. Not even your family members or our servers can access them.
                Perfect for passwords, PINs, personal thoughts, and sensitive information.
              </Text>
            </div>
          </Group>
        </Paper>

        {/* Notes List */}
        <EncryptedNotesList
          familyId={user.familyId}
          userId={user.id}
          onRefresh={refreshKey}
        />

        {/* Note Editor Modal */}
        <EncryptedNoteEditor
          userId={user.id}
          familyId={user.familyId}
          opened={editorOpened}
          onClose={() => setEditorOpened(false)}
          onSaved={() => {
            setRefreshKey((prev) => prev + 1);
          }}
          editNote={null}
        />
      </Stack>
    </Container>
  );
}
