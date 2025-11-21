'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Title,
  Button,
  Stack,
  Group,
  Card,
  Text,
  Modal,
  Loader,
  TextInput,
  Textarea,
  ActionIcon,
  Image,
  SimpleGrid,
  Badge,
  SegmentedControl,
  Box,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconHeart,
  IconHeartFilled,
  IconPhoto,
  IconCalendar,
  IconChefHat,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PhotoUpload from '@/components/PhotoUpload';
import { useUser } from '@clerk/nextjs';

type Photo = {
  id: string;
  familyId: string;
  uploadedBy?: string;
  url: string;
  fileName: string;
  fileSize?: number;
  caption?: string;
  description?: string;
  tags?: string;
  eventId?: string;
  recipeId?: string;
  isFavorite: boolean;
  createdAt: string;
  uploader?: {
    id: string;
    name?: string;
  };
  event?: {
    id: string;
    title: string;
  };
  recipe?: {
    id: string;
    title: string;
  };
};

export default function PhotosPage() {
  const { user } = useUser();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [familyId, setFamilyId] = useState<string>('');

  const [editForm, setEditForm] = useState({
    caption: '',
    description: '',
    isFavorite: false,
  });

  // Get familyId from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFamilyId = localStorage.getItem('selectedFamilyId');
      if (storedFamilyId) {
        setFamilyId(storedFamilyId);
      }
    }
  }, []);

  const fetchPhotos = useCallback(async () => {
    if (!familyId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/photos?familyId=${familyId}`);
      if (!res.ok) throw new Error('Failed to fetch photos');

      const data = await res.json();
      setPhotos(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load photos',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleUploadComplete = () => {
    setUploadModalOpened(false);
    fetchPhotos();
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete photo');

      notifications.show({
        title: 'Success',
        message: 'Photo deleted',
        color: 'green',
      });

      fetchPhotos();
      setDetailModalOpened(false);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete photo',
        color: 'red',
      });
    }
  };

  const handleToggleFavorite = async (photo: Photo) => {
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !photo.isFavorite }),
      });

      if (!res.ok) throw new Error('Failed to update photo');

      fetchPhotos();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update photo',
        color: 'red',
      });
    }
  };

  const handleUpdatePhoto = async () => {
    if (!editingPhoto) return;

    try {
      const res = await fetch(`/api/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error('Failed to update photo');

      notifications.show({
        title: 'Success',
        message: 'Photo updated',
        color: 'green',
      });

      fetchPhotos();
      setEditingPhoto(null);
      setDetailModalOpened(false);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update photo',
        color: 'red',
      });
    }
  };

  const openPhotoDetail = (photo: Photo) => {
    setSelectedPhoto(photo);
    setDetailModalOpened(true);
  };

  const startEditingPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditForm({
      caption: photo.caption || '',
      description: photo.description || '',
      isFavorite: photo.isFavorite,
    });
  };

  const filteredPhotos = photos.filter((photo) => {
    if (filter === 'favorites') return photo.isFavorite;
    if (filter === 'events') return photo.eventId;
    if (filter === 'recipes') return photo.recipeId;
    if (filter === 'gallery') return !photo.eventId && !photo.recipeId;
    return true;
  });

  return (
    <AppLayout>
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Family Photos</Title>
            <Text c="dimmed" size="sm">
              Share and organize your family memories
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setUploadModalOpened(true)}
          >
            Upload Photos
          </Button>
        </Group>

        <SegmentedControl
          value={filter}
          onChange={setFilter}
          data={[
            { label: 'All Photos', value: 'all' },
            { label: 'Gallery', value: 'gallery' },
            { label: 'Events', value: 'events' },
            { label: 'Recipes', value: 'recipes' },
            { label: 'Favorites', value: 'favorites' },
          ]}
        />

        {loading ? (
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        ) : filteredPhotos.length === 0 ? (
          <Card withBorder p="xl">
            <Stack align="center" gap="md">
              <IconPhoto size={48} stroke={1.5} />
              <Text c="dimmed">No photos yet. Upload your first photo!</Text>
              <Button onClick={() => setUploadModalOpened(true)}>
                Upload Photo
              </Button>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
            {filteredPhotos.map((photo) => (
              <Card
                key={photo.id}
                padding={0}
                withBorder
                style={{ overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => openPhotoDetail(photo)}
              >
                <Box pos="relative">
                  <Image
                    src={photo.url}
                    alt={photo.fileName}
                    h={200}
                    fit="cover"
                  />
                  <ActionIcon
                    pos="absolute"
                    top={8}
                    right={8}
                    size="sm"
                    variant="filled"
                    color={photo.isFavorite ? 'red' : 'gray'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(photo);
                    }}
                  >
                    {photo.isFavorite ? (
                      <IconHeartFilled size={14} />
                    ) : (
                      <IconHeart size={14} />
                    )}
                  </ActionIcon>
                  {photo.event && (
                    <Badge
                      pos="absolute"
                      top={8}
                      left={8}
                      size="xs"
                      leftSection={<IconCalendar size={12} />}
                    >
                      Event
                    </Badge>
                  )}
                  {photo.recipe && (
                    <Badge
                      pos="absolute"
                      top={8}
                      left={8}
                      size="xs"
                      leftSection={<IconChefHat size={12} />}
                    >
                      Recipe
                    </Badge>
                  )}
                </Box>
                {photo.caption && (
                  <Box p="xs">
                    <Text size="sm" lineClamp={2}>
                      {photo.caption}
                    </Text>
                  </Box>
                )}
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Upload Modal */}
      <Modal
        opened={uploadModalOpened}
        onClose={() => setUploadModalOpened(false)}
        title="Upload Photos"
        size="lg"
      >
        <PhotoUpload
          familyId={familyId}
          onUploadComplete={handleUploadComplete}
          maxFiles={10}
        />
      </Modal>

      {/* Photo Detail Modal */}
      <Modal
        opened={detailModalOpened}
        onClose={() => {
          setDetailModalOpened(false);
          setEditingPhoto(null);
          setSelectedPhoto(null);
        }}
        title={editingPhoto ? 'Edit Photo' : 'Photo Details'}
        size="lg"
      >
        {selectedPhoto && (
          <Stack gap="md">
            <Image
              src={selectedPhoto.url}
              alt={selectedPhoto.fileName}
              radius="md"
            />

            {editingPhoto ? (
              <>
                <TextInput
                  label="Caption"
                  value={editForm.caption}
                  onChange={(e) =>
                    setEditForm({ ...editForm, caption: e.target.value })
                  }
                />
                <Textarea
                  label="Description"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={3}
                />
                <Group justify="space-between">
                  <Button
                    variant="subtle"
                    onClick={() => setEditingPhoto(null)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePhoto}>Save Changes</Button>
                </Group>
              </>
            ) : (
              <>
                {selectedPhoto.caption && (
                  <div>
                    <Text fw={500} size="sm">
                      Caption
                    </Text>
                    <Text size="sm">{selectedPhoto.caption}</Text>
                  </div>
                )}
                {selectedPhoto.description && (
                  <div>
                    <Text fw={500} size="sm">
                      Description
                    </Text>
                    <Text size="sm">{selectedPhoto.description}</Text>
                  </div>
                )}
                {selectedPhoto.uploader && (
                  <div>
                    <Text fw={500} size="sm">
                      Uploaded by
                    </Text>
                    <Text size="sm">{selectedPhoto.uploader.name}</Text>
                  </div>
                )}
                {selectedPhoto.event && (
                  <div>
                    <Text fw={500} size="sm">
                      Event
                    </Text>
                    <Text size="sm">{selectedPhoto.event.title}</Text>
                  </div>
                )}
                {selectedPhoto.recipe && (
                  <div>
                    <Text fw={500} size="sm">
                      Recipe
                    </Text>
                    <Text size="sm">{selectedPhoto.recipe.title}</Text>
                  </div>
                )}
                <Group justify="space-between" mt="md">
                  <Group>
                    <Button
                      variant="subtle"
                      leftSection={<IconEdit size={16} />}
                      onClick={() => startEditingPhoto(selectedPhoto)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="subtle"
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => handleDeletePhoto(selectedPhoto.id)}
                    >
                      Delete
                    </Button>
                  </Group>
                  <Button onClick={() => setDetailModalOpened(false)}>
                    Close
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </AppLayout>
  );
}
