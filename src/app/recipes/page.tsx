'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Button,
  TextInput,
  Stack,
  Group,
  Card,
  Text,
  Modal,
  Textarea,
  Select,
  Badge,
  ActionIcon,
  Loader,
  SegmentedControl,
  Tooltip,
  Divider,
  SimpleGrid,
  TagsInput,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconShoppingCart,
  IconChefHat,
  IconBook,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';

type Recipe = {
  id: string;
  title: string;
  description?: string;
  ingredients: string; // JSON string
  instructions: string; // JSON string
  cookingTime?: string;
  prepTime?: string;
  servings?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  cuisine?: string;
  imageUrl?: string;
  source: 'user' | 'ai';
  isPublic: boolean;
  isFavorite: boolean;
  tags?: string; // JSON string
  notes?: string;
  createdAt: string;
  creator?: {
    id: string;
    name?: string;
    email: string;
  };
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: [''],
    instructions: [''],
    cookingTime: '',
    prepTime: '',
    servings: '',
    difficulty: '' as 'easy' | 'medium' | 'hard' | '',
    category: '',
    cuisine: '',
    imageUrl: '',
    tags: [] as string[],
    notes: '',
  });

  useEffect(() => {
    fetchRecipes();
  }, [filter]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);

      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch recipes');

      const data = await res.json();
      setRecipes(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load recipes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecipe = async () => {
    if (!formData.title.trim() || formData.ingredients.filter(i => i.trim()).length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Title and at least one ingredient are required',
        color: 'red',
      });
      return;
    }

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ingredients: formData.ingredients.filter(i => i.trim()),
          instructions: formData.instructions.filter(i => i.trim()),
          difficulty: formData.difficulty || undefined,
          source: 'user',
        }),
      });

      if (!res.ok) throw new Error('Failed to create recipe');

      notifications.show({
        title: 'Success',
        message: 'Recipe created successfully',
        color: 'green',
      });

      setCreateModalOpened(false);
      resetForm();
      fetchRecipes();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create recipe',
        color: 'red',
      });
    }
  };

  const handleUpdateRecipe = async () => {
    if (!selectedRecipe) return;

    try {
      const res = await fetch(`/api/recipes/${selectedRecipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ingredients: formData.ingredients.filter(i => i.trim()),
          instructions: formData.instructions.filter(i => i.trim()),
          difficulty: formData.difficulty || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to update recipe');

      notifications.show({
        title: 'Success',
        message: 'Recipe updated successfully',
        color: 'green',
      });

      setEditModalOpened(false);
      setSelectedRecipe(null);
      resetForm();
      fetchRecipes();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update recipe',
        color: 'red',
      });
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete recipe');

      notifications.show({
        title: 'Success',
        message: 'Recipe deleted successfully',
        color: 'green',
      });

      setDetailModalOpened(false);
      setSelectedRecipe(null);
      fetchRecipes();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete recipe',
        color: 'red',
      });
    }
  };

  const handleToggleFavorite = async (recipe: Recipe) => {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to toggle favorite');

      fetchRecipes();
      if (selectedRecipe?.id === recipe.id) {
        const updatedRes = await fetch(`/api/recipes/${recipe.id}`);
        const updatedRecipe = await updatedRes.json();
        setSelectedRecipe(updatedRecipe);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update favorite status',
        color: 'red',
      });
    }
  };

  const handleCreateShoppingList = async (recipeId: string) => {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/create-shopping-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error('Failed to create shopping list');

      const data = await res.json();
      notifications.show({
        title: 'Success',
        message: data.message || 'Shopping list created',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create shopping list',
        color: 'red',
      });
    }
  };

  const handleShareRecipe = async (recipeId: string, makePublic: boolean) => {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makePublic }),
      });

      if (!res.ok) throw new Error('Failed to share recipe');

      notifications.show({
        title: 'Success',
        message: makePublic ? 'Recipe is now public' : 'Recipe visibility updated',
        color: 'green',
      });

      fetchRecipes();
      if (selectedRecipe?.id === recipeId) {
        const updatedRes = await fetch(`/api/recipes/${recipeId}`);
        const updatedRecipe = await updatedRes.json();
        setSelectedRecipe(updatedRecipe);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to share recipe',
        color: 'red',
      });
    }
  };

  const openEditModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    let ingredients: string[] = [];
    let instructions: string[] = [];
    let tags: string[] = [];

    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch (e) {
      ingredients = [recipe.ingredients];
    }

    try {
      instructions = JSON.parse(recipe.instructions);
    } catch (e) {
      instructions = recipe.instructions ? [recipe.instructions] : [];
    }

    try {
      tags = recipe.tags ? JSON.parse(recipe.tags) : [];
    } catch (e) {
      tags = [];
    }

    setFormData({
      title: recipe.title,
      description: recipe.description || '',
      ingredients,
      instructions,
      cookingTime: recipe.cookingTime || '',
      prepTime: recipe.prepTime || '',
      servings: recipe.servings || '',
      difficulty: recipe.difficulty || '',
      category: recipe.category || '',
      cuisine: recipe.cuisine || '',
      imageUrl: recipe.imageUrl || '',
      tags,
      notes: recipe.notes || '',
    });
    setEditModalOpened(true);
  };

  const openDetailModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setDetailModalOpened(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      ingredients: [''],
      instructions: [''],
      cookingTime: '',
      prepTime: '',
      servings: '',
      difficulty: '',
      category: '',
      cuisine: '',
      imageUrl: '',
      tags: [],
      notes: '',
    });
  };

  const addIngredient = () => {
    setFormData({ ...formData, ingredients: [...formData.ingredients, ''] });
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const addInstruction = () => {
    setFormData({ ...formData, instructions: [...formData.instructions, ''] });
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const removeInstruction = (index: number) => {
    const newInstructions = formData.instructions.filter((_, i) => i !== index);
    setFormData({ ...formData, instructions: newInstructions });
  };

  return (
    <AppLayout>
      <PageAccessGuard pageName="recipes">
        <Stack gap="lg">
          <Group justify="space-between">
            <Group gap="xs">
              <IconChefHat size={32} />
              <Title order={1}>Recipes</Title>
            </Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                resetForm();
                setCreateModalOpened(true);
              }}
            >
              Add Recipe
            </Button>
          </Group>

          <SegmentedControl
            value={filter}
            onChange={setFilter}
            data={[
              { label: 'All Recipes', value: 'all' },
              { label: 'My Recipes', value: 'my-recipes' },
              { label: 'Favorites', value: 'favorites' },
              { label: 'Public', value: 'public' },
            ]}
          />

          {loading ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : recipes.length === 0 ? (
            <Card padding="xl" withBorder>
              <Stack align="center" gap="md">
                <IconBook size={48} stroke={1.5} color="gray" />
                <Text c="dimmed" ta="center">
                  No recipes found. Create your first recipe or save some from AI suggestions!
                </Text>
              </Stack>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {recipes.map((recipe) => {
                let ingredientsArray: string[] = [];
                try {
                  ingredientsArray = JSON.parse(recipe.ingredients);
                } catch (e) {
                  ingredientsArray = [];
                }

                return (
                  <Card
                    key={recipe.id}
                    padding="lg"
                    withBorder
                    shadow="sm"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onClick={() => openDetailModal(recipe)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start">
                        <Text size="lg" fw={600} style={{ flex: 1 }}>
                          {recipe.title}
                        </Text>
                        <ActionIcon
                          variant="subtle"
                          color={recipe.isFavorite ? 'red' : 'gray'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(recipe);
                          }}
                        >
                          {recipe.isFavorite ? (
                            <IconHeartFilled size={20} />
                          ) : (
                            <IconHeart size={20} />
                          )}
                        </ActionIcon>
                      </Group>

                      <Group gap="xs">
                        <Badge size="sm" variant="light" color={recipe.source === 'ai' ? 'violet' : 'blue'}>
                          {recipe.source === 'ai' ? 'AI Generated' : 'Custom'}
                        </Badge>
                        {recipe.difficulty && (
                          <Badge size="sm" variant="filled" color="grape">
                            {recipe.difficulty}
                          </Badge>
                        )}
                        {recipe.isPublic && (
                          <Badge size="sm" variant="light" color="green">
                            Public
                          </Badge>
                        )}
                      </Group>

                      {recipe.description && (
                        <Text size="sm" c="dimmed" lineClamp={2}>
                          {recipe.description}
                        </Text>
                      )}

                      <Group gap="md">
                        {recipe.cookingTime && (
                          <Group gap={4}>
                            <Text size="xs" c="dimmed">⏱️</Text>
                            <Text size="xs">{recipe.cookingTime}</Text>
                          </Group>
                        )}
                        {recipe.servings && (
                          <Group gap={4}>
                            <Text size="xs" c="dimmed">🍽️</Text>
                            <Text size="xs">{recipe.servings}</Text>
                          </Group>
                        )}
                        <Group gap={4}>
                          <Text size="xs" c="dimmed">📝</Text>
                          <Text size="xs">{ingredientsArray.length} ingredients</Text>
                        </Group>
                      </Group>

                      <Group gap="xs" mt="auto">
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEdit size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(recipe);
                          }}
                          fullWidth
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          color="green"
                          leftSection={<IconShoppingCart size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateShoppingList(recipe.id);
                          }}
                          fullWidth
                        >
                          Shop
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          )}
        </Stack>

        {/* Create Recipe Modal */}
        <Modal
          opened={createModalOpened}
          onClose={() => {
            setCreateModalOpened(false);
            resetForm();
          }}
          title="Create New Recipe"
          size="xl"
        >
          <Stack gap="md">
            <TextInput
              label="Recipe Title"
              placeholder="e.g., Homemade Pasta Carbonara"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <Textarea
              label="Description"
              placeholder="Brief description of the recipe..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />

            <div>
              <Text size="sm" fw={500} mb="xs">Ingredients *</Text>
              <Stack gap="xs">
                {formData.ingredients.map((ingredient, index) => (
                  <Group key={index} gap="xs">
                    <TextInput
                      placeholder="e.g., 2 cups flour"
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeIngredient(index)}
                      disabled={formData.ingredients.length === 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button size="xs" variant="light" onClick={addIngredient}>
                  Add Ingredient
                </Button>
              </Stack>
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">Instructions</Text>
              <Stack gap="xs">
                {formData.instructions.map((instruction, index) => (
                  <Group key={index} gap="xs" align="flex-start">
                    <Badge size="sm" circle>{index + 1}</Badge>
                    <Textarea
                      placeholder="Instruction step..."
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      style={{ flex: 1 }}
                      rows={2}
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeInstruction(index)}
                      disabled={formData.instructions.length === 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button size="xs" variant="light" onClick={addInstruction}>
                  Add Step
                </Button>
              </Stack>
            </div>

            <Group grow>
              <TextInput
                label="Prep Time"
                placeholder="e.g., 15 minutes"
                value={formData.prepTime}
                onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
              />
              <TextInput
                label="Cooking Time"
                placeholder="e.g., 30 minutes"
                value={formData.cookingTime}
                onChange={(e) => setFormData({ ...formData, cookingTime: e.target.value })}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Servings"
                placeholder="e.g., 4 servings"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
              />
              <Select
                label="Difficulty"
                placeholder="Select difficulty"
                value={formData.difficulty}
                onChange={(value) => setFormData({ ...formData, difficulty: value as 'easy' | 'medium' | 'hard' | '' })}
                data={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
                clearable
              />
            </Group>

            <Group grow>
              <TextInput
                label="Category"
                placeholder="e.g., Dinner, Dessert"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <TextInput
                label="Cuisine"
                placeholder="e.g., Italian, Mexican"
                value={formData.cuisine}
                onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
              />
            </Group>

            <TagsInput
              label="Tags"
              placeholder="Add tags..."
              value={formData.tags}
              onChange={(value) => setFormData({ ...formData, tags: value })}
            />

            <Textarea
              label="Notes"
              placeholder="Any additional notes or tips..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setCreateModalOpened(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRecipe}>
                Create Recipe
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Edit Recipe Modal */}
        <Modal
          opened={editModalOpened}
          onClose={() => {
            setEditModalOpened(false);
            setSelectedRecipe(null);
            resetForm();
          }}
          title="Edit Recipe"
          size="xl"
        >
          <Stack gap="md">
            <TextInput
              label="Recipe Title"
              placeholder="e.g., Homemade Pasta Carbonara"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <Textarea
              label="Description"
              placeholder="Brief description of the recipe..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />

            <div>
              <Text size="sm" fw={500} mb="xs">Ingredients *</Text>
              <Stack gap="xs">
                {formData.ingredients.map((ingredient, index) => (
                  <Group key={index} gap="xs">
                    <TextInput
                      placeholder="e.g., 2 cups flour"
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeIngredient(index)}
                      disabled={formData.ingredients.length === 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button size="xs" variant="light" onClick={addIngredient}>
                  Add Ingredient
                </Button>
              </Stack>
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">Instructions</Text>
              <Stack gap="xs">
                {formData.instructions.map((instruction, index) => (
                  <Group key={index} gap="xs" align="flex-start">
                    <Badge size="sm" circle>{index + 1}</Badge>
                    <Textarea
                      placeholder="Instruction step..."
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      style={{ flex: 1 }}
                      rows={2}
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeInstruction(index)}
                      disabled={formData.instructions.length === 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button size="xs" variant="light" onClick={addInstruction}>
                  Add Step
                </Button>
              </Stack>
            </div>

            <Group grow>
              <TextInput
                label="Prep Time"
                placeholder="e.g., 15 minutes"
                value={formData.prepTime}
                onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
              />
              <TextInput
                label="Cooking Time"
                placeholder="e.g., 30 minutes"
                value={formData.cookingTime}
                onChange={(e) => setFormData({ ...formData, cookingTime: e.target.value })}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Servings"
                placeholder="e.g., 4 servings"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
              />
              <Select
                label="Difficulty"
                placeholder="Select difficulty"
                value={formData.difficulty}
                onChange={(value) => setFormData({ ...formData, difficulty: value as 'easy' | 'medium' | 'hard' | '' })}
                data={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
                clearable
              />
            </Group>

            <Group grow>
              <TextInput
                label="Category"
                placeholder="e.g., Dinner, Dessert"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <TextInput
                label="Cuisine"
                placeholder="e.g., Italian, Mexican"
                value={formData.cuisine}
                onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
              />
            </Group>

            <TagsInput
              label="Tags"
              placeholder="Add tags..."
              value={formData.tags}
              onChange={(value) => setFormData({ ...formData, tags: value })}
            />

            <Textarea
              label="Notes"
              placeholder="Any additional notes or tips..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setEditModalOpened(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRecipe}>
                Update Recipe
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Recipe Detail Modal */}
        <Modal
          opened={detailModalOpened}
          onClose={() => {
            setDetailModalOpened(false);
            setSelectedRecipe(null);
          }}
          title={selectedRecipe?.title}
          size="xl"
        >
          {selectedRecipe && (
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <Badge variant="light" color={selectedRecipe.source === 'ai' ? 'violet' : 'blue'}>
                    {selectedRecipe.source === 'ai' ? 'AI Generated' : 'Custom Recipe'}
                  </Badge>
                  {selectedRecipe.difficulty && (
                    <Badge variant="filled" color="grape">
                      {selectedRecipe.difficulty}
                    </Badge>
                  )}
                  {selectedRecipe.category && (
                    <Badge variant="light">{selectedRecipe.category}</Badge>
                  )}
                </Group>
                <ActionIcon
                  variant="subtle"
                  color={selectedRecipe.isFavorite ? 'red' : 'gray'}
                  size="lg"
                  onClick={() => handleToggleFavorite(selectedRecipe)}
                >
                  {selectedRecipe.isFavorite ? (
                    <IconHeartFilled size={24} />
                  ) : (
                    <IconHeart size={24} />
                  )}
                </ActionIcon>
              </Group>

              {selectedRecipe.description && (
                <Text>{selectedRecipe.description}</Text>
              )}

              <Group>
                {selectedRecipe.prepTime && (
                  <Group gap={4}>
                    <Text size="sm" fw={500}>Prep Time:</Text>
                    <Text size="sm">{selectedRecipe.prepTime}</Text>
                  </Group>
                )}
                {selectedRecipe.cookingTime && (
                  <Group gap={4}>
                    <Text size="sm" fw={500}>Cook Time:</Text>
                    <Text size="sm">{selectedRecipe.cookingTime}</Text>
                  </Group>
                )}
                {selectedRecipe.servings && (
                  <Group gap={4}>
                    <Text size="sm" fw={500}>Servings:</Text>
                    <Text size="sm">{selectedRecipe.servings}</Text>
                  </Group>
                )}
              </Group>

              <Divider />

              <div>
                <Text size="lg" fw={600} mb="md">Ingredients</Text>
                <Stack gap="xs">
                  {(() => {
                    try {
                      const ingredients = JSON.parse(selectedRecipe.ingredients);
                      return ingredients.map((ingredient: string, index: number) => (
                        <Group key={index} gap="xs">
                          <Text size="sm" c="dimmed">•</Text>
                          <Text size="sm">{ingredient}</Text>
                        </Group>
                      ));
                    } catch (e) {
                      return <Text size="sm">{selectedRecipe.ingredients}</Text>;
                    }
                  })()}
                </Stack>
              </div>

              <Divider />

              <div>
                <Text size="lg" fw={600} mb="md">Instructions</Text>
                <Stack gap="md">
                  {(() => {
                    try {
                      const instructions = JSON.parse(selectedRecipe.instructions);
                      if (instructions.length === 0) {
                        return (
                          <Text size="sm" c="dimmed" ta="center">
                            No instructions yet. Edit this recipe to add cooking instructions.
                          </Text>
                        );
                      }
                      return instructions.map((instruction: string, index: number) => (
                        <Group key={index} gap="sm" align="flex-start">
                          <Badge size="lg" circle>{index + 1}</Badge>
                          <Text size="sm" style={{ flex: 1 }}>{instruction}</Text>
                        </Group>
                      ));
                    } catch (e) {
                      return (
                        <Text size="sm">
                          {selectedRecipe.instructions || 'No instructions available'}
                        </Text>
                      );
                    }
                  })()}
                </Stack>
              </div>

              {selectedRecipe.notes && (
                <>
                  <Divider />
                  <div>
                    <Text size="lg" fw={600} mb="sm">Notes</Text>
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedRecipe.notes}
                    </Text>
                  </div>
                </>
              )}

              <Divider />

              <Group grow>
                <Button
                  variant="light"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => {
                    setDetailModalOpened(false);
                    openEditModal(selectedRecipe);
                  }}
                >
                  Edit Recipe
                </Button>
                <Button
                  variant="light"
                  color="green"
                  leftSection={<IconShoppingCart size={16} />}
                  onClick={() => handleCreateShoppingList(selectedRecipe.id)}
                >
                  Create Shopping List
                </Button>
              </Group>

              <Group grow>
                <Button
                  variant="light"
                  color={selectedRecipe.isPublic ? 'orange' : 'blue'}
                  leftSection={<IconShare size={16} />}
                  onClick={() => handleShareRecipe(selectedRecipe.id, !selectedRecipe.isPublic)}
                >
                  {selectedRecipe.isPublic ? 'Make Private' : 'Make Public'}
                </Button>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                >
                  Delete Recipe
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>
      </PageAccessGuard>
    </AppLayout>
  );
}
