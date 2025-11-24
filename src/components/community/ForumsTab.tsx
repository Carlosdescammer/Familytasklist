'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Card,
  Group,
  Text,
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  Badge,
  Avatar,
  Divider,
  Alert,
  ActionIcon,
  Tooltip,
  Grid,
} from '@mantine/core';
import {
  IconPlus,
  IconMessage,
  IconEye,
  IconPin,
  IconLock,
  IconSend,
  IconChevronRight,
  IconSearch,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type ForumCategory = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  slug: string;
};

type ForumPost = {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  viewCount: number;
  replyCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  lastReplyAt?: string;
  author?: {
    id: string;
    name?: string;
    email: string;
  };
  category?: ForumCategory;
  lastReplyByUser?: {
    id: string;
    name?: string;
    email: string;
  };
};

type ForumReply = {
  id: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    name?: string;
    email: string;
  };
};

export default function ForumsTab() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('activity');
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);

  // Create post form
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<string>('');

  // Reply form
  const [newReply, setNewReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/forums/categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy) params.append('sortBy', sortBy);

      const url = `/api/forums/posts${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }, [selectedCategory, searchQuery, sortBy]);

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !newPostCategory) {
      notifications.show({
        title: 'Error',
        message: 'Please fill in all fields',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/forums/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: newPostCategory,
          title: newPostTitle,
          content: newPostContent,
        }),
      });

      if (!res.ok) throw new Error('Failed to create post');

      const data = await res.json();
      notifications.show({
        title: 'Success',
        message: data.message,
        color: 'green',
      });

      setCreateModalOpened(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('');
      fetchPosts();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create post',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPost = async (post: ForumPost) => {
    setSelectedPost(post);
    setViewModalOpened(true);

    // Fetch post details with replies
    try {
      const res = await fetch(`/api/forums/posts/${post.id}`);
      const data = await res.json();
      if (data.post) {
        setSelectedPost(data.post);
        setReplies(data.post.replies || []);
      }
    } catch (error) {
      console.error('Error fetching post details:', error);
    }
  };

  const handleAddReply = async () => {
    if (!selectedPost || !newReply.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forums/posts/${selectedPost.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newReply }),
      });

      if (!res.ok) throw new Error('Failed to add reply');

      const data = await res.json();
      notifications.show({
        title: 'Success',
        message: data.message,
        color: 'green',
      });

      setNewReply('');

      // Refresh post details
      handleViewPost(selectedPost);
      fetchPosts(); // Refresh list to update reply count
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add reply',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getUserName = (user?: { name?: string; email: string }) => {
    if (!user) return 'Unknown';
    return user.name || user.email.split('@')[0];
  };

  return (
    <Stack gap="lg">
      {/* Header with Create Post button */}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Join the discussion and share your family management tips!
        </Text>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpened(true)}
        >
          New Discussion
        </Button>
      </Group>

      {/* Search and Sort */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <TextInput
            placeholder="Search discussions..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Select
            placeholder="Sort by"
            value={sortBy}
            onChange={(value) => setSortBy(value || 'activity')}
            data={[
              { value: 'activity', label: 'Recent Activity' },
              { value: 'newest', label: 'Newest First' },
              { value: 'replies', label: 'Most Replies' },
              { value: 'views', label: 'Most Views' },
            ]}
          />
        </Grid.Col>
      </Grid>

      {/* Category Filter */}
      {categories.length > 0 && (
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs">
            <Text size="sm" fw={500}>Filter by category:</Text>
            <Button
              size="xs"
              variant={!selectedCategory ? 'filled' : 'light'}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="xs"
                variant={selectedCategory === cat.id ? 'filled' : 'light'}
                onClick={() => setSelectedCategory(cat.id)}
                leftSection={cat.icon ? <span>{cat.icon}</span> : undefined}
              >
                {cat.name}
              </Button>
            ))}
          </Group>
        </Card>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <Alert color="blue" variant="light">
          <Text size="sm">
            No discussions yet. Be the first to start a conversation!
          </Text>
        </Alert>
      ) : (
        <Stack gap="sm">
          {posts.map((post) => (
            <Card
              key={post.id}
              padding="lg"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => handleViewPost(post)}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Group gap="xs">
                    {post.isPinned && (
                      <Tooltip label="Pinned">
                        <IconPin size={16} style={{ color: 'var(--mantine-color-blue-6)' }} />
                      </Tooltip>
                    )}
                    {post.isLocked && (
                      <Tooltip label="Locked">
                        <IconLock size={16} style={{ color: 'var(--mantine-color-gray-6)' }} />
                      </Tooltip>
                    )}
                    <Text fw={600} size="md">{post.title}</Text>
                  </Group>

                  {post.category && (
                    <Badge size="sm" variant="light">
                      {post.category.icon} {post.category.name}
                    </Badge>
                  )}

                  <Group gap="md">
                    <Group gap={4}>
                      <Avatar size="xs" radius="xl" color="blue">
                        {getUserName(post.author)[0].toUpperCase()}
                      </Avatar>
                      <Text size="xs" c="dimmed">
                        {getUserName(post.author)}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">•</Text>
                    <Text size="xs" c="dimmed">
                      {dayjs(post.createdAt).fromNow()}
                    </Text>
                  </Group>

                  <Group gap="md">
                    <Group gap={4}>
                      <IconEye size={14} />
                      <Text size="xs" c="dimmed">{post.viewCount} views</Text>
                    </Group>
                    <Group gap={4}>
                      <IconMessage size={14} />
                      <Text size="xs" c="dimmed">{post.replyCount} replies</Text>
                    </Group>
                  </Group>

                  {post.lastReplyAt && post.lastReplyByUser && (
                    <Text size="xs" c="dimmed">
                      Last reply by {getUserName(post.lastReplyByUser)} {dayjs(post.lastReplyAt).fromNow()}
                    </Text>
                  )}
                </Stack>

                <ActionIcon variant="subtle" color="gray">
                  <IconChevronRight size={18} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {/* Create Post Modal */}
      <Modal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        title="Start a New Discussion"
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Category"
            placeholder="Select a category"
            data={categories.map(cat => ({
              value: cat.id,
              label: `${cat.icon || ''} ${cat.name}`,
            }))}
            value={newPostCategory}
            onChange={(value) => setNewPostCategory(value || '')}
            required
          />

          <TextInput
            label="Title"
            placeholder="What's your discussion about?"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            required
          />

          <Textarea
            label="Content"
            placeholder="Share your thoughts, questions, or tips..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            minRows={5}
            required
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setCreateModalOpened(false)}>
              Cancel
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreatePost}
              loading={submitting}
            >
              Create Discussion
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Post Modal */}
      <Modal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        title={selectedPost?.title}
        size="xl"
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {selectedPost && (
          <Stack gap="md">
            {/* Post Header */}
            <Group>
              {selectedPost.isPinned && <Badge color="blue">Pinned</Badge>}
              {selectedPost.isLocked && <Badge color="gray">Locked</Badge>}
              {selectedPost.category && (
                <Badge variant="light">
                  {selectedPost.category.icon} {selectedPost.category.name}
                </Badge>
              )}
            </Group>

            {/* Author Info */}
            <Group gap="sm">
              <Avatar size="md" radius="xl" color="blue">
                {getUserName(selectedPost.author)[0].toUpperCase()}
              </Avatar>
              <div>
                <Text size="sm" fw={500}>{getUserName(selectedPost.author)}</Text>
                <Text size="xs" c="dimmed">{dayjs(selectedPost.createdAt).fromNow()}</Text>
              </div>
            </Group>

            {/* Post Content */}
            <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedPost.content}</Text>

            {/* Stats */}
            <Group gap="md">
              <Group gap={4}>
                <IconEye size={16} />
                <Text size="sm" c="dimmed">{selectedPost.viewCount} views</Text>
              </Group>
              <Group gap={4}>
                <IconMessage size={16} />
                <Text size="sm" c="dimmed">{selectedPost.replyCount} replies</Text>
              </Group>
            </Group>

            <Divider />

            {/* Replies Section */}
            <div>
              <Text fw={500} mb="md">Replies ({replies.length})</Text>

              {/* Add Reply Form */}
              {!selectedPost.isLocked && (
                <Stack gap="sm" mb="lg">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    minRows={3}
                  />
                  <Group justify="flex-end">
                    <Button
                      leftSection={<IconSend size={16} />}
                      onClick={handleAddReply}
                      loading={submitting}
                      disabled={!newReply.trim()}
                      size="sm"
                    >
                      Reply
                    </Button>
                  </Group>
                </Stack>
              )}

              {selectedPost.isLocked && (
                <Alert color="gray" variant="light" mb="md">
                  This discussion is locked and cannot accept new replies.
                </Alert>
              )}

              {/* Replies List */}
              <Stack gap="md">
                {replies.map((reply) => (
                  <Card key={reply.id} padding="md" withBorder>
                    <Group gap="sm" align="flex-start">
                      <Avatar size="sm" radius="xl" color="blue">
                        {getUserName(reply.author)[0].toUpperCase()}
                      </Avatar>
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Text size="sm" fw={500}>{getUserName(reply.author)}</Text>
                          <Text size="xs" c="dimmed">
                            {dayjs(reply.createdAt).fromNow()}
                          </Text>
                        </Group>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {reply.content}
                        </Text>
                      </Stack>
                    </Group>
                  </Card>
                ))}

                {replies.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No replies yet. Be the first to respond!
                  </Text>
                )}
              </Stack>
            </div>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
