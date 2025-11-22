'use client';

import { useState } from 'react';
import { Button, Group, Text, Stack, Image, CloseButton, ActionIcon, Box, Paper } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconTrash } from '@tabler/icons-react';
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

    if (!familyId || familyId === '') {
      notifications.show({
        title: 'Error',
        message: 'Please select a family first',
        color: 'red',
      });
      return;
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      // Upload each file to Vercel Blob
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        // Upload to Vercel Blob
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadData = await uploadRes.json();
        uploadedUrls.push(uploadData.url);

        // Save photo metadata to database
        await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyId,
            url: uploadData.url,
            fileName: file.name,
            fileSize: file.size,
            eventId,
            recipeId,
          }),
        });
      }

      notifications.show({
        title: 'Success',
        message: `${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} uploaded successfully`,
        color: 'green',
      });

      setFiles([]);
      setPreviewUrls([]);
      setUploading(false);
      onUploadComplete?.(uploadedUrls);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploading(false);

      notifications.show({
        title: 'Upload Error',
        message: error?.message || 'Something went wrong. Please try again.',
        color: 'red',
      });
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
