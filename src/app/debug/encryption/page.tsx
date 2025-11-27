/**
 * E2EE Debug & Test Page
 *
 * Use this page to verify encryption is working correctly
 */

'use client';

import { useState } from 'react';
import { Container, Stack, Title, Button, TextInput, Text, Paper, Code, Alert, Group } from '@mantine/core';
import { IconLock, IconLockOpen, IconCheck, IconX } from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEncryption } from '@/hooks/useEncryption';

export default function EncryptionDebugPage() {
  const { user } = useCurrentUser();
  const encryption = useEncryption(user?.id || null);

  const [testMessage, setTestMessage] = useState('Hello, this is a test message!');
  const [encryptedResult, setEncryptedResult] = useState<any>(null);
  const [decryptedResult, setDecryptedResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const testEncryption = async () => {
    if (!encryption.isUnlocked) {
      setError('Please unlock encryption first!');
      return;
    }

    try {
      setError('');

      // Test: Encrypt a message for yourself
      const publicKey = await encryption.getPublicKey();
      if (!publicKey) {
        setError('No public key found');
        return;
      }

      const encrypted = await encryption.encryptForFamily(testMessage, {
        [user?.id || 'test']: publicKey,
      });

      setEncryptedResult(encrypted);

      // Test: Decrypt the same message
      const decrypted = await encryption.decryptFromFamily(encrypted);
      setDecryptedResult(decrypted);

    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>🔐 E2EE Debug Page</Title>
          <Text c="dimmed" mt="xs">
            Test and verify end-to-end encryption functionality
          </Text>
        </div>

        {/* Encryption Status */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={600}>Encryption Status</Text>
            <Group gap="xs">
              <Text size="sm">Setup Complete:</Text>
              {encryption.isSetup ? (
                <Text c="green" size="sm" fw={500}>
                  <IconCheck size={16} style={{ display: 'inline', marginRight: 4 }} />
                  Yes
                </Text>
              ) : (
                <Text c="red" size="sm" fw={500}>
                  <IconX size={16} style={{ display: 'inline', marginRight: 4 }} />
                  No - Go to /messages to set up
                </Text>
              )}
            </Group>
            <Group gap="xs">
              <Text size="sm">Currently Unlocked:</Text>
              {encryption.isUnlocked ? (
                <Text c="green" size="sm" fw={500}>
                  <IconLockOpen size={16} style={{ display: 'inline', marginRight: 4 }} />
                  Yes
                </Text>
              ) : (
                <Text c="red" size="sm" fw={500}>
                  <IconLock size={16} style={{ display: 'inline', marginRight: 4 }} />
                  No - Unlock to test
                </Text>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* Test Encryption */}
        {encryption.isUnlocked && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text fw={600}>Test Encryption/Decryption</Text>

              <TextInput
                label="Test Message"
                placeholder="Enter a message to encrypt"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />

              <Button onClick={testEncryption} leftSection={<IconLock size={16} />}>
                Encrypt & Decrypt Test
              </Button>

              {error && (
                <Alert color="red" title="Error">
                  {error}
                </Alert>
              )}

              {encryptedResult && (
                <div>
                  <Text size="sm" fw={500} mb="xs">Encrypted Data:</Text>
                  <Paper p="sm" bg="gray.0" style={{ overflow: 'auto' }}>
                    <Code block>
                      {JSON.stringify({
                        version: encryptedResult.version,
                        algorithm: encryptedResult.algorithm,
                        encryptedData: encryptedResult.encryptedData.substring(0, 50) + '...',
                        encryptedKeys: Object.keys(encryptedResult.encryptedKeys).map(k =>
                          `${k}: ${encryptedResult.encryptedKeys[k].substring(0, 30)}...`
                        ),
                        iv: encryptedResult.iv.substring(0, 30) + '...',
                      }, null, 2)}
                    </Code>
                  </Paper>
                </div>
              )}

              {decryptedResult && (
                <div>
                  <Text size="sm" fw={500} mb="xs">Decrypted Result:</Text>
                  <Alert color={decryptedResult === testMessage ? 'green' : 'red'}>
                    {decryptedResult}
                    {decryptedResult === testMessage && (
                      <Text size="xs" mt="xs">
                        ✅ Success! Encrypted and decrypted message matches original.
                      </Text>
                    )}
                  </Alert>
                </div>
              )}
            </Stack>
          </Paper>
        )}

        {/* How to Test */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={600}>How to Test E2EE:</Text>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                <Text size="sm">Go to <Code>/messages</Code> and set up encryption if not done</Text>
              </li>
              <li>
                <Text size="sm">Unlock encryption with your passphrase</Text>
              </li>
              <li>
                <Text size="sm">Come back to this page and click "Encrypt & Decrypt Test"</Text>
              </li>
              <li>
                <Text size="sm">Open DevTools (F12) → Network tab</Text>
              </li>
              <li>
                <Text size="sm">Send a message in <Code>/messages</Code></Text>
              </li>
              <li>
                <Text size="sm">Check POST to <Code>/api/messages/encrypted</Code> - should show encrypted data only</Text>
              </li>
            </ol>
          </Stack>
        </Paper>

        {/* Browser Storage */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={600}>Check Browser Storage:</Text>
            <Text size="sm">
              Open DevTools → Application → IndexedDB → E2EEKeyStore
            </Text>
            <Text size="sm" c="dimmed">
              You should see encrypted keys stored locally. Private key is encrypted with your passphrase.
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
