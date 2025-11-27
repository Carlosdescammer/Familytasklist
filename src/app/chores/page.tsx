/**
 * Chores Page
 *
 * Manage family chores and assignments
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Group,
  Tabs,
  SimpleGrid,
  Paper,
  Select,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  SegmentedControl,
  Loader,
} from '@mantine/core';
import { IconPlus, IconTrophy, IconListCheck, IconSparkles } from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ChoreCard } from '@/components/ChoreCard';
import { ChoreAssignmentCard } from '@/components/ChoreAssignmentCard';
import { PointsDisplay } from '@/components/PointsDisplay';
import { notifications } from '@mantine/notifications';

export default function ChoresPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<string | null>('my-chores');
  const [chores, setChores] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [assignModalOpened, setAssignModalOpened] = useState(false);
  const [selectedChore, setSelectedChore] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  // New chore form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [allowanceCents, setAllowanceCents] = useState(0);
  const [category, setCategory] = useState('general');
  const [difficulty, setDifficulty] = useState('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>(30);
  const [icon, setIcon] = useState('');

  // Assignment form state
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState('');

  const isParent = user?.role === 'parent' || user?.role === 'admin';

  useEffect(() => {
    if (user?.familyId) {
      fetchChores();
      fetchAssignments();
      fetchFamilyMembers();
    }
  }, [user?.familyId]);

  const fetchChores = async () => {
    try {
      const res = await fetch('/api/chores');
      const data = await res.json();
      setChores(data.chores || []);
    } catch (error) {
      console.error('Error fetching chores:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/chores/assignments');
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const res = await fetch('/api/family/members');
      const data = await res.json();
      setFamilyMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const handleCreateChore = async () => {
    if (!title) {
      notifications.show({
        title: 'Error',
        message: 'Title is required',
        color: 'red',
      });
      return;
    }

    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          points,
          allowanceCents,
          category,
          difficulty,
          estimatedMinutes: estimatedMinutes || null,
          icon,
        }),
      });

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Chore created successfully',
          color: 'green',
        });
        setCreateModalOpened(false);
        resetForm();
        fetchChores();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create chore',
        color: 'red',
      });
    }
  };

  const handleAssignChore = async () => {
    if (!assignedTo) {
      notifications.show({
        title: 'Error',
        message: 'Please select a family member',
        color: 'red',
      });
      return;
    }

    try {
      const res = await fetch(`/api/chores/${selectedChore.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo,
          dueDate: dueDate || null,
        }),
      });

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Chore assigned successfully',
          color: 'green',
        });
        setAssignModalOpened(false);
        setSelectedChore(null);
        setAssignedTo('');
        setDueDate('');
        fetchAssignments();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to assign chore',
        color: 'red',
      });
    }
  };

  const handleCompleteAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(
        `/api/chores/assignments/${assignmentId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Chore marked as complete! Waiting for verification.',
          color: 'green',
        });
        fetchAssignments();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to complete chore',
        color: 'red',
      });
    }
  };

  const handleVerifyAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(
        `/api/chores/assignments/${assignmentId}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: true }),
        }
      );

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Chore verified! Points awarded.',
          color: 'green',
        });
        fetchAssignments();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to verify chore',
        color: 'red',
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPoints(10);
    setAllowanceCents(0);
    setCategory('general');
    setDifficulty('medium');
    setEstimatedMinutes(30);
    setIcon('');
  };

  if (userLoading || loading) {
    return (
      <Container>
        <Stack align="center" py="xl">
          <Loader />
          <Text>Loading chores...</Text>
        </Stack>
      </Container>
    );
  }

  if (!user) {
    return <Container>Please log in to view chores</Container>;
  }

  const myAssignments = assignments.filter(
    (a) => a.assignment.assignedTo === user.id
  );
  const pendingVerification = assignments.filter(
    (a) => a.assignment.status === 'completed'
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Chores</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Manage family chores and earn rewards
            </Text>
          </div>
          <Group>
            <PointsDisplay points={user.gamificationPoints || 0} size="md" />
            {isParent && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpened(true)}
              >
                Create Chore
              </Button>
            )}
          </Group>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="my-chores" leftSection={<IconListCheck size={16} />}>
              My Chores ({myAssignments.length})
            </Tabs.Tab>
            {isParent && (
              <>
                <Tabs.Tab value="all-chores" leftSection={<IconSparkles size={16} />}>
                  All Chores ({chores.length})
                </Tabs.Tab>
                <Tabs.Tab
                  value="pending"
                  leftSection={<IconTrophy size={16} />}
                >
                  Pending Review ({pendingVerification.length})
                </Tabs.Tab>
              </>
            )}
          </Tabs.List>

          <Tabs.Panel value="my-chores" pt="md">
            {myAssignments.length === 0 ? (
              <Paper p="xl" withBorder>
                <Text ta="center" c="dimmed">
                  No chores assigned to you yet
                </Text>
              </Paper>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {myAssignments.map((a) => (
                  <ChoreAssignmentCard
                    key={a.assignment.id}
                    assignment={a.assignment}
                    chore={a.chore}
                    assignedToUser={a.assignedToUser}
                    isAssignee={true}
                    onComplete={() => handleCompleteAssignment(a.assignment.id)}
                  />
                ))}
              </SimpleGrid>
            )}
          </Tabs.Panel>

          {isParent && (
            <Tabs.Panel value="all-chores" pt="md">
              {chores.length === 0 ? (
                <Paper p="xl" withBorder>
                  <Text ta="center" c="dimmed">
                    No chores created yet. Create your first chore!
                  </Text>
                </Paper>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {chores.map((chore) => (
                    <ChoreCard
                      key={chore.id}
                      chore={chore}
                      onAssign={() => {
                        setSelectedChore(chore);
                        setAssignModalOpened(true);
                      }}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Tabs.Panel>
          )}

          {isParent && (
            <Tabs.Panel value="pending" pt="md">
              {pendingVerification.length === 0 ? (
                <Paper p="xl" withBorder>
                  <Text ta="center" c="dimmed">
                    No chores pending verification
                  </Text>
                </Paper>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {pendingVerification.map((a) => (
                    <ChoreAssignmentCard
                      key={a.assignment.id}
                      assignment={a.assignment}
                      chore={a.chore}
                      assignedToUser={a.assignedToUser}
                      isParent={true}
                      onVerify={() => handleVerifyAssignment(a.assignment.id)}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Tabs.Panel>
          )}
        </Tabs>

        {/* Create Chore Modal */}
        <Modal
          opened={createModalOpened}
          onClose={() => setCreateModalOpened(false)}
          title="Create New Chore"
          size="lg"
        >
          <Stack gap="md">
            <TextInput
              label="Title"
              placeholder="Wash the dishes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Textarea
              label="Description"
              placeholder="Describe the chore..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            <Group grow>
              <NumberInput
                label="Points Reward"
                value={points}
                onChange={(val) => setPoints(Number(val) || 0)}
                min={0}
              />

              <NumberInput
                label="Allowance (cents)"
                value={allowanceCents}
                onChange={(val) => setAllowanceCents(Number(val) || 0)}
                min={0}
              />
            </Group>

            <Group grow>
              <Select
                label="Category"
                value={category}
                onChange={(val) => setCategory(val || 'general')}
                data={[
                  { value: 'general', label: 'General' },
                  { value: 'cleaning', label: 'Cleaning' },
                  { value: 'kitchen', label: 'Kitchen' },
                  { value: 'yard', label: 'Yard Work' },
                  { value: 'pets', label: 'Pet Care' },
                  { value: 'homework', label: 'Homework' },
                  { value: 'personal', label: 'Personal' },
                ]}
              />

              <NumberInput
                label="Estimated Time (min)"
                placeholder="30"
                value={estimatedMinutes}
                onChange={(val) => setEstimatedMinutes(typeof val === 'number' ? val : '')}
                min={0}
              />
            </Group>

            <div>
              <Text size="sm" fw={500} mb={4}>Difficulty</Text>
              <SegmentedControl
                value={difficulty}
                onChange={setDifficulty}
                data={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                  { value: 'expert', label: 'Expert' },
                ]}
                fullWidth
              />
            </div>

            <TextInput
              label="Icon (emoji)"
              placeholder="🧹"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setCreateModalOpened(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateChore}>Create Chore</Button>
            </Group>
          </Stack>
        </Modal>

        {/* Assign Chore Modal */}
        <Modal
          opened={assignModalOpened}
          onClose={() => setAssignModalOpened(false)}
          title={`Assign: ${selectedChore?.title}`}
        >
          <Stack gap="md">
            <Select
              label="Assign to"
              placeholder="Select family member"
              value={assignedTo}
              onChange={(val) => setAssignedTo(val || '')}
              data={familyMembers.map((m) => ({
                value: m.id,
                label: m.name || m.email,
              }))}
              required
            />

            <TextInput
              label="Due Date (optional)"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => setAssignModalOpened(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAssignChore}>Assign</Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
