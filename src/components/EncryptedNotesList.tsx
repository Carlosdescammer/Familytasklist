/**
 * Encrypted Notes List Component
 *
 * Display and manage encrypted personal notes
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  ActionIcon,
  Loader,
  Card,
  Menu,
  ScrollArea,
  TextInput,
  Button,
} from '@mantine/core';
import { IconLock, IconDots, IconTrash, IconSearch } from '@tabler/icons-react';
import { useEncryption } from '@/hooks/useEncryption';
import { notifications } from '@mantine/notifications';

interface EncryptedNotesListProps {
  familyId: string;
  userId: string;
  onRefresh?: number;
}

interface DecryptedNote {
  id: string;
  title: string | null;
  decryptedContent: string;
  noteType: string;
  createdAt: string;
  updatedAt: string;
}

const NOTE_TYPE_EMOJI: Record<string, string> = {
  note: '📝',
  password: '🔑',
  personal: '👤',
  medical: '⚕️',
  financial: '💰',
  ideas: '💡',
  diary: '📔',
};

const NOTE_TYPE_COLOR: Record<string, string> = {
  note: 'blue',
  password: 'red',
  personal: 'grape',
  medical: 'pink',
  financial: 'green',
  ideas: 'yellow',
  diary: 'orange',
};

export function EncryptedNotesList({ familyId, userId, onRefresh }: EncryptedNotesListProps) {
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const encryption = useEncryption(userId);

  // Fetch and decrypt notes
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notes/encrypted?familyId=${familyId}`);
      const data = await res.json();

      if (data.notes && encryption.isUnlocked) {
        // Decrypt notes
        const decrypted = await Promise.all(
          data.notes.map(async (note: any) => {
            try {
              const payload = {
                version: note.version,
                algorithm: note.algorithm,
                encryptedData: note.encryptedContent,
                encryptedKeys: { [userId]: note.encryptedKey },
                iv: note.iv,
              };

              const decryptedText = await encryption.decryptFromFamily(payload);

              return {
                id: note.id,
                title: note.title,
                decryptedContent: decryptedText,
                noteType: note.noteType,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
              };
            } catch (err) {
              return {
                id: note.id,
                title: note.title,
                decryptedContent: '[Unable to decrypt]',
                noteType: note.noteType,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
              };
            }
          })
        );

        setNotes(decrypted);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch encrypted notes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (encryption.isUnlocked) {
      fetchNotes();
    } else if (!encryption.isSetup && retryCount < 3) {
      // Retry after a delay if encryption isn't set up yet
      const timer = setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [familyId, encryption.isUnlocked, encryption.isSetup, onRefresh, retryCount]);

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this encrypted note? This action cannot be undone.')) {
      return;
    }

    try {
      await fetch(`/api/notes/encrypted/${noteId}`, {
        method: 'DELETE',
      });

      notifications.show({
        title: 'Success',
        message: 'Encrypted note deleted',
        color: 'green',
      });

      fetchNotes();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete note',
        color: 'red',
      });
    }
  };

  // Filter notes by search query
  const filteredNotes = notes.filter(
    (note) =>
      note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.decryptedContent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!encryption.isUnlocked) {
    return (
      <Paper p="md" withBorder>
        <Stack align="center" gap="md" py="xl">
          <Loader size="lg" />
          <Stack align="center" gap="xs">
            <Text fw={600}>Setting up encryption...</Text>
            <Text size="sm" c="dimmed" ta="center">
              This happens automatically and only takes a few seconds.
            </Text>
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              Check the browser console (F12) for detailed logs if this takes too long.
            </Text>
            {retryCount > 2 && (
              <Stack align="center" gap="sm" mt="md">
                <Text size="sm" c="orange" ta="center">
                  Taking longer than expected. This might be due to:
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  • Browser blocking IndexedDB<br />
                  • Privacy/incognito mode restrictions<br />
                  • Browser extension conflicts
                </Text>
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => window.location.reload()}
                  mt="xs"
                >
                  Refresh Page
                </Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Search */}
      <TextInput
        placeholder="Search notes..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Notes List */}
      <ScrollArea h={600}>
        {loading ? (
          <Stack align="center" py="xl">
            <Loader />
            <Text size="sm" c="dimmed">
              Decrypting your notes...
            </Text>
          </Stack>
        ) : filteredNotes.length === 0 ? (
          <Stack align="center" py="xl">
            <Text c="dimmed">
              {searchQuery
                ? 'No notes found matching your search'
                : 'No encrypted notes yet. Create your first private note!'}
            </Text>
          </Stack>
        ) : (
          <Stack gap="sm">
            {filteredNotes.map((note) => (
              <Card key={note.id} shadow="xs" padding="md" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Group gap="xs">
                      <Badge
                        leftSection={NOTE_TYPE_EMOJI[note.noteType] || '📝'}
                        color={NOTE_TYPE_COLOR[note.noteType] || 'blue'}
                        variant="light"
                        size="sm"
                      >
                        {note.noteType}
                      </Badge>
                      <Badge leftSection={<IconLock size={12} />} color="green" variant="dot" size="sm">
                        Encrypted
                      </Badge>
                    </Group>

                    {note.title && (
                      <Text fw={600} size="sm">
                        {note.title}
                      </Text>
                    )}

                    <Text
                      size="sm"
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {note.decryptedContent}
                    </Text>

                    <Text size="xs" c="dimmed">
                      Created: {new Date(note.createdAt).toLocaleString()}
                    </Text>
                  </Stack>

                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleDelete(note.id)}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}
