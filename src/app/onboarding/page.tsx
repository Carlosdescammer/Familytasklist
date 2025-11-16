'use client';

import { useState } from 'react';
import { Container, Paper, Title, Text, Button, Stack, TextInput, Group } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateFamily = async () => {
    console.log('handleCreateFamily called, familyName:', familyName);

    if (!familyName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a family name',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    console.log('Sending request to /api/families...');

    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error('Failed to create family');
      }

      const data = await res.json();
      console.log('Family created:', data);

      notifications.show({
        title: 'Success',
        message: 'Family created successfully!',
        color: 'green',
      });

      console.log('Redirecting to /...');
      // Force a full page reload to refresh the session with the new familyId
      window.location.href = '/';
    } catch (error) {
      console.error('Error creating family:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create family',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter an invite code',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });

      if (!res.ok) throw new Error('Failed to join family');

      notifications.show({
        title: 'Success',
        message: 'Joined family successfully!',
        color: 'green',
      });

      // Force a full page reload to refresh the session with the new familyId
      window.location.href = '/';
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to join family',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" style={{ paddingTop: '5rem' }}>
      <Paper shadow="md" p="xl" radius="md">
        <Stack gap="lg">
          <div style={{ textAlign: 'center' }}>
            <Title order={1}>Welcome to FamilyList</Title>
            <Text c="dimmed" size="sm" mt="sm">
              Get started by creating or joining a family
            </Text>
          </div>

          {mode === 'choice' && (
            <Stack gap="md">
              <Button size="lg" onClick={() => setMode('create')}>
                Create a New Family
              </Button>
              <Button size="lg" variant="outline" onClick={() => setMode('join')}>
                Join Existing Family
              </Button>
            </Stack>
          )}

          {mode === 'create' && (
            <Stack gap="md">
              <TextInput
                label="Family Name"
                placeholder="The Smiths"
                value={familyName}
                onChange={(e) => setFamilyName(e.currentTarget.value)}
                required
              />
              <Group grow>
                <Button
                  variant="subtle"
                  onClick={() => setMode('choice')}
                  disabled={loading}
                  type="button"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateFamily}
                  loading={loading}
                  type="button"
                >
                  Create Family
                </Button>
              </Group>
            </Stack>
          )}

          {mode === 'join' && (
            <Stack gap="md">
              <TextInput
                label="Invite Code"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.currentTarget.value)}
                required
              />
              <Group grow>
                <Button variant="subtle" onClick={() => setMode('choice')} disabled={loading}>
                  Back
                </Button>
                <Button onClick={handleJoinFamily} loading={loading}>
                  Join Family
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
