/**
 * Encrypted Notes List Component
 *
 * Display and manage encrypted personal notes
 */

'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
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

export const EncryptedNotesList = forwardRef<any, EncryptedNotesListProps>(
  function EncryptedNotesList({ familyId, userId, onRefresh }, ref) {
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [editorOpened, setEditorOpened] = useState(false);
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

  const handleCopy = (content: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent opening editor
    navigator.clipboard.writeText(content);
    notifications.show({
      title: 'Copied',
      message: 'Note content copied to clipboard',
      color: 'green',
    });
  };

  const handleOpenEditor = (note: DecryptedNote) => {
    setSelectedNote(note);
    setEditContent(note.decryptedContent);
    setEditTitle(note.title || '');
    setEditType(note.noteType);
    setEditorOpened(true);
  };

  const openNewNote = () => {
    setSelectedNote(null);
    setEditContent('');
    setEditTitle('');
    setEditType('note');
    setEditorOpened(true);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    openNewNote,
  }));

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Note content cannot be empty',
        color: 'red',
      });
      return;
    }

    try {
      // Get user's public key
      const publicKey = await encryption.getPublicKey();
      if (!publicKey) {
        throw new Error('No public key found');
      }

      // Encrypt content
      const payload = await encryption.encryptForFamily(editContent, {
        [userId]: publicKey,
      });

      // If editing existing note, delete it first
      if (selectedNote) {
        await fetch(`/api/notes/encrypted/${selectedNote.id}`, {
          method: 'DELETE',
        });
      }

      // Create note (works for both new and edited notes)
      await fetch('/api/notes/encrypted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          encryptedContent: payload.encryptedData,
          encryptedKey: payload.encryptedKeys[userId],
          iv: payload.iv,
          noteType: editType,
          title: editTitle || null,
          algorithm: payload.algorithm,
          version: payload.version,
        }),
      });

      notifications.show({
        title: 'Success',
        message: selectedNote ? 'Note updated successfully' : 'Note created successfully',
        color: 'green',
      });

      setEditorOpened(false);
      setSelectedNote(null);
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save note',
        color: 'red',
      });
    }
  };

  const handleCloseEditor = () => {
    // Auto-save on close if there's content
    const hasContent = editContent.trim().length > 0;
    const hasChanges = selectedNote ? (
      editContent !== selectedNote.decryptedContent ||
      editTitle !== (selectedNote.title || '') ||
      editType !== selectedNote.noteType
    ) : hasContent;

    if (hasChanges) {
      handleSaveEdit();
    } else {
      setEditorOpened(false);
      setSelectedNote(null);
    }
  };

  const handleDelete = async (noteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent opening editor

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

      setEditorOpened(false);
      setSelectedNote(null);
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
              <Card
                key={note.id}
                shadow="xs"
                padding="md"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => handleOpenEditor(note)}
              >
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
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        onClick={(e) => handleCopy(note.decryptedContent, e as any)}
                      >
                        Copy Content
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={(e) => handleDelete(note.id, e as any)}
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

      {/* Apple Notes-Style Full Editor */}
      <Modal
        opened={editorOpened}
        onClose={handleCloseEditor}
        size="100%"
        padding={0}
        withCloseButton={false}
        styles={{
          body: { height: '100vh', padding: 0 },
          content: { height: '100vh' },
        }}
      >
        <Stack gap={0} h="100vh" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          {/* Header Toolbar */}
          <Group
            justify="space-between"
            p="md"
            style={{
              borderBottom: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-body)',
            }}
          >
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={handleCloseEditor}
              >
                <IconLock size={20} />
              </ActionIcon>
              <Text size="sm" c="dimmed">
                {selectedNote && new Date(selectedNote.createdAt).toLocaleDateString()}
              </Text>
            </Group>

            <Group gap="xs">
              <Select
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
                size="sm"
                style={{ width: 150 }}
              />
              <ActionIcon
                variant="light"
                size="lg"
                onClick={(e) => handleCopy(editContent, e as any)}
              >
                <IconCopy size={20} />
              </ActionIcon>
              <ActionIcon
                variant="light"
                color="red"
                size="lg"
                onClick={(e) => selectedNote && handleDelete(selectedNote.id, e as any)}
              >
                <IconTrash size={20} />
              </ActionIcon>
              <Button onClick={handleCloseEditor}>Done</Button>
            </Group>
          </Group>

          {/* Editor Content */}
          <ScrollArea h="calc(100vh - 70px)" p="xl" style={{ flex: 1 }}>
            <Stack gap="lg" maw={800} mx="auto">
              {/* Title Input - Apple Notes Style */}
              <TextInput
                placeholder="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                variant="unstyled"
                size="xl"
                styles={{
                  input: {
                    fontSize: '32px',
                    fontWeight: 700,
                    padding: 0,
                  },
                }}
              />

              {/* Content Textarea - Apple Notes Style */}
              <Textarea
                placeholder="Start typing..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                variant="unstyled"
                autosize
                minRows={20}
                styles={{
                  input: {
                    fontSize: '16px',
                    lineHeight: 1.6,
                    padding: 0,
                    border: 'none',
                  },
                }}
              />

              {/* Footer Info */}
              <Group gap="xs" mt="xl">
                <Badge
                  leftSection={<IconLock size={10} />}
                  color="teal"
                  variant="outline"
                  size="xs"
                >
                  End-to-end encrypted
                </Badge>
                <Text size="xs" c="dimmed">
                  Last edited {selectedNote && new Date(selectedNote.updatedAt).toLocaleString()}
                </Text>
              </Group>
            </Stack>
          </ScrollArea>
        </Stack>
      </Modal>
    </Stack>
  );
});
