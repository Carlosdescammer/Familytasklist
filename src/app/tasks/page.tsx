'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Button,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Group,
  Card,
  Text,
  Badge,
  Select,
  Checkbox,
  ActionIcon,
  FileInput,
  Image,
  Box,
  CloseButton,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconPlus, IconTrash, IconEdit, IconPhoto } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';
import dayjs from 'dayjs';

type Task = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: string;
  tags?: string;
  completed: boolean;
  assignedUser?: { id: string; email: string; name?: string; relationship?: string };
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    dueDate: null as Date | null,
    priority: 'medium',
    tags: '',
    assignedTo: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Completion photo state
  const [completionModalOpened, setCompletionModalOpened] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [completionPhotoFile, setCompletionPhotoFile] = useState<File | null>(null);
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState<string | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const res = await fetch('/api/families');
      if (res.ok) {
        const data = await res.json();
        setFamilyMembers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleCompletionPhotoChange = (file: File | null) => {
    setCompletionPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompletionPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCompletionPhotoPreview(null);
    }
  };

  const clearCompletionPhoto = () => {
    setCompletionPhotoFile(null);
    setCompletionPhotoPreview(null);
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      notifications.show({ title: 'Error', message: 'Title is required', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          notes: formData.notes,
          dueDate: formData.dueDate?.toISOString(),
          priority: formData.priority,
          tags: formData.tags,
          assignedTo: formData.assignedTo || undefined,
          photoUrl: photoPreview || undefined, // Include base64 photo if available
        }),
      });

      if (!res.ok) throw new Error('Failed to save task');

      notifications.show({
        title: 'Success',
        message: editingTask ? 'Task updated' : 'Task created',
        color: 'green',
      });

      setModalOpened(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to save task', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (task: Task) => {
    // If marking as complete, show completion modal to optionally add photo
    if (!task.completed) {
      setTaskToComplete(task);
      setCompletionModalOpened(true);
    } else {
      // If unchecking, just toggle without photo
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: false }),
        });

        if (!res.ok) throw new Error('Failed to update');

        fetchTasks();
      } catch (error) {
        notifications.show({ title: 'Error', message: 'Failed to update task', color: 'red' });
      }
    }
  };

  const handleCompleteTask = async (skipPhoto: boolean = false) => {
    if (!taskToComplete) return;

    setIsCompletingTask(true);
    try {
      const res = await fetch(`/api/tasks/${taskToComplete.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          completionPhotoUrl: skipPhoto ? undefined : (completionPhotoPreview || undefined),
        }),
      });

      if (!res.ok) throw new Error('Failed to complete task');

      notifications.show({
        title: 'Success',
        message: 'Task completed!',
        color: 'green',
      });

      setCompletionModalOpened(false);
      setTaskToComplete(null);
      clearCompletionPhoto();
      fetchTasks();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to complete task', color: 'red' });
    } finally {
      setIsCompletingTask(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      notifications.show({ title: 'Success', message: 'Task deleted', color: 'green' });
      fetchTasks();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to delete task', color: 'red' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      notes: '',
      dueDate: null,
      priority: 'medium',
      tags: '',
      assignedTo: '',
    });
    setEditingTask(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      notes: task.notes || '',
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      priority: task.priority,
      tags: task.tags || '',
      assignedTo: task.assignedUser?.id || '',
    });
    setModalOpened(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <AppLayout>
      <PageAccessGuard pageName="tasks">
        <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>Tasks</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              resetForm();
              setModalOpened(true);
            }}
          >
            Add Task
          </Button>
        </Group>

        <Stack gap="md">
          <Title order={3}>Pending ({activeTasks.length})</Title>
          {activeTasks.length === 0 ? (
            <Text c="dimmed">No pending tasks</Text>
          ) : (
            activeTasks.map((task) => (
              <Card key={task.id} shadow="sm" padding="md" radius="md" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Group align="flex-start">
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggle(task)}
                      mt="xs"
                    />
                    <div>
                      <Group gap="xs">
                        <Text fw={500}>{task.title}</Text>
                        <Badge size="sm" color={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </Group>
                      {task.tags && (
                        <Group gap="xs" mt="xs">
                          {task.tags.split(',').map((tag, index) => (
                            <Badge key={index} size="sm" variant="light" color="grape">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </Group>
                      )}
                      {task.notes && (
                        <Text size="sm" c="dimmed" mt="xs">
                          {task.notes}
                        </Text>
                      )}
                      {task.dueDate && (
                        <Text size="sm" c="dimmed" mt="xs">
                          Due: {dayjs(task.dueDate).format('MMM D, YYYY h:mm A')}
                        </Text>
                      )}
                      {task.assignedUser && (
                        <Text size="sm" c="dimmed">
                          Assigned to: {task.assignedUser.name || task.assignedUser.email.split('@')[0]}
                          {task.assignedUser.relationship && ` (${task.assignedUser.relationship})`}
                        </Text>
                      )}
                    </div>
                  </Group>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => openEditModal(task)}
                      leftSection={<IconEdit size={14} />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(task.id)}
                      leftSection={<IconTrash size={14} />}
                    >
                      Delete
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))
          )}
        </Stack>

        {completedTasks.length > 0 && (
          <Stack gap="md">
            <Title order={3}>Completed ({completedTasks.length})</Title>
            {completedTasks.map((task) => (
              <Card
                key={task.id}
                shadow="sm"
                padding="md"
                radius="md"
                withBorder
                style={{ opacity: 0.6 }}
              >
                <Group justify="space-between">
                  <Group>
                    <Checkbox checked={task.completed} onChange={() => handleToggle(task)} />
                    <Text style={{ textDecoration: 'line-through' }}>{task.title}</Text>
                  </Group>
                  <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(task.id)}>
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          resetForm();
        }}
        title={editingTask ? 'Edit Task' : 'Create Task'}
      >
        <Stack>
          <TextInput
            label="Title"
            placeholder="Task title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Notes"
            placeholder="Additional notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
          <Select
            label="Priority"
            value={formData.priority}
            onChange={(value) => value && setFormData({ ...formData, priority: value })}
            data={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
          <TextInput
            label="Tags"
            placeholder="e.g., Home, School, Urgent (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            description="Add tags to categorize your task"
          />
          <Select
            label="Assign To"
            placeholder="Select a family member (optional)"
            value={formData.assignedTo}
            onChange={(value) => setFormData({ ...formData, assignedTo: value || '' })}
            data={familyMembers.map((member) => {
              let label = member.name || member.email.split('@')[0];
              if (member.relationship) {
                label = `${label} (${member.relationship})`;
              }
              return {
                value: member.id,
                label: label,
              };
            })}
            clearable
            description="Choose who should complete this task"
          />
          <DateTimePicker
            label="Due Date"
            placeholder="Select due date (optional)"
            value={formData.dueDate}
            onChange={(date) => setFormData({ ...formData, dueDate: date })}
            clearable
          />
          <div>
            <FileInput
              label="Attach Photo"
              placeholder="Click to upload a photo (optional)"
              accept="image/*"
              value={photoFile}
              onChange={handlePhotoChange}
              leftSection={<IconPhoto size={16} />}
              description="Add a photo to your task"
              clearable
            />
            {photoPreview && (
              <Box mt="sm" style={{ position: 'relative' }}>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Photo Preview:</Text>
                  <CloseButton
                    onClick={clearPhoto}
                    aria-label="Remove photo"
                    size="sm"
                  />
                </Group>
                <Image
                  src={photoPreview}
                  alt="Task photo preview"
                  radius="md"
                  h={200}
                  fit="contain"
                />
              </Box>
            )}
          </div>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Task Completion Modal with Photo Upload */}
      <Modal
        opened={completionModalOpened}
        onClose={() => {
          setCompletionModalOpened(false);
          setTaskToComplete(null);
          clearCompletionPhoto();
        }}
        title="Complete Task"
      >
        <Stack>
          <Text size="sm">
            You're about to mark <Text span fw={700}>{taskToComplete?.title}</Text> as complete.
          </Text>
          <Text size="sm" c="dimmed">
            Would you like to add a photo to prove the task is done? (Optional)
          </Text>

          <FileInput
            label="Upload Completion Photo"
            placeholder="Click to upload a photo (optional)"
            accept="image/*"
            value={completionPhotoFile}
            onChange={handleCompletionPhotoChange}
            leftSection={<IconPhoto size={16} />}
            description="Add a photo showing the completed task"
            clearable
          />

          {completionPhotoPreview && (
            <Box mt="sm">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>Photo Preview:</Text>
                <CloseButton
                  onClick={clearCompletionPhoto}
                  aria-label="Remove photo"
                  size="sm"
                />
              </Group>
              <Image
                src={completionPhotoPreview}
                alt="Completion photo preview"
                radius="md"
                h={200}
                fit="contain"
              />
            </Box>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setCompletionModalOpened(false);
                setTaskToComplete(null);
                clearCompletionPhoto();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="light"
              onClick={() => handleCompleteTask(true)}
              loading={isCompletingTask}
            >
              Complete Without Photo
            </Button>
            <Button
              onClick={() => handleCompleteTask(false)}
              loading={isCompletingTask}
            >
              {completionPhotoPreview ? 'Complete with Photo' : 'Complete'}
            </Button>
          </Group>
        </Stack>
      </Modal>
      </PageAccessGuard>
    </AppLayout>
  );
}
