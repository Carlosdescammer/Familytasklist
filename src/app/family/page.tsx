'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Stack,
  Card,
  Text,
  Group,
  Button,
  Textarea,
  TextInput,
  Avatar,
  Badge,
  Grid,
  Modal,
} from '@mantine/core';
import { IconEdit, IconUser } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';
import Link from 'next/link';

export default function FamilyProfilePage() {
  const [family, setFamily] = useState<any>(null);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    funFacts: '',
  });

  useEffect(() => {
    fetchFamily();
  }, []);

  const fetchFamily = async () => {
    try {
      const res = await fetch('/api/families');
      if (res.ok) {
        const data = await res.json();
        setFamily(data);
        setFormData({
          description: data.description || '',
          funFacts: data.funFacts || '',
        });
      }
    } catch (error) {
      console.error('Error fetching family:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/families', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update family');

      notifications.show({
        title: 'Success',
        message: 'Family profile updated',
        color: 'green',
      });

      setEditModalOpened(false);
      fetchFamily();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update family profile',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!family) {
    return (
      <AppLayout>
        <PageAccessGuard pageName="family">
          <Text>Loading...</Text>
        </PageAccessGuard>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageAccessGuard pageName="family">
        <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>{family.name}</Title>
          <Button leftSection={<IconEdit size={16} />} onClick={() => setEditModalOpened(true)}>
            Edit Profile
          </Button>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>About Our Family</Title>
            {family.description ? (
              <Text>{family.description}</Text>
            ) : (
              <Text c="dimmed">No description yet. Click "Edit Profile" to add one!</Text>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Fun Facts</Title>
            {family.funFacts ? (
              <Text style={{ whiteSpace: 'pre-wrap' }}>{family.funFacts}</Text>
            ) : (
              <Text c="dimmed">No fun facts yet. Click "Edit Profile" to add some!</Text>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Family Members ({family.users?.length || 0})</Title>
            <Grid>
              {family.users?.map((user: any) => (
                <Grid.Col key={user.id} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card
                    component={Link}
                    href={`/profile/${user.id}`}
                    shadow="sm"
                    padding="md"
                    radius="md"
                    withBorder
                    style={{ cursor: 'pointer', textDecoration: 'none' }}
                  >
                    <Group>
                      <Avatar color="blue" radius="xl" size="lg">
                        {user.name ? user.name.slice(0, 2).toUpperCase() : getInitials(user.email)}
                      </Avatar>
                      <div style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Text fw={500}>{user.name || user.email.split('@')[0]}</Text>
                          {user.relationship && (
                            <Text size="sm" c="dimmed">
                              ({user.relationship})
                            </Text>
                          )}
                        </Group>
                        <Text size="sm" c="dimmed">
                          {user.email}
                        </Text>
                        <Badge size="sm" color={user.role === 'parent' ? 'blue' : 'gray'} mt="xs">
                          {user.role}
                        </Badge>
                      </div>
                    </Group>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Edit Family Profile"
        size="lg"
      >
        <Stack>
          <Textarea
            label="Family Description"
            placeholder="Tell us about your family..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
          <Textarea
            label="Fun Facts"
            placeholder="Share some fun facts about your family..."
            value={formData.funFacts}
            onChange={(e) => setFormData({ ...formData, funFacts: e.target.value })}
            rows={6}
            description="Share interesting facts, traditions, or memorable moments"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={loading}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
      </PageAccessGuard>
    </AppLayout>
  );
}
