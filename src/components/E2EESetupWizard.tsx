/**
 * E2EE Setup Wizard Component
 *
 * Guides users through setting up end-to-end encryption
 */

'use client';

import { useState } from 'react';
import {
  Modal,
  Stepper,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Stack,
  Group,
  Alert,
  Progress,
  List,
} from '@mantine/core';
import { IconLock, IconKey, IconShieldCheck, IconAlertCircle } from '@tabler/icons-react';
import { useEncryption } from '@/hooks/useEncryption';

interface E2EESetupWizardProps {
  userId: string;
  opened: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function E2EESetupWizard({
  userId,
  opened,
  onClose,
  onComplete,
}: E2EESetupWizardProps) {
  const [active, setActive] = useState(0);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encryption = useEncryption(userId);

  // Validate passphrase
  const validation = encryption.validatePassphrase(passphrase);
  const passphraseMatch = passphrase === confirmPassphrase;

  const handleSetup = async () => {
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    if (!passphraseMatch) {
      setError('Passphrases do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await encryption.setupEncryption(passphrase);
      setActive(2); // Move to success step
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Set Up End-to-End Encryption"
      size="lg"
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stepper active={active}>
        {/* Step 1: Introduction */}
        <Stepper.Step
          label="Introduction"
          description="What is E2EE?"
          icon={<IconShieldCheck size={18} />}
        >
          <Stack gap="md" mt="md">
            <Text>
              End-to-end encryption ensures that only you and your family can read your
              private messages and notes. Not even our servers can access your encrypted data.
            </Text>

            <Alert icon={<IconLock size={16} />} title="How it works" color="blue">
              <List size="sm">
                <List.Item>You create a secure passphrase</List.Item>
                <List.Item>Encryption keys are generated on your device</List.Item>
                <List.Item>Your data is encrypted before being sent to our servers</List.Item>
                <List.Item>Only you and your family can decrypt the data</List.Item>
              </List>
            </Alert>

            <Group justify="flex-end">
              <Button onClick={() => setActive(1)}>Get Started</Button>
            </Group>
          </Stack>
        </Stepper.Step>

        {/* Step 2: Create Passphrase */}
        <Stepper.Step
          label="Create Passphrase"
          description="Secure your encryption"
          icon={<IconKey size={18} />}
        >
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              Create a strong passphrase to protect your encryption keys. This passphrase will
              be required to unlock your encrypted messages.
            </Text>

            <PasswordInput
              label="Passphrase"
              placeholder="Create a strong passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
              description="At least 12 characters with uppercase, lowercase, numbers, and symbols"
            />

            {passphrase && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Passphrase Strength: {validation.strength.toUpperCase()}
                </Text>
                <Progress
                  value={
                    validation.strength === 'strong'
                      ? 100
                      : validation.strength === 'medium'
                      ? 66
                      : 33
                  }
                  color={
                    validation.strength === 'strong'
                      ? 'green'
                      : validation.strength === 'medium'
                      ? 'yellow'
                      : 'red'
                  }
                />
                {validation.errors.length > 0 && (
                  <List size="xs" c="red">
                    {validation.errors.map((err, i) => (
                      <List.Item key={i}>{err}</List.Item>
                    ))}
                  </List>
                )}
              </Stack>
            )}

            <PasswordInput
              label="Confirm Passphrase"
              placeholder="Re-enter your passphrase"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              required
              error={
                confirmPassphrase && !passphraseMatch
                  ? 'Passphrases do not match'
                  : undefined
              }
            />

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
                {error}
              </Alert>
            )}

            <Alert icon={<IconAlertCircle size={16} />} title="Important" color="yellow">
              <Text size="sm">
                Store your passphrase securely. If you lose it, you will not be able to access
                your encrypted data. We cannot recover it for you.
              </Text>
            </Alert>

            <Group justify="space-between">
              <Button variant="subtle" onClick={() => setActive(0)}>
                Back
              </Button>
              <Button
                onClick={handleSetup}
                loading={loading}
                disabled={!validation.valid || !passphraseMatch}
              >
                Set Up Encryption
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        {/* Step 3: Success */}
        <Stepper.Completed>
          <Stack align="center" gap="md" mt="md">
            <IconShieldCheck size={64} color="green" />
            <Text size="lg" fw={600}>
              Encryption Set Up Successfully!
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Your encryption keys have been generated. You can now send and receive encrypted
              messages with your family.
            </Text>
          </Stack>
        </Stepper.Completed>
      </Stepper>
    </Modal>
  );
}
