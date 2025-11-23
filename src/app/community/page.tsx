'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Card,
  Stack,
  Group,
  Badge,
  TextInput,
  Button,
  Modal,
  Textarea,
  Rating,
  Avatar,
  Divider,
  MultiSelect,
  Grid,
  ActionIcon,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconSearch,
  IconStar,
  IconMessage,
  IconCopy,
  IconClock,
  IconUsers,
  IconChefHat,
  IconInfoCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type Recipe = {
  id: string;
  title: string;
  description?: string;
  ingredients: string;
  instructions: string;
  cookingTime?: string;
  prepTime?: string;
  servings?: string;
  difficulty?: string;
  category?: string;
  cuisine?: string;
  imageUrl?: string;
  source: string;
  isPublic: boolean;
  isFavorite: boolean;
  tags?: string;
  notes?: string;
  nutritionInfo?: string;
  createdAt: string;
  familyId: string;
  createdBy?: string;
  creator?: {
    name?: string;
    email: string;
  };
  ratingCount?: number;
  commentCount?: number;
};

type RecipeCategory = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
};

type Rating = {
  id: string;
  rating: number;
  createdAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
};

type Comment = {
  id: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
};

export default function CommunityPage() {
  const { user } = useCurrentUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ratings and comments
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchRecipes();
    fetchCategories();
  }, []);

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter only public recipes
        const publicRecipes = data.filter((r: Recipe) => r.isPublic);
        setRecipes(publicRecipes);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/recipe-categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchRatingsAndComments = async (recipeId: string) => {
    try {
      // Fetch ratings
      const ratingsRes = await fetch(`/api/recipes/${recipeId}/ratings`);
      const ratingsData = await ratingsRes.json();
      setRatings(ratingsData.ratings || []);
      setAverageRating(ratingsData.average || 0);
      setRatingCount(ratingsData.count || 0);

      // Check if user has rated
      const userRatingObj = ratingsData.ratings?.find((r: Rating) => r.user.id === user?.id);
      setUserRating(userRatingObj?.rating || 0);

      // Fetch comments
      const commentsRes = await fetch(`/api/recipes/${recipeId}/comments`);
      const commentsData = await commentsRes.json();
      setComments(commentsData.comments || []);
    } catch (error) {
      console.error('Error fetching ratings and comments:', error);
    }
  };

  const handleViewRecipe = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setModalOpened(true);
    await fetchRatingsAndComments(recipe.id);
  };

  const handleRateRecipe = async (rating: number) => {
    if (!selectedRecipe) return;

    try {
      const res = await fetch(`/api/recipes/${selectedRecipe.id}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });

      if (!res.ok) throw new Error('Failed to rate recipe');

      const data = await res.json();
      notifications.show({
        title: 'Success',
        message: data.message,
        color: 'green',
      });

      setUserRating(rating);
      await fetchRatingsAndComments(selectedRecipe.id);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to rate recipe',
        color: 'red',
      });
    }
  };

  const handleAddComment = async () => {
    if (!selectedRecipe || !newComment.trim()) return;

    try {
      const res = await fetch(`/api/recipes/${selectedRecipe.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });

      if (!res.ok) throw new Error('Failed to add comment');

      const data = await res.json();
      notifications.show({
        title: 'Success',
        message: data.message,
        color: 'green',
      });

      setNewComment('');
      await fetchRatingsAndComments(selectedRecipe.id);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add comment',
        color: 'red',
      });
    }
  };

  const handleForkRecipe = async (recipeId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recipes/${recipeId}/fork`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fork recipe');
      }

      notifications.show({
        title: 'Success!',
        message: data.message,
        color: 'green',
      });

      setModalOpened(false);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fork recipe',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.cuisine?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategories =
      selectedCategories.length === 0 ||
      selectedCategories.some(cat => recipe.category?.includes(cat) || recipe.tags?.includes(cat));

    return matchesSearch && matchesCategories;
  });

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'green';
      case 'medium': return 'yellow';
      case 'hard': return 'red';
      default: return 'gray';
    }
  };

  return (
    <AppLayout>
      <PageAccessGuard pageName="community">
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <div>
              <Title order={1}>Community Recipes</Title>
              <Text c="dimmed" size="sm">Discover and share recipes from families around the world</Text>
            </div>
          </Group>

          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            Browse recipes shared by other families. Fork any recipe to add it to your own collection and customize it!
          </Alert>

          {/* Filters */}
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                placeholder="Search recipes by title, description, or cuisine..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <MultiSelect
                placeholder="Filter by categories"
                data={categories.map(cat => ({
                  value: cat.name,
                  label: `${cat.icon} ${cat.name}`,
                }))}
                value={selectedCategories}
                onChange={setSelectedCategories}
                searchable
                clearable
              />
            </Stack>
          </Card>

          {/* Recipe Grid */}
          <Text size="sm" c="dimmed">
            Showing {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
          </Text>

          <Grid>
            {filteredRecipes.map((recipe) => (
              <Grid.Col key={recipe.id} span={{ base: 12, sm: 6, md: 4 }}>
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}
                  onClick={() => handleViewRecipe(recipe)}
                >
                  <Stack gap="md" style={{ flex: 1 }}>
                    <div>
                      <Group justify="space-between" mb="xs">
                        <Text fw={600} size="lg" lineClamp={2}>{recipe.title}</Text>
                      </Group>

                      {recipe.description && (
                        <Text size="sm" c="dimmed" lineClamp={2}>
                          {recipe.description}
                        </Text>
                      )}
                    </div>

                    <Group gap="xs">
                      {recipe.difficulty && (
                        <Badge color={getDifficultyColor(recipe.difficulty)} size="sm">
                          {recipe.difficulty}
                        </Badge>
                      )}
                      {recipe.cuisine && (
                        <Badge variant="light" size="sm">
                          {recipe.cuisine}
                        </Badge>
                      )}
                    </Group>

                    <Group gap="md" mt="auto">
                      {recipe.cookingTime && (
                        <Group gap={4}>
                          <IconClock size={14} />
                          <Text size="xs" c="dimmed">{recipe.cookingTime}</Text>
                        </Group>
                      )}
                      {recipe.servings && (
                        <Group gap={4}>
                          <IconUsers size={14} />
                          <Text size="xs" c="dimmed">{recipe.servings}</Text>
                        </Group>
                      )}
                    </Group>

                    <Group gap="xs">
                      <Group gap={4}>
                        <IconStar size={14} />
                        <Text size="xs">{recipe.ratingCount || 0}</Text>
                      </Group>
                      <Group gap={4}>
                        <IconMessage size={14} />
                        <Text size="xs">{recipe.commentCount || 0}</Text>
                      </Group>
                    </Group>

                    <Text size="xs" c="dimmed">
                      by {recipe.creator?.name || recipe.creator?.email.split('@')[0]} • {dayjs(recipe.createdAt).fromNow()}
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>

          {filteredRecipes.length === 0 && (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Stack align="center" gap="md">
                <IconChefHat size={48} stroke={1.5} />
                <Text size="lg" fw={500}>No recipes found</Text>
                <Text size="sm" c="dimmed" ta="center">
                  {searchQuery || selectedCategories.length > 0
                    ? 'Try adjusting your filters'
                    : 'No public recipes available yet'}
                </Text>
              </Stack>
            </Card>
          )}
        </Stack>

        {/* Recipe Detail Modal */}
        <Modal
          opened={modalOpened}
          onClose={() => {
            setModalOpened(false);
            setSelectedRecipe(null);
            setRatings([]);
            setComments([]);
            setUserRating(0);
            setNewComment('');
          }}
          title={selectedRecipe?.title}
          size="xl"
          styles={{
            body: { maxHeight: '70vh', overflowY: 'auto' },
          }}
        >
          {selectedRecipe && (
            <Stack gap="md">
              {/* Recipe Info */}
              <Group>
                {selectedRecipe.difficulty && (
                  <Badge color={getDifficultyColor(selectedRecipe.difficulty)}>
                    {selectedRecipe.difficulty}
                  </Badge>
                )}
                {selectedRecipe.cuisine && (
                  <Badge variant="light">{selectedRecipe.cuisine}</Badge>
                )}
                {selectedRecipe.category && (
                  <Badge variant="outline">{selectedRecipe.category}</Badge>
                )}
              </Group>

              {selectedRecipe.description && (
                <Text>{selectedRecipe.description}</Text>
              )}

              <Group>
                {selectedRecipe.prepTime && (
                  <Text size="sm">
                    <strong>Prep:</strong> {selectedRecipe.prepTime}
                  </Text>
                )}
                {selectedRecipe.cookingTime && (
                  <Text size="sm">
                    <strong>Cook:</strong> {selectedRecipe.cookingTime}
                  </Text>
                )}
                {selectedRecipe.servings && (
                  <Text size="sm">
                    <strong>Servings:</strong> {selectedRecipe.servings}
                  </Text>
                )}
              </Group>

              {/* Rating Section */}
              <Divider />
              <div>
                <Group justify="space-between" mb="sm">
                  <div>
                    <Text size="sm" fw={500}>Community Rating</Text>
                    <Group gap="xs">
                      <Rating value={averageRating} fractions={2} readOnly />
                      <Text size="sm" c="dimmed">
                        {averageRating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
                      </Text>
                    </Group>
                  </div>
                </Group>

                <div>
                  <Text size="sm" fw={500} mb="xs">Your Rating</Text>
                  <Rating
                    value={userRating}
                    onChange={handleRateRecipe}
                  />
                </div>
              </div>

              {/* Fork Button */}
              <Button
                leftSection={<IconCopy size={16} />}
                onClick={() => handleForkRecipe(selectedRecipe.id)}
                loading={loading}
                variant="light"
                color="blue"
                fullWidth
              >
                Fork Recipe to My Collection
              </Button>

              {/* Ingredients */}
              <Divider />
              <div>
                <Text fw={500} mb="xs">Ingredients</Text>
                <Stack gap="xs">
                  {JSON.parse(selectedRecipe.ingredients).map((ingredient: string, idx: number) => (
                    <Text key={idx} size="sm">• {ingredient}</Text>
                  ))}
                </Stack>
              </div>

              {/* Instructions */}
              <Divider />
              <div>
                <Text fw={500} mb="xs">Instructions</Text>
                <Stack gap="sm">
                  {JSON.parse(selectedRecipe.instructions).map((instruction: string, idx: number) => (
                    <Text key={idx} size="sm">
                      <strong>{idx + 1}.</strong> {instruction}
                    </Text>
                  ))}
                </Stack>
              </div>

              {/* Comments Section */}
              <Divider />
              <div>
                <Text fw={500} mb="md">Comments ({comments.length})</Text>

                {/* Add Comment */}
                <Stack gap="sm" mb="md">
                  <Textarea
                    placeholder="Share your thoughts about this recipe..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    minRows={2}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    size="sm"
                  >
                    Add Comment
                  </Button>
                </Stack>

                {/* Comments List */}
                <Stack gap="md">
                  {comments.map((comment) => (
                    <Card key={comment.id} padding="sm" withBorder>
                      <Group gap="sm" align="flex-start">
                        <Avatar size="sm" radius="xl" color="blue">
                          {(comment.user.name || comment.user.email)[0].toUpperCase()}
                        </Avatar>
                        <div style={{ flex: 1 }}>
                          <Group gap="xs">
                            <Text size="sm" fw={500}>
                              {comment.user.name || comment.user.email.split('@')[0]}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {dayjs(comment.createdAt).fromNow()}
                            </Text>
                          </Group>
                          <Text size="sm" mt={4}>{comment.comment}</Text>
                        </div>
                      </Group>
                    </Card>
                  ))}

                  {comments.length === 0 && (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No comments yet. Be the first to comment!
                    </Text>
                  )}
                </Stack>
              </div>
            </Stack>
          )}
        </Modal>
      </PageAccessGuard>
    </AppLayout>
  );
}
