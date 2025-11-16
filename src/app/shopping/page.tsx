'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Button,
  TextInput,
  Stack,
  Group,
  Checkbox,
  ActionIcon,
  Paper,
  Text,
  Modal,
  Textarea,
  Select,
  Badge,
  Accordion,
  Divider,
  Loader,
  Tooltip,
  Card,
  SegmentedControl,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconShoppingCart, IconSparkles, IconInfoCircle, IconList, IconCategory } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';
import dayjs from 'dayjs';

type ShoppingItem = {
  id: string;
  name: string;
  qty?: string;
  completed: boolean;
  listId: string;
  // AI fields
  category?: string;
  estimatedPrice?: string;
  priceRange?: string;
  bestStore?: string;
  aiMetadata?: string;
  lastAiUpdate?: string;
};

type ShoppingList = {
  id: string;
  name: string;
  description?: string;
  isFamilyList: boolean;
  items?: ShoppingItem[];
  event?: {
    id: string;
    title: string;
    startTime: string;
  };
};

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [createListModalOpened, setCreateListModalOpened] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  // Item detail modal state
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
  const [itemDetailModalOpened, setItemDetailModalOpened] = useState(false);

  // Recipe suggestions state
  const [recipesModalOpened, setRecipesModalOpened] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'category'>('list');

  const [shoppingListFormData, setShoppingListFormData] = useState({
    name: '',
    description: '',
    eventId: null as string | null,
    members: [] as string[],
    isFamilyList: false,
  });

  useEffect(() => {
    fetchLists();
    fetchEvents();
    fetchFamilyMembers();
  }, []);

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/shopping-lists');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLists(data);
        // Auto-select the first list if none selected
        if (!selectedListId && data.length > 0) {
          setSelectedListId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

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

  const handleCreateList = async () => {
    if (!shoppingListFormData.name.trim()) {
      notifications.show({ title: 'Error', message: 'List name is required', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/shopping-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: shoppingListFormData.name,
          description: shoppingListFormData.description,
          eventId: shoppingListFormData.eventId,
          members: shoppingListFormData.members.join(','),
          isFamilyList: shoppingListFormData.isFamilyList,
        }),
      });

      if (!res.ok) throw new Error('Failed to create list');

      const newList = await res.json();
      notifications.show({ title: 'Success', message: 'Shopping list created', color: 'green' });
      setShoppingListFormData({
        name: '',
        description: '',
        eventId: null,
        members: [],
        isFamilyList: false,
      });
      setCreateListModalOpened(false);
      fetchLists();
      setSelectedListId(newList.id);
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to create list', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedListId) {
      notifications.show({ title: 'Error', message: 'Please select a shopping list first', color: 'red' });
      return;
    }

    if (!newItemName.trim()) {
      notifications.show({ title: 'Error', message: 'Item name is required', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/shopping-lists/${selectedListId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName, qty: newItemQty }),
      });

      if (!res.ok) throw new Error('Failed to add item');

      notifications.show({ title: 'Success', message: 'Item added', color: 'green' });
      setNewItemName('');
      setNewItemQty('');
      fetchLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to add item', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (listId: string, item: ShoppingItem) => {
    try {
      const res = await fetch(`/api/shopping-lists/${listId}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !item.completed }),
      });

      if (!res.ok) throw new Error('Failed to update item');

      fetchLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to update item', color: 'red' });
    }
  };

  const handleDeleteItem = async (listId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/shopping-lists/${listId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');

      notifications.show({ title: 'Success', message: 'Item deleted', color: 'green' });
      fetchLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to delete item', color: 'red' });
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      const res = await fetch(`/api/shopping-lists/${listId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');

      notifications.show({ title: 'Success', message: 'Shopping list deleted', color: 'green' });
      if (selectedListId === listId) {
        setSelectedListId(null);
      }
      fetchLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to delete list', color: 'red' });
    }
  };

  const handleGetRecipeSuggestions = async () => {
    if (!selectedListId) return;

    setLoadingRecipes(true);
    try {
      const res = await fetch(`/api/shopping-lists/${selectedListId}/recipe-suggestions`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get recipe suggestions');
      }

      const data = await res.json();
      setRecipes(data.recipes || []);
      setRecipesModalOpened(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to get recipe suggestions',
        color: 'red',
      });
    } finally {
      setLoadingRecipes(false);
    }
  };

  const selectedList = lists.find((list) => list.id === selectedListId);
  const activeItems = selectedList?.items?.filter((item) => !item.completed) || [];
  const completedItems = selectedList?.items?.filter((item) => item.completed) || [];

  // Group items by category
  const groupItemsByCategory = (items: ShoppingItem[]) => {
    const grouped: { [key: string]: ShoppingItem[] } = {};

    items.forEach((item) => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  };

  const categorizedActiveItems = groupItemsByCategory(activeItems);

  return (
    <AppLayout>
      <PageAccessGuard pageName="shopping">
        <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>Shopping Lists</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            color="green"
            onClick={() => {
              setShoppingListFormData({
                name: '',
                description: '',
                eventId: null,
                members: [],
                isFamilyList: false,
              });
              setCreateListModalOpened(true);
            }}
          >
            Add Shopping List
          </Button>
        </Group>

        {lists.length === 0 ? (
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <IconShoppingCart size={48} opacity={0.5} />
              <Text c="dimmed" ta="center">
                No shopping lists yet. Create your first list to get started!
              </Text>
              <Button onClick={() => setCreateListModalOpened(true)} color="green">
                Create Your First List
              </Button>
            </Stack>
          </Paper>
        ) : (
          <>
            {/* List Selector */}
            <Select
              label="Select Shopping List"
              placeholder="Choose a list"
              value={selectedListId}
              onChange={(value) => setSelectedListId(value)}
              data={lists.map((list) => ({
                value: list.id,
                label: list.name,
              }))}
              size="md"
            />

            {selectedList && (
              <>
                {/* List Info */}
                <Paper shadow="sm" p="md" radius="md" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Group gap="xs" mb="xs">
                        <Text fw={600} size="lg">{selectedList.name}</Text>
                        {selectedList.isFamilyList && (
                          <Badge color="blue" variant="light">Family List</Badge>
                        )}
                      </Group>
                      {selectedList.description && (
                        <Text size="sm" c="dimmed">{selectedList.description}</Text>
                      )}
                      {selectedList.event && (
                        <Badge color="grape" variant="dot" mt="xs">
                          Linked to: {selectedList.event.title}
                        </Badge>
                      )}
                    </div>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleDeleteList(selectedList.id)}
                      title="Delete list"
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Paper>

                {/* Add Item Form */}
                <Paper shadow="sm" p="md" radius="md" withBorder>
                  <Stack gap="sm">
                    <Text fw={500} size="sm">Add Item to List</Text>
                    <Group grow>
                      <TextInput
                        placeholder="Item name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                      />
                      <TextInput
                        placeholder="Quantity (optional)"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        style={{ maxWidth: 150 }}
                      />
                      <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={handleAddItem}
                        loading={loading}
                        style={{ maxWidth: 150 }}
                      >
                        Add Item
                      </Button>
                    </Group>
                  </Stack>
                </Paper>

                {/* Items */}
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Title order={3}>To Buy ({activeItems.length})</Title>
                      {selectedList.items && selectedList.items.length > 0 && (
                        <Text size="sm" c="dimmed" mt={4}>
                          {completedItems.length} of {selectedList.items.length} completed
                        </Text>
                      )}
                    </div>
                    <Group gap="sm">
                      {activeItems.some(item => item.category) && (
                        <SegmentedControl
                          value={viewMode}
                          onChange={(value) => setViewMode(value as 'list' | 'category')}
                          data={[
                            { label: 'List', value: 'list' },
                            { label: 'By Category', value: 'category' },
                          ]}
                          size="xs"
                        />
                      )}
                      {selectedList.items && selectedList.items.length > 0 && (
                        <Button
                          leftSection={<IconSparkles size={16} />}
                          variant="light"
                          color="violet"
                          size="xs"
                          onClick={handleGetRecipeSuggestions}
                          loading={loadingRecipes}
                        >
                          Get Recipe Ideas
                        </Button>
                      )}
                    </Group>
                  </Group>

                  {activeItems.length === 0 ? (
                    <Text c="dimmed">No items to buy in this list</Text>
                  ) : viewMode === 'list' ? (
                    activeItems.map((item) => (
                      <Paper
                        key={item.id}
                        shadow="xs"
                        p="md"
                        radius="md"
                        withBorder
                        style={{ cursor: item.lastAiUpdate ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (item.lastAiUpdate) {
                            setSelectedItem(item);
                            setItemDetailModalOpened(true);
                          }
                        }}
                      >
                        <Group justify="space-between" align="flex-start">
                          <Group align="flex-start">
                            <Checkbox
                              checked={item.completed}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleItem(selectedList.id, item);
                              }}
                              size="md"
                              style={{ marginTop: 2 }}
                            />
                            <div style={{ flex: 1 }}>
                              <Group gap="xs" mb={4}>
                                <Text fw={500}>{item.name}</Text>
                                {item.category && (
                                  <Badge size="xs" variant="light" color="blue">
                                    {item.category}
                                  </Badge>
                                )}
                                {item.lastAiUpdate && (
                                  <Tooltip label="AI analyzed">
                                    <IconSparkles size={14} color="violet" />
                                  </Tooltip>
                                )}
                              </Group>
                              {item.qty && (
                                <Text size="sm" c="dimmed">
                                  Qty: {item.qty}
                                </Text>
                              )}
                              {item.estimatedPrice && (
                                <Text size="sm" c="dimmed">
                                  Est. Price: ${item.estimatedPrice}
                                  {item.priceRange && ` (${item.priceRange})`}
                                </Text>
                              )}
                              {item.bestStore && (
                                <Group gap={4} mt={4}>
                                  <Badge size="sm" variant="dot" color="green">
                                    Best: {item.bestStore}
                                  </Badge>
                                </Group>
                              )}
                            </div>
                          </Group>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(selectedList.id, item.id);
                            }}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Group>
                      </Paper>
                    ))
                  ) : (
                    <Stack gap="lg">
                      {Object.entries(categorizedActiveItems).map(([category, items]) => (
                        <div key={category}>
                          <Group gap="xs" mb="md">
                            <IconCategory size={20} color="blue" />
                            <Text fw={600} size="lg">
                              {category}
                            </Text>
                            <Badge variant="filled" color="blue" size="sm">
                              {items.length}
                            </Badge>
                          </Group>
                          <Stack gap="sm">
                            {items.map((item) => (
                              <Paper
                                key={item.id}
                                shadow="xs"
                                p="md"
                                radius="md"
                                withBorder
                                style={{ cursor: item.lastAiUpdate ? 'pointer' : 'default' }}
                                onClick={() => {
                                  if (item.lastAiUpdate) {
                                    setSelectedItem(item);
                                    setItemDetailModalOpened(true);
                                  }
                                }}
                              >
                                <Group justify="space-between" align="flex-start">
                                  <Group align="flex-start">
                                    <Checkbox
                                      checked={item.completed}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleToggleItem(selectedList.id, item);
                                      }}
                                      size="md"
                                      style={{ marginTop: 2 }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <Group gap="xs" mb={4}>
                                        <Text fw={500}>{item.name}</Text>
                                        {item.lastAiUpdate && (
                                          <Tooltip label="AI analyzed">
                                            <IconSparkles size={14} color="violet" />
                                          </Tooltip>
                                        )}
                                      </Group>
                                      {item.qty && (
                                        <Text size="sm" c="dimmed">
                                          Qty: {item.qty}
                                        </Text>
                                      )}
                                      {item.estimatedPrice && (
                                        <Text size="sm" c="dimmed">
                                          Est. Price: ${item.estimatedPrice}
                                          {item.priceRange && ` (${item.priceRange})`}
                                        </Text>
                                      )}
                                      {item.bestStore && (
                                        <Group gap={4} mt={4}>
                                          <Badge size="sm" variant="dot" color="green">
                                            Best: {item.bestStore}
                                          </Badge>
                                        </Group>
                                      )}
                                    </div>
                                  </Group>
                                  <ActionIcon
                                    color="red"
                                    variant="subtle"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(selectedList.id, item.id);
                                    }}
                                  >
                                    <IconTrash size={18} />
                                  </ActionIcon>
                                </Group>
                              </Paper>
                            ))}
                          </Stack>
                        </div>
                      ))}
                    </Stack>
                  )}
                </Stack>

                {completedItems.length > 0 && (
                  <Stack gap="md">
                    <Title order={3}>Completed ({completedItems.length})</Title>
                    {completedItems.map((item) => (
                      <Paper key={item.id} shadow="xs" p="md" radius="md" withBorder opacity={0.6}>
                        <Group justify="space-between">
                          <Group>
                            <Checkbox
                              checked={item.completed}
                              onChange={() => handleToggleItem(selectedList.id, item)}
                              size="md"
                            />
                            <Text style={{ textDecoration: 'line-through' }}>{item.name}</Text>
                          </Group>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => handleDeleteItem(selectedList.id, item.id)}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </>
            )}

            {/* All Lists Overview */}
            {lists.length > 1 && (
              <>
                <Divider my="xl" />
                <Title order={2}>All Shopping Lists</Title>
                <Accordion variant="separated">
                  {lists.map((list) => {
                    const listActiveItems = list.items?.filter((item) => !item.completed) || [];
                    const listCompletedItems = list.items?.filter((item) => item.completed) || [];

                    return (
                      <Accordion.Item key={list.id} value={list.id}>
                        <Accordion.Control>
                          <Group justify="space-between" pr="md">
                            <div>
                              <Group gap="xs">
                                <Text fw={500}>{list.name}</Text>
                                {list.isFamilyList && (
                                  <Badge color="blue" variant="light" size="sm">Family</Badge>
                                )}
                              </Group>
                              {list.items && list.items.length > 0 && (
                                <Text size="xs" c="dimmed" mt={4}>
                                  {listCompletedItems.length} of {list.items.length} items completed
                                </Text>
                              )}
                            </div>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="sm">
                            {list.description && (
                              <Text size="sm" c="dimmed">{list.description}</Text>
                            )}
                            {list.items && list.items.length > 0 ? (
                              <>
                                <Text size="sm" fw={500}>Items ({list.items.length})</Text>
                                {list.items.map((item) => (
                                  <Group key={item.id} gap="xs">
                                    <Checkbox checked={item.completed} readOnly size="sm" />
                                    <Text
                                      size="sm"
                                      style={{ textDecoration: item.completed ? 'line-through' : 'none' }}
                                    >
                                      {item.name}
                                      {item.qty && ` (${item.qty})`}
                                    </Text>
                                  </Group>
                                ))}
                              </>
                            ) : (
                              <Text size="sm" c="dimmed">No items in this list</Text>
                            )}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    );
                  })}
                </Accordion>
              </>
            )}
          </>
        )}
      </Stack>

      {/* Create List Modal */}
      <Modal
        opened={createListModalOpened}
        onClose={() => {
          setCreateListModalOpened(false);
          setShoppingListFormData({
            name: '',
            description: '',
            eventId: null,
            members: [],
            isFamilyList: false,
          });
        }}
        title="Create Shopping List"
      >
        <Stack>
          <TextInput
            label="List Name"
            placeholder="e.g., Thanksgiving Dinner Shopping"
            value={shoppingListFormData.name}
            onChange={(e) => setShoppingListFormData({ ...shoppingListFormData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            placeholder="Additional details about this shopping list (optional)"
            value={shoppingListFormData.description}
            onChange={(e) => setShoppingListFormData({ ...shoppingListFormData, description: e.target.value })}
          />
          <Select
            label="Link to Event (Optional)"
            placeholder="Select an event to link this shopping list to"
            value={shoppingListFormData.eventId}
            onChange={(value) => setShoppingListFormData({ ...shoppingListFormData, eventId: value })}
            data={events.map(event => ({
              value: event.id,
              label: `${event.title} - ${dayjs(event.startTime).format('MMM D, YYYY h:mm A')}`
            }))}
            clearable
            searchable
          />
          <Checkbox
            label="Family List (All family members can access)"
            checked={shoppingListFormData.isFamilyList}
            onChange={(e) => setShoppingListFormData({ ...shoppingListFormData, isFamilyList: e.currentTarget.checked })}
          />
          {!shoppingListFormData.isFamilyList && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Members with Access
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                Select family members who can view and edit this list
              </Text>
              <Checkbox.Group
                value={shoppingListFormData.members}
                onChange={(value) => setShoppingListFormData({ ...shoppingListFormData, members: value })}
              >
                <Stack gap="xs">
                  {familyMembers.map((member) => {
                    let label = member.name || member.email.split('@')[0];
                    if (member.relationship) {
                      label = `${label} (${member.relationship})`;
                    }
                    return (
                      <Checkbox
                        key={member.id}
                        value={member.id}
                        label={label}
                      />
                    );
                  })}
                </Stack>
              </Checkbox.Group>
            </div>
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setCreateListModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateList} loading={loading} color="green">
              Create Shopping List
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Item Detail Modal */}
      <Modal
        opened={itemDetailModalOpened}
        onClose={() => {
          setItemDetailModalOpened(false);
          setSelectedItem(null);
        }}
        title={
          <Group gap="xs">
            <IconSparkles size={20} color="violet" />
            <Text fw={600}>Item Details</Text>
          </Group>
        }
        size="lg"
      >
        {selectedItem && (
          <Stack gap="md">
            <div>
              <Text size="xl" fw={600} mb="xs">
                {selectedItem.name}
              </Text>
              {selectedItem.qty && (
                <Text size="sm" c="dimmed">
                  Quantity: {selectedItem.qty}
                </Text>
              )}
            </div>

            <Divider />

            {selectedItem.category && (
              <div>
                <Text size="sm" fw={500} c="dimmed" mb="xs">
                  Category
                </Text>
                <Badge size="lg" variant="light" color="blue">
                  {selectedItem.category}
                </Badge>
              </div>
            )}

            {selectedItem.estimatedPrice && (
              <div>
                <Text size="sm" fw={500} c="dimmed" mb="xs">
                  Price Information
                </Text>
                <Card padding="sm" withBorder>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text size="sm">Estimated Price:</Text>
                      <Text size="sm" fw={600}>
                        ${selectedItem.estimatedPrice}
                      </Text>
                    </Group>
                    {selectedItem.priceRange && (
                      <Group gap="xs">
                        <Text size="sm">Typical Range:</Text>
                        <Text size="sm" c="dimmed">
                          {selectedItem.priceRange}
                        </Text>
                      </Group>
                    )}
                  </Stack>
                </Card>
              </div>
            )}

            {selectedItem.bestStore && (
              <div>
                <Text size="sm" fw={500} c="dimmed" mb="xs">
                  Recommended Store
                </Text>
                <Badge size="lg" variant="dot" color="green">
                  {selectedItem.bestStore}
                </Badge>
              </div>
            )}

            {selectedItem.aiMetadata && (() => {
              try {
                const metadata = JSON.parse(selectedItem.aiMetadata);
                return (
                  <>
                    {metadata.alternatives && metadata.alternatives.length > 0 && (
                      <div>
                        <Text size="sm" fw={500} c="dimmed" mb="xs">
                          Alternative Options
                        </Text>
                        <Stack gap="xs">
                          {metadata.alternatives.map((alt: string, idx: number) => (
                            <Card key={idx} padding="xs" withBorder>
                              <Text size="sm">{alt}</Text>
                            </Card>
                          ))}
                        </Stack>
                      </div>
                    )}

                    {metadata.tips && metadata.tips.length > 0 && (
                      <div>
                        <Text size="sm" fw={500} c="dimmed" mb="xs">
                          Shopping Tips
                        </Text>
                        <Stack gap="xs">
                          {metadata.tips.map((tip: string, idx: number) => (
                            <Card key={idx} padding="xs" withBorder bg="blue.0">
                              <Group gap="xs" align="flex-start">
                                <IconInfoCircle size={16} style={{ marginTop: 2 }} color="blue" />
                                <Text size="sm" style={{ flex: 1 }}>
                                  {tip}
                                </Text>
                              </Group>
                            </Card>
                          ))}
                        </Stack>
                      </div>
                    )}
                  </>
                );
              } catch (e) {
                return null;
              }
            })()}

            {selectedItem.lastAiUpdate && (
              <Text size="xs" c="dimmed" ta="center">
                AI analysis from {dayjs(selectedItem.lastAiUpdate).format('MMM D, YYYY h:mm A')}
              </Text>
            )}
          </Stack>
        )}
      </Modal>

      {/* Recipe Suggestions Modal */}
      <Modal
        opened={recipesModalOpened}
        onClose={() => {
          setRecipesModalOpened(false);
          setRecipes([]);
        }}
        title={
          <Group gap="xs">
            <IconSparkles size={20} color="violet" />
            <Text fw={600}>Recipe Suggestions</Text>
          </Group>
        }
        size="xl"
      >
        {recipes.length > 0 ? (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Based on your shopping list items, here are some recipe ideas:
            </Text>
            {recipes.map((recipe, idx) => (
              <Card key={idx} padding="md" withBorder shadow="sm">
                <Stack gap="sm">
                  <Text size="lg" fw={600}>
                    {recipe.name}
                  </Text>
                  <Text size="sm">{recipe.description}</Text>

                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div>
                      <Text size="sm" fw={500} mb="xs">
                        Ingredients:
                      </Text>
                      <Stack gap={4}>
                        {recipe.ingredients.map((ingredient: string, i: number) => (
                          <Text key={i} size="sm" c="dimmed">
                            • {ingredient}
                          </Text>
                        ))}
                      </Stack>
                    </div>
                  )}

                  {recipe.instructions && (
                    <div>
                      <Text size="sm" fw={500} mb="xs">
                        Instructions:
                      </Text>
                      <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
                        {recipe.instructions}
                      </Text>
                    </div>
                  )}

                  {recipe.difficulty && (
                    <Badge variant="light" color="grape">
                      {recipe.difficulty}
                    </Badge>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center">
            No recipes available
          </Text>
        )}
      </Modal>
      </PageAccessGuard>
    </AppLayout>
  );
}
