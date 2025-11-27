/**
 * Encrypted Note Editor Component
 *
 * Modal for creating and editing encrypted personal notes
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Select,
} from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useEncryption } from '@/hooks/useEncryption';
import { notifications } from '@mantine/notifications';

interface EncryptedNoteEditorProps {
  userId: string;
  familyId: string;
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editNote?: {
    id: string;
    title: string;
    content: string;
    noteType: string;
  } | null;
}

const NOTE_CATEGORIES = [
  { value: 'note', label: '📝 General Note' },
  { value: 'password', label: '🔑 Password/PIN' },
  { value: 'personal', label: '👤 Personal' },
  { value: 'medical', label: '⚕️ Medical' },
  { value: 'financial', label: '💰 Financial' },
  { value: 'ideas', label: '💡 Ideas' },
  { value: 'diary', label: '📔 Diary' },
];

export function EncryptedNoteEditor({
  userId,
  familyId,
  opened,
  onClose,
  onSaved,
  editNote,
}: EncryptedNoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [saving, setSaving] = useState(false);

  const encryption = useEncryption(userId);

  // Load edit note data
  useEffect(() => {
    if (editNote) {
      setTitle(editNote.title || '');
      setContent(editNote.content || '');
      setNoteType(editNote.noteType || 'note');
    } else {
      setTitle('');
      setContent('');
      setNoteType('note');
    }
  }, [editNote, opened]);

  const handleSave = async () => {
    if (!content.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Note content cannot be empty',
        color: 'red',
      });
      return;
    }

    if (!encryption.isUnlocked) {
      notifications.show({
        title: 'Error',
        message: 'Encryption is not unlocked',
        color: 'red',
      });
      return;
    }

    setSaving(true);

    try {
      // Encrypt the note content
      const publicKey = await encryption.getPublicKey();
      if (!publicKey) {
        throw new Error('No public key found');
      }

      const encrypted = await encryption.encryptForFamily(content, {
        [userId]: publicKey,
      });

      // Save to database
      await fetch('/api/notes/encrypted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          encryptedContent: encrypted.encryptedData,
          encryptedKey: encrypted.encryptedKeys[userId],
          iv: encrypted.iv,
          algorithm: encrypted.algorithm,
          version: encrypted.version,
          title: title || null,
          noteType,
        }),
      });

      notifications.show({
        title: 'Success',
        message: 'Encrypted note saved!',
        color: 'green',
      });

      setTitle('');
      setContent('');
      setNoteType('note');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save encrypted note',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editNote ? 'Edit Encrypted Note' : 'New Encrypted Note'}
      size="lg"
    >
      <Stack gap="md">
        <Select
          label="Category"
          placeholder="Select category"
          value={noteType}
          onChange={(value) => setNoteType(value || 'note')}
          data={NOTE_CATEGORIES}
        />

        <TextInput
          label="Title (Optional)"
          placeholder="Give your note a title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          label="Content"
          placeholder="Write your private note here... (will be encrypted)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          minRows={8}
          required
          autoFocus
        />

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            leftSection={<IconLock size={16} />}
          >
            Save Encrypted Note
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
