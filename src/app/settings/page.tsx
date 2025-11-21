'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Stack,
  Card,
  Text,
  Group,
  Button,
  TextInput,
  CopyButton,
  ActionIcon,
  Tooltip,
  Select,
  Badge,
  Switch,
  MultiSelect,
  PasswordInput,
  Alert,
  Anchor,
  Loader,
  Modal,
  NumberInput,
  Checkbox,
  Divider,
  Code,
} from '@mantine/core';
import { IconCheck, IconCopy, IconInfoCircle, IconSparkles, IconSettings, IconCoins, IconTrophy, IconCalendarEvent, IconChartBar, IconRobot, IconLock, IconLockOpen, IconBell } from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';
import { generateCalendarToken } from '@/lib/calendar-token';
import { PAGE_LABELS, PAGE_ROUTES, getAccessiblePages } from '@/lib/page-access';

const COMMON_STORES = [
  'Winn-Dixie',
  'Aldi',
  'Publix',
  'Walmart',
  'Target',
  'Kroger',
  "Sam's Club",
  'Costco',
  "Trader Joe's",
  'Whole Foods',
  'Food Lion',
  'Safeway',
  'Stop & Shop',
  'Giant',
];

export default function SettingsPage() {
  const { user } = useCurrentUser();
  const [family, setFamily] = useState<any>(null);

  // AI Settings state
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [preferredStores, setPreferredStores] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);

  // Child Settings Modal state
  const [childSettingsModalOpened, setChildSettingsModalOpened] = useState(false);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [childSettings, setChildSettings] = useState<any>({
    gamificationEnabled: false,
    pointsPerTask: 10,
    familyBucks: 0,
    totalPointsEarned: 0,
    allowedPages: [],
  });
  const [isSavingChildSettings, setIsSavingChildSettings] = useState(false);
  const [pointsToAward, setPointsToAward] = useState<number>(0);

  // Join Family state
  const [joinFamilyCode, setJoinFamilyCode] = useState('');
  const [isJoiningFamily, setIsJoiningFamily] = useState(false);

  // AI Usage stats state
  const [aiUsageStats, setAiUsageStats] = useState<any>(null);
  const [loadingAiStats, setLoadingAiStats] = useState(false);

  // Notification preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, boolean>>({});
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    fetchFamily();
    fetchAiUsageStats();
    fetchNotificationPreferences();
  }, []);

  const fetchFamily = async () => {
    try {
      const res = await fetch('/api/families');
      if (res.ok) {
        const data = await res.json();
        setFamily(data);
        // Populate AI settings
        setAiProvider(data.aiProvider || 'gemini');
        setAiEnabled(data.aiEnabled || false);
        setPreferredStores(data.preferredStores || []);
        setLocation(data.location || '');
        // Don't populate API key - it's masked on the server
      }
    } catch (error) {
      console.error('Error fetching family:', error);
    }
  };

  const fetchAiUsageStats = async () => {
    try {
      setLoadingAiStats(true);
      const res = await fetch('/api/ai-usage');
      if (res.ok) {
        const data = await res.json();
        setAiUsageStats(data);
      }
    } catch (error) {
      console.error('Error fetching AI usage stats:', error);
    } finally {
      setLoadingAiStats(false);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      setLoadingPreferences(true);
      const res = await fetch('/api/users/preferences');
      if (res.ok) {
        const data = await res.json();
        setEmailNotifications(data.emailNotifications ?? true);
        setNotificationPreferences(data.notificationPreferences || {});
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    try {
      setSavingPreferences(true);
      const res = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications,
          notificationPreferences,
        }),
      });

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Notification preferences saved successfully',
          color: 'green',
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save notification preferences',
        color: 'red',
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        throw new Error('Failed to update role');
      }

      notifications.show({
        title: 'Success',
        message: 'Role updated successfully',
        color: 'green',
      });

      fetchFamily(); // Refresh family data
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update role',
        color: 'red',
      });
    }
  };

  const handleJoinFamily = async () => {
    if (!joinFamilyCode || joinFamilyCode.trim().length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid invite code',
        color: 'red',
      });
      return;
    }

    try {
      setIsJoiningFamily(true);
      const res = await fetch('/api/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinFamilyCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join family');
      }

      notifications.show({
        title: 'Success!',
        message: `You've successfully joined ${data.family.name}`,
        color: 'green',
      });

      setJoinFamilyCode('');
      fetchFamily(); // Refresh family data

      // Optionally reload the page to update all family-dependent data
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to join family',
        color: 'red',
      });
    } finally {
      setIsJoiningFamily(false);
    }
  };

  const getCalendarFeedUrl = () => {
    if (!user?.familyId) return '';
    const token = generateCalendarToken(user.familyId);

    // Get base URL and force HTTPS in production
    let baseUrl = '';
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
      // Force HTTPS for production domains (not localhost)
      if (!baseUrl.includes('localhost') && baseUrl.startsWith('http://')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }
    }

    return `${baseUrl}/api/calendar/feed/${user.familyId}/${token}`;
  };

  const copyCalendarUrl = () => {
    const url = getCalendarFeedUrl();
    navigator.clipboard.writeText(url);
    notifications.show({
      title: 'Copied!',
      message: 'Calendar subscription URL copied to clipboard',
      color: 'green',
    });
  };

  const handleSaveAiSettings = async () => {
    if (aiEnabled && !aiApiKey && !family?.hasApiKey) {
      const providerName = aiProvider === 'openai' ? 'OpenAI' : 'Google Gemini';
      notifications.show({
        title: 'Error',
        message: `Please enter your ${providerName} API key to enable AI features`,
        color: 'red',
      });
      return;
    }

    setIsSavingAi(true);
    try {
      const updateData: any = {
        aiProvider,
        aiEnabled,
        preferredStores,
        location,
      };

      // Only include API key if it's been entered
      if (aiApiKey.trim().length > 0) {
        updateData.aiApiKey = aiApiKey;
      }

      const res = await fetch('/api/families', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      notifications.show({
        title: 'Success',
        message: 'AI settings saved successfully',
        color: 'green',
      });

      // Clear the API key field after saving
      setAiApiKey('');
      fetchFamily();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save AI settings',
        color: 'red',
      });
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleOpenChildSettings = async (child: any) => {
    setSelectedChild(child);

    // Fetch the child's current settings
    try {
      const res = await fetch(`/api/users/${child.id}/child-settings`);
      if (res.ok) {
        const data = await res.json();
        setChildSettings({
          gamificationEnabled: data.gamificationEnabled || false,
          pointsPerTask: data.pointsPerTask || 10,
          familyBucks: data.familyBucks || 0,
          totalPointsEarned: data.totalPointsEarned || 0,
          allowedPages: data.allowedPages || [],
        });
      }
    } catch (error) {
      console.error('Error fetching child settings:', error);
    }

    setChildSettingsModalOpened(true);
  };

  const handleSaveChildSettings = async () => {
    if (!selectedChild) return;

    setIsSavingChildSettings(true);
    try {
      const res = await fetch(`/api/users/${selectedChild.id}/child-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gamificationEnabled: childSettings.gamificationEnabled,
          pointsPerTask: childSettings.pointsPerTask,
          allowedPages: childSettings.allowedPages,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save child settings');
      }

      notifications.show({
        title: 'Success',
        message: `Settings updated for ${selectedChild.name || selectedChild.email}`,
        color: 'green',
      });

      fetchFamily();
      setChildSettingsModalOpened(false);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save child settings',
        color: 'red',
      });
    } finally {
      setIsSavingChildSettings(false);
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedChild || pointsToAward === 0) return;

    // Check if gamification is enabled first
    if (!childSettings.gamificationEnabled) {
      notifications.show({
        title: 'Gamification Not Enabled',
        message: 'Please enable gamification mode and save settings before awarding points',
        color: 'orange',
      });
      return;
    }

    try {
      const res = await fetch(`/api/users/${selectedChild.id}/award-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: pointsToAward,
          reason: 'Manually awarded by parent',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to award points');
      }

      const data = await res.json();

      notifications.show({
        title: 'Points Awarded!',
        message: `Awarded ${pointsToAward} family bucks to ${selectedChild.name || selectedChild.email}`,
        color: 'green',
      });

      // Update the displayed balance
      setChildSettings({
        ...childSettings,
        familyBucks: data.familyBucks,
        totalPointsEarned: data.totalPointsEarned,
      });

      setPointsToAward(0);
      fetchFamily(); // Refresh to get updated data
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to award points',
        color: 'red',
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/users/delete-account', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete account');
      }

      notifications.show({
        title: 'Account Deleted',
        message: 'Your account has been successfully deleted',
        color: 'green',
      });

      // Redirect to landing page after a short delay
      setTimeout(() => {
        window.location.href = '/landing';
      }, 2000);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete account',
        color: 'red',
      });
    }
  };

  const AVAILABLE_PAGES = [
    { value: 'calendar', label: 'Calendar' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'shopping', label: 'Shopping Lists' },
    { value: 'family', label: 'Family Profile' },
    { value: 'settings', label: 'Settings' },
    { value: 'community', label: 'Community Recipes' },
    { value: 'budget', label: 'Budget Tracker' },
  ];

  return (
    <AppLayout>
      <PageAccessGuard pageName="settings">
        <Stack gap="lg">
        <Title order={1}>Settings</Title>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Account Information</Title>
            <Group>
              <Text fw={500}>Email:</Text>
              <Text>{user?.email}</Text>
            </Group>
            <Group>
              <Text fw={500}>Role:</Text>
              <Text style={{ textTransform: 'capitalize' }}>{user?.role || 'Parent'}</Text>
            </Group>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Family Information</Title>
            {family ? (
              <>
                <Group>
                  <Text fw={500}>Family Name:</Text>
                  <Text>{family.name}</Text>
                </Group>

                <div>
                  <Text fw={500} mb="xs">
                    Invite Code
                  </Text>
                  <Group>
                    <TextInput
                      value={family.inviteCode || 'Not available'}
                      readOnly
                      style={{ flex: 1 }}
                    />
                    <CopyButton value={family.inviteCode || ''} timeout={2000}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
                          <ActionIcon
                            color={copied ? 'teal' : 'gray'}
                            variant="subtle"
                            onClick={copy}
                            disabled={!family.inviteCode}
                          >
                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                  <Text size="sm" c="dimmed" mt="xs">
                    Share this code with family members to invite them
                  </Text>
                </div>

                <div>
                  <Text fw={500} mb="xs">
                    Family Members ({family.users?.filter((u: any) => u.email !== user?.email).length || 0})
                  </Text>
                  <Stack gap="xs">
                    {family.users
                      ?.filter((familyUser: any) => familyUser.email !== user?.email)
                      .map((familyUser: any) => {
                        let displayName = familyUser.name || familyUser.email.split('@')[0];
                        if (familyUser.relationship) {
                          displayName = `${displayName} (${familyUser.relationship})`;
                        }
                        return (
                          <Card key={familyUser.id} padding="sm" withBorder>
                            <Group justify="space-between">
                              <div>
                                <Text>{displayName}</Text>
                                <Text size="xs" c="dimmed">
                                  {familyUser.email}
                                </Text>
                              </div>
                              <Group gap="xs">
                                {user?.role === 'parent' ? (
                                  <>
                                    <Select
                                      value={familyUser.role}
                                      onChange={(value) => handleRoleChange(familyUser.id, value!)}
                                      data={[
                                        { value: 'parent', label: 'Parent' },
                                        { value: 'child', label: 'Child' },
                                      ]}
                                      style={{ width: 120 }}
                                      size="sm"
                                    />
                                    {familyUser.role === 'child' && (
                                      <Button
                                        size="xs"
                                        variant="light"
                                        leftSection={<IconSettings size={14} />}
                                        onClick={() => handleOpenChildSettings(familyUser)}
                                      >
                                        Configure
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Badge color={familyUser.role === 'parent' ? 'blue' : 'gray'}>
                                    {familyUser.role}
                                  </Badge>
                                )}
                              </Group>
                            </Group>
                          </Card>
                        );
                      })}
                  </Stack>
                </div>

                <Divider />

                <div>
                  <Text fw={500} mb="xs">
                    Join Another Family
                  </Text>
                  <Text size="sm" c="dimmed" mb="md">
                    You can be a member of multiple families. Enter an invite code to join another family.
                  </Text>
                  <Group align="flex-end">
                    <TextInput
                      placeholder="Enter invite code"
                      value={joinFamilyCode}
                      onChange={(e) => setJoinFamilyCode(e.target.value)}
                      style={{ flex: 1 }}
                      label="Family Invite Code"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isJoiningFamily) {
                          handleJoinFamily();
                        }
                      }}
                    />
                    <Button
                      onClick={handleJoinFamily}
                      loading={isJoiningFamily}
                      disabled={!joinFamilyCode.trim()}
                    >
                      Join Family
                    </Button>
                  </Group>
                </div>
              </>
            ) : (
              <Text c="dimmed">No family found</Text>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group>
              <IconCalendarEvent size={24} />
              <Title order={3}>Subscribe to Calendar</Title>
            </Group>

            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                Subscribe to your family calendar in any calendar app (Google Calendar, Apple Calendar, Outlook, etc.)
              </Text>
            </Alert>

            {user?.familyId ? (
              <>
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Calendar Subscription URL
                  </Text>
                  <Group gap="xs" align="flex-start">
                    <Code style={{ flex: 1, wordBreak: 'break-all', padding: '8px', fontSize: '11px' }}>
                      {getCalendarFeedUrl()}
                    </Code>
                    <CopyButton value={getCalendarFeedUrl()} timeout={2000}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied!' : 'Copy URL'} withArrow position="right">
                          <ActionIcon
                            color={copied ? 'teal' : 'blue'}
                            variant="light"
                            onClick={copy}
                          >
                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </div>

                <Divider />

                <div>
                  <Text size="sm" fw={500} mb="xs">
                    How to Subscribe:
                  </Text>
                  <Stack gap="xs">
                    <Text size="xs">
                      <strong>• Google Calendar:</strong> Settings → "Add calendar" → "From URL" → Paste the URL
                    </Text>
                    <Text size="xs">
                      <strong>• Apple Calendar:</strong> File → "New Calendar Subscription" → Paste the URL
                    </Text>
                    <Text size="xs">
                      <strong>• Outlook:</strong> Add calendar → "Subscribe from web" → Paste the URL
                    </Text>
                  </Stack>
                </div>
              </>
            ) : (
              <Text size="sm" c="dimmed">
                Join a family to get your calendar subscription URL
              </Text>
            )}
          </Stack>
        </Card>

        {/* Child User - Page Access Display */}
        {user?.role === 'child' && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <IconLockOpen size={24} />
                <Title order={3}>Your Page Access</Title>
              </Group>

              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="sm">
                  {user.allowedPages && user.allowedPages.length > 0
                    ? "You have access to the following pages in the app:"
                    : "You have full access to all pages in the app!"}
                </Text>
              </Alert>

              <div>
                <Text size="sm" fw={500} mb="sm">
                  Accessible Pages:
                </Text>
                <Stack gap="xs">
                  {getAccessiblePages(user.role, user.allowedPages).map((pageName) => (
                    <Group key={pageName} gap="xs">
                      <Badge color="green" variant="light" size="lg">
                        {PAGE_LABELS[pageName]}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {PAGE_ROUTES[pageName]}
                      </Text>
                    </Group>
                  ))}
                </Stack>

                {user.allowedPages && user.allowedPages.length > 0 && (
                  <Alert icon={<IconLock size={16} />} color="gray" variant="light" mt="md">
                    <Text size="xs">
                      If you need access to additional pages, please ask a parent or guardian to update your permissions.
                    </Text>
                  </Alert>
                )}
              </div>
            </Stack>
          </Card>
        )}

        {user?.role === 'parent' && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <IconSparkles size={24} />
                <Title order={3}>AI Shopping Assistant</Title>
              </Group>

              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="sm">
                  Enable AI-powered shopping features to get price estimates, store recommendations, and recipe
                  suggestions for your shopping lists.
                </Text>
              </Alert>

              <Switch
                label="Enable AI Shopping Assistant"
                description="Turn on AI features for your family's shopping lists"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.currentTarget.checked)}
                size="md"
              />

              {aiEnabled && (
                <>
                  <Select
                    label="AI Provider"
                    description="Choose which AI service to use for shopping analysis"
                    value={aiProvider}
                    onChange={(value) => setAiProvider(value as 'gemini' | 'openai')}
                    data={[
                      { value: 'gemini', label: 'Google Gemini (Free - 1,500 requests/day)' },
                      { value: 'openai', label: 'OpenAI (ChatGPT) (Paid - Pay per use)' },
                    ]}
                  />

                  <div>
                    <PasswordInput
                      label={aiProvider === 'openai' ? 'OpenAI API Key' : 'Google Gemini API Key'}
                      placeholder={family?.hasApiKey ? 'API key is set (enter new key to update)' : `Enter your ${aiProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key`}
                      description={
                        aiProvider === 'openai' ? (
                          <>
                            Get your API key at{' '}
                            <Anchor href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" size="xs">
                              OpenAI Platform
                            </Anchor>
                            {' '}(requires paid account)
                          </>
                        ) : (
                          <>
                            Get your free API key at{' '}
                            <Anchor href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" size="xs">
                              Google AI Studio
                            </Anchor>
                          </>
                        )
                      }
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      rightSection={
                        family?.hasApiKey && !aiApiKey ? (
                          <Badge color="green" size="xs">
                            Set
                          </Badge>
                        ) : null
                      }
                    />
                    {family?.hasApiKey && (
                      <Text size="xs" c="dimmed" mt="xs">
                        Your API key is encrypted and stored securely. Leave blank to keep existing key.
                      </Text>
                    )}
                  </div>

                  <TextInput
                    label="Location / City"
                    placeholder="e.g., Orlando, FL"
                    description="Your location helps provide more accurate price estimates"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />

                  <MultiSelect
                    label="Preferred Stores"
                    placeholder="Select your family's preferred stores"
                    description="AI will recommend which of these stores to buy items from"
                    data={COMMON_STORES}
                    value={preferredStores}
                    onChange={setPreferredStores}
                    searchable
                    clearable
                  />

                  <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>
                        How it works:
                      </Text>
                      <Text size="xs">
                        • When you add items to a shopping list, AI automatically analyzes them
                      </Text>
                      <Text size="xs">
                        • Get estimated prices, price ranges, and best store recommendations
                      </Text>
                      <Text size="xs">
                        • Items are automatically categorized by department for efficient shopping
                      </Text>
                      <Text size="xs">
                        • Generate recipe suggestions based on your shopping list items
                      </Text>
                      <Text size="xs" mt="xs">
                        <strong>Privacy:</strong> Your API key is encrypted and only used for your family's AI features.
                      </Text>
                      <Text size="xs">
                        <strong>Cost:</strong> {aiProvider === 'openai'
                          ? 'OpenAI charges per request (typically $0.001-$0.002 per analysis using gpt-4o-mini).'
                          : 'Google Gemini offers a generous free tier (1,500 requests/day).'
                        }
                      </Text>
                    </Stack>
                  </Alert>
                </>
              )}

              <Group justify="flex-end">
                <Button
                  onClick={handleSaveAiSettings}
                  loading={isSavingAi}
                  disabled={!user || user.role !== 'parent'}
                  leftSection={<IconSparkles size={16} />}
                >
                  Save AI Settings
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* AI Usage Statistics */}
        {user?.role === 'parent' && aiEnabled && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Group>
                  <IconChartBar size={24} />
                  <Title order={3}>AI Usage Statistics</Title>
                </Group>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={fetchAiUsageStats}
                  loading={loadingAiStats}
                >
                  Refresh
                </Button>
              </Group>

              {loadingAiStats ? (
                <Group justify="center" py="xl">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Loading usage data...</Text>
                </Group>
              ) : aiUsageStats ? (
                <>
                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                    <Text size="sm">
                      Track your family's AI API usage to monitor costs and optimize your usage.
                    </Text>
                  </Alert>

                  {/* Overall Stats */}
                  <div>
                    <Text size="sm" fw={500} mb="xs">All-Time Stats</Text>
                    <Group gap="lg">
                      <div>
                        <Text size="xs" c="dimmed">Total API Calls</Text>
                        <Text size="xl" fw={700}>{aiUsageStats.overall.totalCalls}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Total Cost</Text>
                        <Text size="xl" fw={700} c="blue">${aiUsageStats.overall.totalCost.toFixed(4)}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Success Rate</Text>
                        <Text size="xl" fw={700} c="green">{aiUsageStats.overall.successRate}%</Text>
                      </div>
                    </Group>
                  </div>

                  <Divider />

                  {/* Current Month Stats */}
                  <div>
                    <Text size="sm" fw={500} mb="xs">This Month</Text>
                    <Group gap="lg">
                      <div>
                        <Text size="xs" c="dimmed">API Calls</Text>
                        <Text size="lg" fw={600}>{aiUsageStats.currentMonth.totalCalls}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Cost</Text>
                        <Text size="lg" fw={600} c="blue">${aiUsageStats.currentMonth.totalCost.toFixed(4)}</Text>
                      </div>
                      {aiUsageStats.currentMonth.totalTokens > 0 && (
                        <div>
                          <Text size="xs" c="dimmed">Tokens Used</Text>
                          <Text size="lg" fw={600}>{aiUsageStats.currentMonth.totalTokens.toLocaleString()}</Text>
                        </div>
                      )}
                    </Group>
                  </div>

                  {/* Usage by Feature */}
                  {aiUsageStats.byFeature && aiUsageStats.byFeature.length > 0 && (
                    <>
                      <Divider />
                      <div>
                        <Text size="sm" fw={500} mb="xs">Usage by Feature</Text>
                        <Stack gap="xs">
                          {aiUsageStats.byFeature.map((feature: any) => (
                            <Group key={feature.feature} justify="space-between">
                              <Group gap="xs">
                                <IconRobot size={16} />
                                <Text size="sm">{feature.feature.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</Text>
                              </Group>
                              <Group gap="md">
                                <Badge size="sm" variant="light">{feature.count} calls</Badge>
                                {feature.totalCost > 0 && (
                                  <Text size="xs" c="dimmed">${feature.totalCost.toFixed(4)}</Text>
                                )}
                              </Group>
                            </Group>
                          ))}
                        </Stack>
                      </div>
                    </>
                  )}

                  {/* Usage by Provider */}
                  {aiUsageStats.byProvider && aiUsageStats.byProvider.length > 0 && (
                    <>
                      <Divider />
                      <div>
                        <Text size="sm" fw={500} mb="xs">Usage by Provider</Text>
                        <Stack gap="xs">
                          {aiUsageStats.byProvider.map((provider: any) => (
                            <Group key={provider.provider} justify="space-between">
                              <Group gap="xs">
                                <Badge color={provider.provider === 'openai' ? 'green' : 'blue'}>
                                  {provider.provider === 'openai' ? 'OpenAI' : 'Google Gemini'}
                                </Badge>
                              </Group>
                              <Group gap="md">
                                <Text size="sm">{provider.count} calls</Text>
                                {provider.totalCost > 0 && (
                                  <Text size="sm" fw={600}>${provider.totalCost.toFixed(4)}</Text>
                                )}
                              </Group>
                            </Group>
                          ))}
                        </Stack>
                      </div>
                    </>
                  )}

                  {/* Monthly History */}
                  {aiUsageStats.monthlyHistory && aiUsageStats.monthlyHistory.length > 0 && (
                    <>
                      <Divider />
                      <div>
                        <Text size="sm" fw={500} mb="xs">Usage History (Last 6 Months)</Text>
                        <Stack gap="xs">
                          {aiUsageStats.monthlyHistory.map((month: any) => {
                            const monthDate = new Date(month.month + '-01');
                            const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            return (
                              <Group key={month.month} justify="space-between" p="xs" style={{ borderRadius: '4px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                <Text size="sm" fw={500}>{monthName}</Text>
                                <Group gap="md">
                                  <Text size="xs" c="dimmed">{month.totalCalls} calls</Text>
                                  <Text size="xs" c="dimmed">{month.totalTokens.toLocaleString()} tokens</Text>
                                  <Text size="sm" fw={600} c="blue">${month.totalCost.toFixed(4)}</Text>
                                </Group>
                              </Group>
                            );
                          })}
                        </Stack>
                        {aiUsageStats.monthlyHistory.length > 0 && (
                          <Text size="xs" c="dimmed" mt="xs">
                            Total tracked: {aiUsageStats.monthlyHistory.reduce((sum: number, m: any) => sum + m.totalCalls, 0)} API calls,
                            ${aiUsageStats.monthlyHistory.reduce((sum: number, m: any) => sum + m.totalCost, 0).toFixed(4)} spent
                          </Text>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No usage data available yet. Start using AI features to see your usage statistics here.
                </Text>
              )}
            </Stack>
          </Card>
        )}

        {/* Notification Preferences */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group>
              <IconBell size={24} />
              <Title order={3}>Notification Preferences</Title>
            </Group>

            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                Customize which notifications you receive and how you're notified.
              </Text>
            </Alert>

            {loadingPreferences ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            ) : (
              <>
                {/* General Settings */}
                <div>
                  <Text fw={500} size="sm" mb="xs">General Settings</Text>
                  <Stack gap="sm">
                    <Switch
                      label="Email Notifications"
                      description="Receive notification emails for important updates"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.currentTarget.checked)}
                    />
                  </Stack>
                </div>

                <Divider />

                {/* Notification Types */}
                <div>
                  <Text fw={500} size="sm" mb="xs">Notification Types</Text>
                  <Text size="xs" c="dimmed" mb="md">
                    Choose which types of notifications you want to receive
                  </Text>
                  <Stack gap="sm">
                    <Checkbox
                      label="Task Assignments"
                      description="When you're assigned to a task"
                      checked={notificationPreferences.task_assigned !== false}
                      onChange={(e) => setNotificationPreferences({
                        ...notificationPreferences,
                        task_assigned: e.currentTarget.checked
                      })}
                    />
                    <Checkbox
                      label="Task Completions"
                      description="When a family member completes a task"
                      checked={notificationPreferences.task_completed !== false}
                      onChange={(e) => setNotificationPreferences({
                        ...notificationPreferences,
                        task_completed: e.currentTarget.checked
                      })}
                    />
                    <Checkbox
                      label="All Tasks Complete"
                      description="When someone completes all their tasks"
                      checked={notificationPreferences.all_tasks_complete !== false}
                      onChange={(e) => setNotificationPreferences({
                        ...notificationPreferences,
                        all_tasks_complete: e.currentTarget.checked
                      })}
                    />
                    <Checkbox
                      label="Event Updates"
                      description="When events are created or updated"
                      checked={notificationPreferences.event_created !== false}
                      onChange={(e) => setNotificationPreferences({
                        ...notificationPreferences,
                        event_created: e.currentTarget.checked,
                        event_reminder: e.currentTarget.checked
                      })}
                    />
                    <Checkbox
                      label="Shopping Lists"
                      description="When shopping lists are created or updated"
                      checked={notificationPreferences.shopping_list_created !== false}
                      onChange={(e) => setNotificationPreferences({
                        ...notificationPreferences,
                        shopping_list_created: e.currentTarget.checked,
                        shopping_list_updated: e.currentTarget.checked
                      })}
                    />
                    <Checkbox
                      label="Budget Alerts"
                      description="When budget limits are approaching or reached"
                      checked={notificationPreferences.budget_alert !== false}
                      onChange={(e) => setNotificationPreferences({
                        ...notificationPreferences,
                        budget_alert: e.currentTarget.checked,
                        budget_limit_reached: e.currentTarget.checked
                      })}
                    />
                    <Checkbox
                      label="Family Updates"
                      description="When new members join or recipes are shared"
                      checked={notificationPreferences.family_member_joined !== false}
                      onChange={(e) => setNotificationPreferences({
                        ...notificationPreferences,
                        family_member_joined: e.currentTarget.checked,
                        recipe_shared: e.currentTarget.checked
                      })}
                    />
                  </Stack>
                </div>

                <Group justify="flex-end">
                  <Button
                    onClick={handleSaveNotificationPreferences}
                    loading={savingPreferences}
                    leftSection={<IconCheck size={16} />}
                  >
                    Save Preferences
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-6)' }}>
          <Stack gap="md">
            <Title order={3} c="red">Danger Zone</Title>
            <Alert color="red" icon={<IconInfoCircle size={16} />}>
              <Text size="sm">
                Deleting your account is permanent and cannot be undone. All your data will be removed.
              </Text>
            </Alert>
            <Button
              color="red"
              variant="outline"
              onClick={() => {
                if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                  handleDeleteAccount();
                }
              }}
            >
              Delete My Account
            </Button>
          </Stack>
        </Card>
      </Stack>

      {/* Child Settings Modal */}
      <Modal
        opened={childSettingsModalOpened}
        onClose={() => setChildSettingsModalOpened(false)}
        title={
          <Group gap="xs">
            <IconSettings size={20} />
            <Text fw={600}>
              Child Settings: {selectedChild?.name || selectedChild?.email}
            </Text>
          </Group>
        }
        size="lg"
      >
        <Stack gap="md">
          {/* Gamification Toggle */}
          <Switch
            label="Enable Gamification Mode"
            description="Turn on game mode with points and rewards for this child"
            checked={childSettings.gamificationEnabled}
            onChange={(e) =>
              setChildSettings({
                ...childSettings,
                gamificationEnabled: e.currentTarget.checked,
              })
            }
            size="md"
          />

          {childSettings.gamificationEnabled && (
            <>
              <Divider />

              {/* Points Display */}
              <Group grow>
                <Card padding="md" withBorder>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <IconCoins size={20} color="orange" />
                      <Text size="sm" fw={500}>
                        Family Bucks
                      </Text>
                    </Group>
                    <Text size="xl" fw={700} c="orange">
                      {childSettings.familyBucks}
                    </Text>
                  </Stack>
                </Card>

                <Card padding="md" withBorder>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <IconTrophy size={20} color="gold" />
                      <Text size="sm" fw={500}>
                        Total Earned
                      </Text>
                    </Group>
                    <Text size="xl" fw={700} c="gold">
                      {childSettings.totalPointsEarned}
                    </Text>
                  </Stack>
                </Card>
              </Group>

              {/* Award Points */}
              <Card padding="md" withBorder>
                <Stack gap="sm">
                  <Text size="sm" fw={500}>
                    Award Family Bucks
                  </Text>
                  <Group>
                    <NumberInput
                      placeholder="Points to award"
                      value={pointsToAward}
                      onChange={(val) => setPointsToAward(Number(val) || 0)}
                      min={0}
                      style={{ flex: 1 }}
                    />
                    <Button
                      leftSection={<IconCoins size={16} />}
                      onClick={handleAwardPoints}
                      disabled={pointsToAward === 0 || !childSettings.gamificationEnabled}
                    >
                      Award
                    </Button>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Manually award points to your child for good behavior or accomplishments
                  </Text>
                </Stack>
              </Card>

              {/* Points Per Task */}
              <NumberInput
                label="Points Per Task Completion"
                description="How many family bucks earned for each completed task"
                value={childSettings.pointsPerTask}
                onChange={(val) =>
                  setChildSettings({
                    ...childSettings,
                    pointsPerTask: Number(val) || 10,
                  })
                }
                min={1}
                max={100}
              />

              <Divider />
            </>
          )}

          {/* Page Access Controls */}
          <div>
            <Text size="sm" fw={500} mb="xs">
              Allowed Pages
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Select which pages this child can access in the app
            </Text>
            <Stack gap="xs">
              {AVAILABLE_PAGES.map((page) => (
                <Checkbox
                  key={page.value}
                  label={page.label}
                  checked={childSettings.allowedPages?.includes(page.value)}
                  onChange={(e) => {
                    const newAllowedPages = e.currentTarget.checked
                      ? [...(childSettings.allowedPages || []), page.value]
                      : (childSettings.allowedPages || []).filter(
                          (p: string) => p !== page.value
                        );
                    setChildSettings({
                      ...childSettings,
                      allowedPages: newAllowedPages,
                    });
                  }}
                />
              ))}
            </Stack>
            <Text size="xs" c="dimmed" mt="sm">
              Note: If no pages are selected, the child will have access to all pages
            </Text>
          </div>

          {/* Save Button */}
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setChildSettingsModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveChildSettings}
              loading={isSavingChildSettings}
              leftSection={<IconCheck size={16} />}
            >
              Save Settings
            </Button>
          </Group>
        </Stack>
      </Modal>
      </PageAccessGuard>
    </AppLayout>
  );
}
