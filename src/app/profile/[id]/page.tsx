'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Modal,
  Select,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconEdit, IconArrowLeft } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function UserProfilePage() {
  const params = useParams();
  const { user: currentUser } = useCurrentUser();
  const [user, setUser] = useState<any>(null);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    birthday: null as Date | null,
    favoriteColor: '',
    favoriteFood: '',
    hobbies: '',
    relationship: '',
  });

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setFormData({
          name: data.name || '',
          bio: data.bio || '',
          birthday: data.birthday ? new Date(data.birthday) : null,
          favoriteColor: data.favoriteColor || '',
          favoriteFood: data.favoriteFood || '',
          hobbies: data.hobbies || '',
          relationship: data.relationship || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchUser();
    }
  }, [params.id, fetchUser]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          birthday: formData.birthday?.toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      notifications.show({
        title: 'Success',
        message: 'Profile updated',
        color: 'green',
      });

      setEditModalOpened(false);
      fetchUser();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update profile',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (email: string, name?: string) => {
    if (name) return name.slice(0, 2).toUpperCase();
    return email
      .split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isOwnProfile = currentUser?.id === params.id;
  const canEdit = currentUser?.role === 'parent' || isOwnProfile;

  if (!user) {
    return (
      <AppLayout>
        <Text>Loading...</Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Stack gap="lg">
        <Group justify="space-between">
          <Group>
            <Button
              component={Link}
              href="/family"
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Family
            </Button>
          </Group>
          {canEdit && (
            <Button leftSection={<IconEdit size={16} />} onClick={() => setEditModalOpened(true)}>
              Edit Profile
            </Button>
          )}
        </Group>

        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Group align="flex-start">
            <Avatar color="blue" radius="xl" size="xl">
              {getInitials(user.email, user.name)}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Group gap="xs" align="center">
                <Title order={2}>{user.name || user.email.split('@')[0]}</Title>
                <Badge color={user.role === 'parent' ? 'blue' : 'gray'}>{user.role}</Badge>
              </Group>
              <Text c="dimmed" mt="xs">
                {user.email}
              </Text>
              {user.bio && (
                <Text mt="md" size="sm">
                  {user.bio}
                </Text>
              )}
            </div>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Profile Details</Title>

            {user.relationship && (
              <Group>
                <Text fw={500} style={{ minWidth: 120 }}>
                  Relationship:
                </Text>
                <Text>{user.relationship}</Text>
              </Group>
            )}

            {user.birthday && (
              <Group>
                <Text fw={500} style={{ minWidth: 120 }}>
                  Birthday:
                </Text>
                <Text>{new Date(user.birthday).toLocaleDateString()}</Text>
              </Group>
            )}

            {user.favoriteColor && (
              <Group>
                <Text fw={500} style={{ minWidth: 120 }}>
                  Favorite Color:
                </Text>
                <Group gap="xs">
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: user.favoriteColor,
                      border: '1px solid #ccc',
                    }}
                  />
                  <Text>{user.favoriteColor}</Text>
                </Group>
              </Group>
            )}

            {user.favoriteFood && (
              <Group>
                <Text fw={500} style={{ minWidth: 120 }}>
                  Favorite Food:
                </Text>
                <Text>{user.favoriteFood}</Text>
              </Group>
            )}

            {user.hobbies && (
              <div>
                <Text fw={500} mb="xs">
                  Hobbies:
                </Text>
                <Text>{user.hobbies}</Text>
              </div>
            )}

            {!user.birthday &&
              !user.favoriteColor &&
              !user.favoriteFood &&
              !user.hobbies &&
              canEdit && (
                <Text c="dimmed">No profile details yet. Click "Edit Profile" to add some!</Text>
              )}
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Edit Profile"
        size="lg"
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Select
            label="Relationship"
            placeholder="Select relationship"
            value={formData.relationship}
            onChange={(value) => setFormData({ ...formData, relationship: value || '' })}
            data={[
              { value: 'Mom', label: 'Mom' },
              { value: 'Dad', label: 'Dad' },
              { value: 'Son', label: 'Son' },
              { value: 'Daughter', label: 'Daughter' },
              { value: 'Grandmother', label: 'Grandmother' },
              { value: 'Grandfather', label: 'Grandfather' },
              { value: 'Aunt', label: 'Aunt' },
              { value: 'Uncle', label: 'Uncle' },
              { value: 'Sister', label: 'Sister' },
              { value: 'Brother', label: 'Brother' },
              { value: 'Other', label: 'Other' },
            ]}
            searchable
            clearable
          />
          <Textarea
            label="Bio"
            placeholder="Tell us about yourself..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
          />
          <DateInput
            label="Birthday"
            placeholder="Select your birthday"
            value={formData.birthday}
            onChange={(date) => setFormData({ ...formData, birthday: date })}
            clearable
          />
          <TextInput
            label="Favorite Color"
            placeholder="e.g., Blue, #3498db"
            value={formData.favoriteColor}
            onChange={(e) => setFormData({ ...formData, favoriteColor: e.target.value })}
          />
          <TextInput
            label="Favorite Food"
            placeholder="e.g., Pizza"
            value={formData.favoriteFood}
            onChange={(e) => setFormData({ ...formData, favoriteFood: e.target.value })}
          />
          <Textarea
            label="Hobbies"
            placeholder="What do you like to do?"
            value={formData.hobbies}
            onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
            rows={3}
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
    </AppLayout>
  );
}
