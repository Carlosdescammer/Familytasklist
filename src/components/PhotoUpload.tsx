'use client';

import { useState } from 'react';
import { Button, Group, Text, Stack, Image, CloseButton, ActionIcon, Box, Paper } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconTrash } from '@tabler/icons-react';
import { useUploadThing } from '@/lib/uploadthing';
import { notifications } from '@mantine/notifications';

interface PhotoUploadProps {
  familyId: string;
  eventId?: string;
  recipeId?: string;
  onUploadComplete?: (urls: string[]) => void;
  maxFiles?: number;
  existingPhotos?: string[];
  onRemovePhoto?: (url: string) => void;
}

export default function PhotoUpload({
  familyId,
  eventId,
  recipeId,
  onUploadComplete,
  maxFiles = 10,
  existingPhotos = [],
  onRemovePhoto,
}: PhotoUploadProps) {
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const { startUpload } = useUploadThing('photoUploader', {
    onClientUploadComplete: async (res) => {
      const urls = res?.map((r) => r.url) || [];

      // Save photo metadata to database
      try {
        for (const url of urls) {
          const fileName = files[urls.indexOf(url)]?.name || 'photo.jpg';
          const fileSize = files[urls.indexOf(url)]?.size || 0;

          await fetch('/api/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              familyId,
              url,
              fileName,
              fileSize,
              eventId,
              recipeId,
            }),
          });
        }

        notifications.show({
          title: 'Success',
          message: `${urls.length} photo${urls.length > 1 ? 's' : ''} uploaded successfully`,
          color: 'green',
        });

        setFiles([]);
        setPreviewUrls([]);
        onUploadComplete?.(urls);
      } catch (error) {
        console.error('Error saving photo metadata:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to save photo metadata',
          color: 'red',
        });
      }
      setUploading(false);
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
      notifications.show({
        title: 'Upload failed',
        message: error.message,
        color: 'red',
      });
      setUploading(false);
    },
  });

  const handleDrop = (droppedFiles: FileWithPath[]) => {
    const newFiles = [...files, ...droppedFiles].slice(0, maxFiles);
    setFiles(newFiles);

    // Generate preview URLs
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newPreviews);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);

    // Revoke and regenerate preview URLs
    URL.revokeObjectURL(previewUrls[index]);
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newPreviews);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      await startUpload(files);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  };

  const handleRemoveExistingPhoto = async (url: string) => {
    if (!onRemovePhoto) return;

    try {
      onRemovePhoto(url);
      notifications.show({
        title: 'Success',
        message: 'Photo removed',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to remove photo',
        color: 'red',
      });
    }
  };

  return (
    <Stack gap="md">
      {existingPhotos.length > 0 && (
        <div>
          <Text size="sm" fw={500} mb="xs">Existing Photos</Text>
          <Group gap="sm">
            {existingPhotos.map((url, index) => (
              <Paper key={index} pos="relative" withBorder p={4}>
                <Image
                  src={url}
                  alt={`Photo ${index + 1}`}
                  w={100}
                  h={100}
                  fit="cover"
                  radius="sm"
                />
                {onRemovePhoto && (
                  <ActionIcon
                    pos="absolute"
                    top={8}
                    right={8}
                    size="sm"
                    color="red"
                    variant="filled"
                    onClick={() => handleRemoveExistingPhoto(url)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                )}
              </Paper>
            ))}
          </Group>
        </div>
      )}

      <Dropzone
        onDrop={handleDrop}
        onReject={(files) => {
          notifications.show({
            title: 'Invalid files',
            message: `Some files were rejected. Max ${maxFiles} images allowed.`,
            color: 'red',
          });
        }}
        maxSize={4 * 1024 * 1024}
        accept={IMAGE_MIME_TYPE}
        maxFiles={maxFiles - files.length}
        disabled={uploading || files.length >= maxFiles}
      >
        <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload size={52} stroke={1.5} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={52} stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={52} stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              Drag images here or click to select files
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach up to {maxFiles} images, each file should not exceed 4MB
            </Text>
          </div>
        </Group>
      </Dropzone>

      {previewUrls.length > 0 && (
        <div>
          <Text size="sm" fw={500} mb="xs">Selected Files ({files.length})</Text>
          <Group gap="sm">
            {previewUrls.map((url, index) => (
              <Paper key={index} pos="relative" withBorder p={4}>
                <Image
                  src={url}
                  alt={files[index].name}
                  w={100}
                  h={100}
                  fit="cover"
                  radius="sm"
                />
                <CloseButton
                  pos="absolute"
                  top={8}
                  right={8}
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  variant="filled"
                  color="red"
                />
              </Paper>
            ))}
          </Group>
        </div>
      )}

      {files.length > 0 && (
        <Button
          onClick={handleUpload}
          loading={uploading}
          disabled={uploading}
          fullWidth
        >
          Upload {files.length} Photo{files.length > 1 ? 's' : ''}
        </Button>
      )}
    </Stack>
  );
}
