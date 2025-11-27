/**
 * Passphrase Unlock Modal Component
 *
 * Prompts user to unlock encryption with their passphrase
 */

'use client';

import { useState } from 'react';
import {
  Modal,
  PasswordInput,
  Button,
  Text,
  Stack,
  Alert,
} from '@mantine/core';
import { IconLock, IconAlertCircle } from '@tabler/icons-react';
import { useEncryption } from '@/hooks/useEncryption';

interface PassphraseUnlockModalProps {
  userId: string;
  opened: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

export function PassphraseUnlockModal({
  userId,
  opened,
  onClose,
  onUnlock,
}: PassphraseUnlockModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encryption = useEncryption(userId);

  const handleUnlock = async () => {
    if (!passphrase) {
      setError('Please enter your passphrase');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await encryption.unlockEncryption(passphrase);
      setPassphrase('');
      onUnlock();
      onClose();
    } catch (err) {
      setError('Invalid passphrase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Unlock Encryption"
      size="md"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Enter your passphrase to unlock encrypted messages and notes.
        </Text>

        <PasswordInput
          label="Passphrase"
          placeholder="Enter your passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleUnlock();
            }
          }}
          required
          leftSection={<IconLock size={16} />}
          error={error}
          autoFocus
        />

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        <Button onClick={handleUnlock} loading={loading} fullWidth>
          Unlock
        </Button>
      </Stack>
    </Modal>
  );
}
