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
  Autocomplete,
  Switch,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconShoppingCart, IconSparkles, IconInfoCircle, IconList, IconCategory, IconBookmark } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';
import dayjs from 'dayjs';

// Common grocery items with suggested quantities
const COMMON_ITEMS = [
  { value: 'Milk', qty: '1 gallon' },
  { value: 'Eggs', qty: '1 dozen' },
  { value: 'Bread', qty: '1 loaf' },
  { value: 'Butter', qty: '1 lb' },
  { value: 'Cheese', qty: '8 oz' },
  { value: 'Chicken Breast', qty: '2 lbs' },
  { value: 'Ground Beef', qty: '1 lb' },
  { value: 'Bacon', qty: '1 lb' },
  { value: 'Rice', qty: '2 lbs' },
  { value: 'Pasta', qty: '1 lb' },
  { value: 'Tomatoes', qty: '4-6' },
  { value: 'Lettuce', qty: '1 head' },
  { value: 'Onions', qty: '3-4' },
  { value: 'Potatoes', qty: '5 lbs' },
  { value: 'Carrots', qty: '1 lb' },
  { value: 'Apples', qty: '6' },
  { value: 'Bananas', qty: '1 bunch' },
  { value: 'Oranges', qty: '6' },
  { value: 'Strawberries', qty: '1 lb' },
  { value: 'Yogurt', qty: '32 oz' },
  { value: 'Coffee', qty: '1 lb' },
  { value: 'Sugar', qty: '4 lbs' },
  { value: 'Flour', qty: '5 lbs' },
  { value: 'Olive Oil', qty: '1 bottle' },
  { value: 'Salt', qty: '1 container' },
  { value: 'Pepper', qty: '1 container' },
  { value: 'Cereal', qty: '1 box' },
  { value: 'Orange Juice', qty: '64 oz' },
  { value: 'Soda', qty: '12 pack' },
  { value: 'Water', qty: '24 pack' },
];

type ShoppingItem = {
  id: string;
  name: string;
  qty?: string;
  completed: boolean;
  listId: string;
  // Brand selection
  brand?: string; // User-selected brand
  // AI fields
  category?: string;
  estimatedPrice?: string;
  currentPrice?: string; // Current online price from stores
  priceRange?: string;
  bestStore?: string;
  deals?: string; // JSON array of active deals
  brandOptions?: string; // JSON array of AI-suggested brands with pricing
  aiMetadata?: string;
  lastAiUpdate?: string;
  // User-entered actual price
  actualPrice?: string;
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

  // AI status state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');

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
        setAiEnabled(data.aiEnabled || false);
        setAiProvider(data.aiProvider || 'gemini');
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

      const addedItem = await res.json();

      if (aiEnabled) {
        notifications.show({
          title: 'Success',
          message: 'Item added - AI analysis in progress...',
          color: 'blue',
          icon: <IconSparkles size={20} />
        });
      } else {
        notifications.show({ title: 'Success', message: 'Item added', color: 'green' });
      }

      setNewItemName('');
      setNewItemQty('');
      fetchLists();

      // Poll for AI updates if AI is enabled
      if (aiEnabled) {
        startPollingForAIUpdates(selectedListId, addedItem.id);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to add item', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  // Poll for AI updates until the item has been analyzed
  const startPollingForAIUpdates = (listId: string, itemId: string) => {
    let pollCount = 0;
    const maxPolls = 10; // Poll for up to 20 seconds (10 polls * 2 seconds)

    const interval = setInterval(async () => {
      pollCount++;

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        clearInterval(interval);
        return;
      }

      try {
        // Fetch the updated lists
        const res = await fetch('/api/shopping-lists');
        const data = await res.json();

        if (Array.isArray(data)) {
          setLists(data);

          // Check if the item has been analyzed
          const list = data.find((l: ShoppingList) => l.id === listId);
          const item = list?.items?.find((i: ShoppingItem) => i.id === itemId);

          if (item?.lastAiUpdate) {
            // AI analysis complete!
            clearInterval(interval);
            notifications.show({
              title: 'AI Analysis Complete',
              message: `${item.name} has been analyzed with pricing and brand info`,
              color: 'green',
              icon: <IconSparkles size={20} />
            });
          }
        }
      } catch (error) {
        console.error('Error polling for AI updates:', error);
      }
    }, 2000); // Poll every 2 seconds
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

  const handleUpdateActualPrice = async (listId: string, itemId: string, actualPrice: string) => {
    try {
      const res = await fetch(`/api/shopping-lists/${listId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualPrice: actualPrice || null }),
      });

      if (!res.ok) throw new Error('Failed to update price');

      fetchLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to update price', color: 'red' });
    }
  };

  const handleUpdateBrand = async (listId: string, itemId: string, brand: string | null) => {
    try {
      const res = await fetch(`/api/shopping-lists/${listId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand }),
      });

      if (!res.ok) throw new Error('Failed to update brand');

      fetchLists();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to update brand', color: 'red' });
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

  const handleSaveRecipe = async (recipe: any) => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: recipe.title || recipe.name,
          description: recipe.description,
          ingredients: recipe.ingredients || [],
          instructions: [], // AI suggestions don't have instructions, user can add later
          cookingTime: recipe.cookingTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          source: 'ai',
        }),
      });

      if (!res.ok) throw new Error('Failed to save recipe');

      notifications.show({
        title: 'Success',
        message: 'Recipe saved! View it in the Recipes page.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save recipe',
        color: 'red',
      });
    }
  };

  const handleAnalyzeAllItems = async () => {
    if (!selectedListId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/shopping-lists/${selectedListId}/analyze-all`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start analysis');
      }

      if (data.itemsToAnalyze === 0) {
        notifications.show({
          title: 'All Set!',
          message: 'All items already have AI data',
          color: 'blue',
        });
        return;
      }

      notifications.show({
        title: 'Analysis Started',
        message: `Analyzing ${data.itemsToAnalyze} items... This may take a minute.`,
        color: 'blue',
        icon: <IconSparkles size={20} />,
        autoClose: 5000,
      });

      // Start polling for updates
      startBatchPolling(selectedListId, data.itemIds);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to analyze items',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Poll for batch analysis completion
  const startBatchPolling = (listId: string, itemIds: string[]) => {
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 2 minutes (60 polls * 2 seconds)
    let analyzedCount = 0;

    const interval = setInterval(async () => {
      pollCount++;

      if (pollCount >= maxPolls) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch('/api/shopping-lists');
        const data = await res.json();

        if (Array.isArray(data)) {
          setLists(data);

          const list = data.find((l: ShoppingList) => l.id === listId);
          if (!list) return;

          // Count how many items have been analyzed
          const newAnalyzedCount = itemIds.filter((id) => {
            const item = list.items?.find((i: ShoppingItem) => i.id === id);
            return item?.lastAiUpdate;
          }).length;

          // Show progress notification if count increased
          if (newAnalyzedCount > analyzedCount) {
            analyzedCount = newAnalyzedCount;
            notifications.show({
              title: 'Analysis Progress',
              message: `${analyzedCount} of ${itemIds.length} items analyzed`,
              color: 'blue',
              icon: <IconSparkles size={20} />,
              autoClose: 2000,
            });
          }

          // Check if all items are analyzed
          if (analyzedCount === itemIds.length) {
            clearInterval(interval);
            notifications.show({
              title: 'Analysis Complete!',
              message: `All ${itemIds.length} items have been analyzed with AI`,
              color: 'green',
              icon: <IconSparkles size={20} />,
            });
          }
        }
      } catch (error) {
        console.error('Error polling for batch updates:', error);
      }
    }, 2000);
  };

  const selectedList = lists.find((list) => list.id === selectedListId);
  const activeItems = selectedList?.items?.filter((item) => !item.completed) || [];
  const completedItems = selectedList?.items?.filter((item) => item.completed) || [];

  // Calculate list totals
  const calculateTotal = (items: ShoppingItem[]) => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.actualPrice || item.estimatedPrice || '0');
      return sum + price;
    }, 0);
  };

  const estimatedTotal = calculateTotal(activeItems);
  const actualTotal = activeItems.reduce((sum, item) => {
    if (item.actualPrice) {
      return sum + parseFloat(item.actualPrice);
    }
    return sum;
  }, 0);
  const hasActualPrices = activeItems.some(item => item.actualPrice);

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
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} mb="xs">Shopping Lists</Title>
            {aiEnabled ? (
              <Group gap="xs">
                <Badge color="green" variant="dot" size="sm">
                  AI Enabled ({aiProvider === 'openai' ? 'OpenAI' : 'Gemini'})
                </Badge>
                <Text size="xs" c="dimmed">
                  Auto price estimates & categories active
                </Text>
              </Group>
            ) : (
              <Badge color="gray" variant="light" size="sm" component="a" href="/settings" style={{ cursor: 'pointer' }}>
                AI Disabled - Click to Enable in Settings
              </Badge>
            )}
          </div>
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
                      <Autocomplete
                        placeholder="Item name (start typing for suggestions)"
                        value={newItemName}
                        onChange={(value) => {
                          setNewItemName(value);
                          // Auto-fill quantity if common item selected
                          const commonItem = COMMON_ITEMS.find(item => item.value.toLowerCase() === value.toLowerCase());
                          if (commonItem && !newItemQty) {
                            setNewItemQty(commonItem.qty);
                          }
                        }}
                        data={COMMON_ITEMS.map(item => item.value)}
                        limit={10}
                        onKeyPress={(e: React.KeyboardEvent) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                      />
                      <TextInput
                        placeholder="Quantity (optional)"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
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
                        <>
                          <Text size="sm" c="dimmed" mt={4}>
                            {completedItems.length} of {selectedList.items.length} completed
                          </Text>
                          {activeItems.length > 0 && (
                            <Group gap="md" mt="xs">
                              <Text size="sm" fw={600} c="blue">
                                Est. Total: ${estimatedTotal.toFixed(2)}
                              </Text>
                              {hasActualPrices && (
                                <Text size="sm" fw={600} c="green">
                                  Actual Total: ${actualTotal.toFixed(2)}
                                </Text>
                              )}
                            </Group>
                          )}
                        </>
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
                      {aiEnabled && selectedList.items && selectedList.items.some(item => !item.lastAiUpdate) && (
                        <Button
                          leftSection={<IconSparkles size={16} />}
                          variant="filled"
                          color="violet"
                          size="xs"
                          onClick={handleAnalyzeAllItems}
                          loading={loading}
                        >
                          Analyze All Items
                        </Button>
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
                              {(item.estimatedPrice || item.currentPrice) && (
                                <div>
                                  {item.currentPrice && (
                                    <Text size="sm" c="blue" fw={500}>
                                      Online Price: ${item.currentPrice}
                                    </Text>
                                  )}
                                  {item.estimatedPrice && (
                                    <Text size="sm" c="dimmed">
                                      Est. Price: ${item.estimatedPrice}
                                      {item.priceRange && ` (${item.priceRange})`}
                                    </Text>
                                  )}
                                </div>
                              )}
                              {item.deals && (() => {
                                try {
                                  const deals = JSON.parse(item.deals);
                                  if (deals && deals.length > 0) {
                                    return (
                                      <Group gap="xs" mt={4}>
                                        {deals.slice(0, 2).map((deal: string, idx: number) => (
                                          <Badge key={idx} size="sm" variant="filled" color="orange">
                                            🏷️ {deal}
                                          </Badge>
                                        ))}
                                        {deals.length > 2 && (
                                          <Badge size="sm" variant="light" color="orange">
                                            +{deals.length - 2} more
                                          </Badge>
                                        )}
                                      </Group>
                                    );
                                  }
                                } catch (e) {
                                  return null;
                                }
                                return null;
                              })()}
                              {item.brandOptions && (() => {
                                try {
                                  const brandOptions = JSON.parse(item.brandOptions);
                                  if (brandOptions && brandOptions.length > 0) {
                                    return (
                                      <Select
                                        placeholder="Select brand"
                                        value={item.brand || null}
                                        onChange={(value) => handleUpdateBrand(selectedList.id, item.id, value)}
                                        data={[
                                          { value: '', label: 'No preference' },
                                          ...brandOptions.map((opt: any) => ({
                                            value: opt.brand,
                                            label: `${opt.brand} - $${opt.price} at ${opt.store}${opt.details ? ` (${opt.details})` : ''}`
                                          }))
                                        ]}
                                        onClick={(e) => e.stopPropagation()}
                                        size="xs"
                                        style={{ maxWidth: 300 }}
                                        mt={4}
                                        clearable
                                      />
                                    );
                                  }
                                } catch (e) {
                                  return null;
                                }
                                return null;
                              })()}
                              {item.brand && (
                                <Badge size="sm" variant="filled" color="grape" mt={4}>
                                  Brand: {item.brand}
                                </Badge>
                              )}
                              <Group gap="xs" mt={4}>
                                <TextInput
                                  placeholder="Actual price"
                                  value={item.actualPrice || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow only numbers and decimal point
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      handleUpdateActualPrice(selectedList.id, item.id, value);
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  size="xs"
                                  style={{ maxWidth: 100 }}
                                  leftSection="$"
                                />
                                {item.bestStore && (
                                  <Badge size="sm" variant="dot" color="green">
                                    Best: {item.bestStore}
                                  </Badge>
                                )}
                              </Group>
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
                                      {(item.estimatedPrice || item.currentPrice) && (
                                        <div>
                                          {item.currentPrice && (
                                            <Text size="sm" c="blue" fw={500}>
                                              Online Price: ${item.currentPrice}
                                            </Text>
                                          )}
                                          {item.estimatedPrice && (
                                            <Text size="sm" c="dimmed">
                                              Est. Price: ${item.estimatedPrice}
                                              {item.priceRange && ` (${item.priceRange})`}
                                            </Text>
                                          )}
                                        </div>
                                      )}
                                      {item.deals && (() => {
                                        try {
                                          const deals = JSON.parse(item.deals);
                                          if (deals && deals.length > 0) {
                                            return (
                                              <Group gap="xs" mt={4}>
                                                {deals.slice(0, 2).map((deal: string, idx: number) => (
                                                  <Badge key={idx} size="sm" variant="filled" color="orange">
                                                    🏷️ {deal}
                                                  </Badge>
                                                ))}
                                                {deals.length > 2 && (
                                                  <Badge size="sm" variant="light" color="orange">
                                                    +{deals.length - 2} more
                                                  </Badge>
                                                )}
                                              </Group>
                                            );
                                          }
                                        } catch (e) {
                                          return null;
                                        }
                                        return null;
                                      })()}
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
                <Text size="sm" fw={500} mb="xs">
                  Category
                </Text>
                <Badge size="lg" variant="filled" color="blue">
                  {selectedItem.category}
                </Badge>
              </div>
            )}

            {(selectedItem.estimatedPrice || selectedItem.currentPrice) && (
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Price Information
                </Text>
                <Card padding="md" withBorder bg="gray.0" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                  <Stack gap="xs">
                    {selectedItem.currentPrice && (
                      <Group gap="xs">
                        <Text size="sm" c="blue" fw={600}>Current Online Price:</Text>
                        <Text size="sm" fw={700} c="blue">
                          ${selectedItem.currentPrice}
                        </Text>
                      </Group>
                    )}
                    {selectedItem.estimatedPrice && (
                      <Group gap="xs">
                        <Text size="sm" c="dark">Estimated Price:</Text>
                        <Text size="sm" fw={600} c="dark">
                          ${selectedItem.estimatedPrice}
                        </Text>
                      </Group>
                    )}
                    {selectedItem.priceRange && (
                      <Group gap="xs">
                        <Text size="sm" c="dark">Typical Range:</Text>
                        <Text size="sm" c="gray.7">
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
                <Text size="sm" fw={500} mb="xs">
                  Recommended Store
                </Text>
                <Badge size="lg" variant="filled" color="green">
                  {selectedItem.bestStore.toUpperCase()}
                </Badge>
              </div>
            )}

            {selectedItem.deals && (() => {
              try {
                const deals = JSON.parse(selectedItem.deals);
                if (deals && deals.length > 0) {
                  return (
                    <div>
                      <Text size="sm" fw={500} mb="xs">
                        Active Deals & Coupons
                      </Text>
                      <Stack gap="xs">
                        {deals.map((deal: string, idx: number) => (
                          <Card key={idx} padding="sm" withBorder style={{ backgroundColor: '#FFF4E6', borderColor: '#FFA94D' }}>
                            <Group gap="xs" align="flex-start">
                              <Text size="lg" style={{ flexShrink: 0 }}>🏷️</Text>
                              <Text size="sm" c="dark" fw={500} style={{ flex: 1 }}>
                                {deal}
                              </Text>
                            </Group>
                          </Card>
                        ))}
                      </Stack>
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()}

            {selectedItem.brandOptions && (() => {
              try {
                const brandOptions = JSON.parse(selectedItem.brandOptions);
                if (brandOptions && brandOptions.length > 0) {
                  return (
                    <div>
                      <Text size="sm" fw={500} mb="xs">
                        Brand Options
                      </Text>
                      <Stack gap="xs">
                        {selectedItem.brand && (
                          <Badge size="lg" variant="filled" color="grape" mb="xs">
                            Selected: {selectedItem.brand}
                          </Badge>
                        )}
                        {brandOptions.map((opt: any, idx: number) => (
                          <Card key={idx} padding="sm" withBorder bg="gray.0" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Text size="sm" fw={600} c="dark">{opt.brand}</Text>
                                <Text size="sm" fw={700} c="blue">${opt.price}</Text>
                              </Group>
                              <Text size="xs" c="dimmed">at {opt.store}</Text>
                              {opt.details && (
                                <Text size="xs" c="gray.7">{opt.details}</Text>
                              )}
                            </Stack>
                          </Card>
                        ))}
                      </Stack>
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()}

            {selectedItem.aiMetadata && (() => {
              try {
                const metadata = JSON.parse(selectedItem.aiMetadata);
                return (
                  <>
                    {metadata.alternatives && metadata.alternatives.length > 0 && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">
                          Alternative Options
                        </Text>
                        <Stack gap="xs">
                          {metadata.alternatives.map((alt: string, idx: number) => (
                            <Card key={idx} padding="sm" withBorder bg="gray.0" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                              <Text size="sm" c="dark">{alt}</Text>
                            </Card>
                          ))}
                        </Stack>
                      </div>
                    )}

                    {metadata.tips && metadata.tips.length > 0 && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">
                          Shopping Tips
                        </Text>
                        <Stack gap="xs">
                          {metadata.tips.map((tip: string, idx: number) => (
                            <Card key={idx} padding="sm" withBorder style={{ backgroundColor: '#E7F5FF' }}>
                              <Group gap="xs" align="flex-start">
                                <IconInfoCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} color="#1971C2" />
                                <Text size="sm" c="dark" style={{ flex: 1 }}>
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
                  <Group justify="space-between" align="flex-start">
                    <Text size="lg" fw={600}>
                      {recipe.title || recipe.name}
                    </Text>
                    <Group gap="xs">
                      {recipe.difficulty && (
                        <Badge variant="filled" color="grape" size="lg">
                          {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
                        </Badge>
                      )}
                      <Button
                        size="xs"
                        leftSection={<IconBookmark size={14} />}
                        onClick={() => handleSaveRecipe(recipe)}
                        variant="light"
                      >
                        Save Recipe
                      </Button>
                    </Group>
                  </Group>

                  <Text size="sm">{recipe.description}</Text>

                  {(recipe.cookingTime || recipe.servings) && (
                    <Group gap="md">
                      {recipe.cookingTime && (
                        <Group gap="xs">
                          <Text size="xs" fw={500} c="dimmed">⏱️ Time:</Text>
                          <Text size="xs">{recipe.cookingTime}</Text>
                        </Group>
                      )}
                      {recipe.servings && (
                        <Group gap="xs">
                          <Text size="xs" fw={500} c="dimmed">🍽️ Servings:</Text>
                          <Text size="xs">{recipe.servings}</Text>
                        </Group>
                      )}
                    </Group>
                  )}

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
