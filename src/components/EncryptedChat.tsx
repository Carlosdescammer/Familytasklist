/**
 * Encrypted Chat Component
 *
 * Secure encrypted messaging for family members
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Stack,
  TextInput,
  Button,
  Text,
  Group,
  Avatar,
  Badge,
  ScrollArea,
  Loader,
} from '@mantine/core';
import { IconLock, IconSend } from '@tabler/icons-react';
import { useEncryption } from '@/hooks/useEncryption';
import type { EncryptedMessage } from '@/db/schema';

interface EncryptedChatProps {
  familyId: string;
  userId: string;
  userName: string;
}

export function EncryptedChat({ familyId, userId, userName }: EncryptedChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const encryption = useEncryption(userId);

  // Fetch and decrypt messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/messages/encrypted?familyId=${familyId}`);
        const data = await res.json();

        if (data.messages && encryption.isUnlocked) {
          // Decrypt messages
          const decrypted = await Promise.all(
            data.messages.map(async (msg: any) => {
              try {
                const payload = {
                  version: msg.version,
                  algorithm: msg.algorithm,
                  encryptedData: msg.encryptedContent,
                  encryptedKeys: JSON.parse(msg.encryptedKeys),
                  iv: msg.iv,
                };

                const decryptedText = await encryption.decryptFromFamily(payload);

                return {
                  ...msg,
                  decryptedContent: decryptedText,
                };
              } catch (err) {
                return {
                  ...msg,
                  decryptedContent: '[Unable to decrypt]',
                };
              }
            })
          );

          setMessages(decrypted);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    }

    if (encryption.isUnlocked) {
      fetchMessages();
    }
  }, [familyId, encryption.isUnlocked]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !encryption.isUnlocked) return;

    setSending(true);

    try {
      // Get family public keys
      const keysRes = await fetch(`/api/encryption/public-keys/${familyId}`);
      const { publicKeys } = await keysRes.json();

      // Encrypt message for all family members
      const encrypted = await encryption.encryptForFamily(newMessage, publicKeys);

      // Send encrypted message
      await fetch('/api/messages/encrypted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          encryptedContent: encrypted.encryptedData,
          encryptedKeys: encrypted.encryptedKeys,
          iv: encrypted.iv,
          algorithm: encrypted.algorithm,
          version: encrypted.version,
        }),
      });

      // Add to local messages
      setMessages((prev) => [
        {
          id: Date.now().toString(),
          senderId: userId,
          sender: { name: userName },
          decryptedContent: newMessage,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!encryption.isUnlocked) {
    return (
      <Paper p="md" withBorder>
        <Stack align="center" gap="md">
          <IconLock size={48} />
          <Text>Unlock encryption to view and send secure messages</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600} size="lg">
            Encrypted Messages
          </Text>
          <Badge leftSection={<IconLock size={12} />} color="green" variant="light">
            End-to-End Encrypted
          </Badge>
        </Group>

        <ScrollArea h={400} ref={scrollRef}>
          {loading ? (
            <Stack align="center" py="xl">
              <Loader />
            </Stack>
          ) : messages.length === 0 ? (
            <Stack align="center" py="xl">
              <Text c="dimmed">No messages yet. Send the first secure message!</Text>
            </Stack>
          ) : (
            <Stack gap="sm">
              {messages.reverse().map((msg) => (
                <Group key={msg.id} gap="sm" align="flex-start">
                  <Avatar size="sm" radius="xl" color="blue">
                    {msg.sender?.name?.[0] || '?'}
                  </Avatar>
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Group gap="xs">
                      <Text size="sm" fw={500}>
                        {msg.sender?.name || 'Unknown'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </Text>
                    </Group>
                    <Paper p="xs" bg="gray.0" style={{ borderRadius: 8 }}>
                      <Text size="sm">{msg.decryptedContent}</Text>
                    </Paper>
                  </Stack>
                </Group>
              ))}
            </Stack>
          )}
        </ScrollArea>

        <Group gap="xs">
          <TextInput
            placeholder="Type an encrypted message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{ flex: 1 }}
            rightSection={<IconLock size={16} />}
          />
          <Button
            onClick={handleSend}
            loading={sending}
            leftSection={<IconSend size={16} />}
          >
            Send
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
