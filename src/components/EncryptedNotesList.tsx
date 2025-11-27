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
  Modal,
  Textarea,
  Select,
} from '@mantine/core';
import { IconLock, IconDots, IconTrash, IconSearch, IconCopy, IconEdit, IconEye } from '@tabler/icons-react';
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
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('note');
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

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    notifications.show({
      title: 'Copied',
      message: 'Note content copied to clipboard',
      color: 'green',
    });
  };

  const handleView = (note: DecryptedNote) => {
    setSelectedNote(note);
    setViewModalOpened(true);
  };

  const handleEdit = (note: DecryptedNote) => {
    setSelectedNote(note);
    setEditContent(note.decryptedContent);
    setEditTitle(note.title || '');
    setEditType(note.noteType);
    setEditModalOpened(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedNote) return;

    try {
      // Delete old note and create new one (since content is encrypted)
      await fetch(`/api/notes/encrypted/${selectedNote.id}`, {
        method: 'DELETE',
      });

      // Encrypt new content
      const payload = await encryption.encryptForFamily(editContent, {});

      // Create new note
      await fetch('/api/notes/encrypted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          encryptedContent: payload.encryptedData,
          encryptedKey: Object.values(payload.encryptedKeys)[0],
          iv: payload.iv,
          noteType: editType,
          title: editTitle || null,
          algorithm: payload.algorithm,
          version: payload.version,
        }),
      });

      notifications.show({
        title: 'Success',
        message: 'Note updated successfully',
        color: 'green',
      });

      setEditModalOpened(false);
      fetchNotes();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update note',
        color: 'red',
      });
    }
  };

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
                      <Badge
                        leftSection={<IconLock size={10} />}
                        color="teal"
                        variant="outline"
                        size="xs"
                        styles={{
                          root: { textTransform: 'none' }
                        }}
                      >
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
                        leftSection={<IconEye size={14} />}
                        onClick={() => handleView(note)}
                      >
                        View Full Note
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        onClick={() => handleCopy(note.decryptedContent)}
                      >
                        Copy Content
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => handleEdit(note)}
                      >
                        Edit
                      </Menu.Item>
                      <Menu.Divider />
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

      {/* View Modal */}
      <Modal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        title={
          <Group gap="xs">
            <IconLock size={18} />
            <Text fw={600}>{selectedNote?.title || 'Encrypted Note'}</Text>
          </Group>
        }
        size="lg"
      >
        <Stack gap="md">
          <Group gap="xs">
            <Badge
              leftSection={NOTE_TYPE_EMOJI[selectedNote?.noteType || 'note']}
              color={NOTE_TYPE_COLOR[selectedNote?.noteType || 'note'] || 'blue'}
              variant="light"
              size="sm"
            >
              {selectedNote?.noteType}
            </Badge>
            <Badge
              leftSection={<IconLock size={10} />}
              color="teal"
              variant="outline"
              size="xs"
            >
              Encrypted
            </Badge>
          </Group>

          <Text
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {selectedNote?.decryptedContent}
          </Text>

          <Text size="xs" c="dimmed">
            Created: {selectedNote && new Date(selectedNote.createdAt).toLocaleString()}
          </Text>

          <Group justify="flex-end">
            <Button
              variant="light"
              leftSection={<IconCopy size={16} />}
              onClick={() => {
                if (selectedNote) {
                  handleCopy(selectedNote.decryptedContent);
                }
              }}
            >
              Copy Content
            </Button>
            <Button onClick={() => setViewModalOpened(false)}>Close</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Edit Encrypted Note"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Title (optional)"
            placeholder="Note title..."
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />

          <Select
            label="Type"
            value={editType}
            onChange={(val) => setEditType(val || 'note')}
            data={[
              { value: 'note', label: '📝 Note' },
              { value: 'password', label: '🔑 Password' },
              { value: 'personal', label: '👤 Personal' },
              { value: 'medical', label: '⚕️ Medical' },
              { value: 'financial', label: '💰 Financial' },
              { value: 'ideas', label: '💡 Ideas' },
              { value: 'diary', label: '📔 Diary' },
            ]}
          />

          <Textarea
            label="Content"
            placeholder="Note content..."
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            minRows={6}
            autosize
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
