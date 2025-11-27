'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  UnstyledButton,
  Text,
  Menu,
  ActionIcon,
  useMantineColorScheme,
  rem,
  Indicator,
  Popover,
  Stack,
  ScrollArea,
  Badge,
  Divider,
  Button,
  Select,
  SegmentedControl,
  Card,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconHome,
  IconCalendar,
  IconShoppingCart,
  IconCheckbox,
  IconSettings,
  IconSun,
  IconMoon,
  IconLogout,
  IconUser,
  IconUsers,
  IconBell,
  IconChefHat,
  IconWorld,
  IconPigMoney,
  IconPhoto,
  IconLock,
  IconSparkles,
  IconGift,
} from '@tabler/icons-react';
import { useClerk } from '@clerk/nextjs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { canAccessPage, type PageName } from '@/lib/page-access';
import { FamilySwitcher } from '@/components/FamilySwitcher';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { RealtimeProvider } from '@/components/RealtimeProvider';
import { useAutoE2EE } from '@/hooks/useAutoE2EE';
import { setBadgeForNotifications } from '@/lib/badging';

const navItems = [
  { href: '/', label: 'Dashboard', icon: IconHome, pageName: null }, // Dashboard has no restrictions
  { href: '/calendar', label: 'Calendar', icon: IconCalendar, pageName: 'calendar' as PageName },
  { href: '/shopping', label: 'Shopping', icon: IconShoppingCart, pageName: 'shopping' as PageName },
  { href: '/chores', label: 'Chores', icon: IconSparkles, pageName: null }, // Chores available to all
  { href: '/rewards', label: 'Rewards', icon: IconGift, pageName: null }, // Rewards available to all
  { href: '/recipes', label: 'Recipes', icon: IconChefHat, pageName: null }, // Recipes has no restrictions
  { href: '/photos', label: 'Photos', icon: IconPhoto, pageName: null }, // Photos has no restrictions
  { href: '/notes', label: 'My Notes', icon: IconLock, pageName: null }, // Private encrypted notes
  { href: '/community', label: 'Community', icon: IconWorld, pageName: 'community' as PageName },
  { href: '/tasks', label: 'Tasks', icon: IconCheckbox, pageName: 'tasks' as PageName },
  { href: '/budget', label: 'Budget', icon: IconPigMoney, pageName: 'budget' as PageName },
  { href: '/family', label: 'Family', icon: IconUsers, pageName: 'family' as PageName },
  { href: '/settings', label: 'Settings', icon: IconSettings, pageName: 'settings' as PageName },
];

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedTaskId?: string;
  relatedUserId?: string;
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const [notifOpened, { toggle: toggleNotif, close: closeNotif }] = useDisclosure();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { user, loading } = useCurrentUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<string>('all');
  const [notificationReadFilter, setNotificationReadFilter] = useState<string>('all');

  // Auto-setup E2EE for all users (silent, no user interaction needed)
  useAutoE2EE(user?.id || null);

  // Mobile detection
  const isMobile = useMediaQuery('(max-width: 48em)'); // sm breakpoint

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      // Poll for new notifications every 60 seconds
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: notifications.map(n => n.id) }),
      });

      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark notification as read
    if (!notification.read) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [notification.id] }),
        });

        // Update local state
        setNotifications(notifications.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        ));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Close the popover
    closeNotif();

    // Navigate based on notification type
    switch (notification.type) {
      case 'task_assigned':
      case 'task_completed':
      case 'all_tasks_complete':
        router.push('/tasks');
        break;
      case 'event_created':
      case 'event_reminder':
        router.push('/calendar');
        break;
      case 'shopping_list_created':
      case 'shopping_list_updated':
        router.push('/shopping');
        break;
      case 'budget_alert':
      case 'budget_limit_reached':
        router.push('/budget');
        break;
      case 'family_member_joined':
        router.push('/family');
        break;
      case 'recipe_shared':
        router.push('/recipes');
        break;
      case 'chore_assigned':
      case 'chore_completed':
      case 'chore_verified':
      case 'chore_rejected':
        router.push('/chores');
        break;
      case 'reward_redeemed':
      case 'reward_fulfilled':
      case 'reward_cancelled':
      case 'achievement_unlocked':
        router.push('/rewards');
        break;
      default:
        // For unknown types, go to dashboard
        router.push('/');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Update app badge when unread count changes
  useEffect(() => {
    setBadgeForNotifications(unreadCount);
  }, [unreadCount]);

  // Filter notifications based on selected filters
  const filteredNotifications = notifications.filter(notification => {
    // Filter by type
    if (notificationFilter !== 'all') {
      const typeCategory = notificationFilter;
      const taskTypes = ['task_assigned', 'task_completed', 'all_tasks_complete'];
      const eventTypes = ['event_created', 'event_reminder'];
      const shoppingTypes = ['shopping_list_created', 'shopping_list_updated'];
      const budgetTypes = ['budget_alert', 'budget_limit_reached'];
      const familyTypes = ['family_member_joined', 'recipe_shared'];
      const choreTypes = ['chore_assigned', 'chore_completed', 'chore_verified', 'chore_rejected'];
      const rewardTypes = ['reward_redeemed', 'reward_fulfilled', 'reward_cancelled', 'achievement_unlocked'];

      if (typeCategory === 'tasks' && !taskTypes.includes(notification.type)) return false;
      if (typeCategory === 'events' && !eventTypes.includes(notification.type)) return false;
      if (typeCategory === 'shopping' && !shoppingTypes.includes(notification.type)) return false;
      if (typeCategory === 'budget' && !budgetTypes.includes(notification.type)) return false;
      if (typeCategory === 'family' && !familyTypes.includes(notification.type)) return false;
      if (typeCategory === 'chores' && !choreTypes.includes(notification.type)) return false;
      if (typeCategory === 'rewards' && !rewardTypes.includes(notification.type)) return false;
    }

    // Filter by read status
    if (notificationReadFilter === 'unread' && notification.read) return false;
    if (notificationReadFilter === 'read' && !notification.read) return false;

    return true;
  });

  // Prepare realtime config
  const realtimeConfig = user?.familyId && user?.id
    ? {
        familyId: user.familyId,
        userId: user.id,
        userName: user.name || user.email,
        autoConnect: true,
      }
    : null;

  return (
    <RealtimeProvider config={realtimeConfig}>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 250,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding={{ base: 'xs', sm: 'md' }}
      >
      <AppShell.Header>
        <Group h="100%" px={{ base: 'xs', sm: 'md' }} justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="xl" fw={700}>
              FamilyList
            </Text>
          </Group>

          <Group>
            {/* Family Switcher */}
            <FamilySwitcher />

            {mounted && (
              <ActionIcon
                onClick={() => toggleColorScheme()}
                variant="default"
                size="lg"
                aria-label="Toggle color scheme"
              >
                {colorScheme === 'dark' ? (
                  <IconSun style={{ width: rem(20) }} />
                ) : (
                  <IconMoon style={{ width: rem(20) }} />
                )}
              </ActionIcon>
            )}

            {/* Notification Bell */}
            <Popover
              width={isMobile ? '90vw' : 400}
              position="bottom-end"
              shadow="md"
              opened={notifOpened}
              onChange={toggleNotif}
            >
              <Popover.Target>
                <Indicator
                  disabled={unreadCount === 0}
                  label={unreadCount}
                  size={16}
                  color="red"
                  inline
                >
                  <ActionIcon
                    variant="default"
                    size="lg"
                    aria-label="Notifications"
                    onClick={toggleNotif}
                  >
                    <IconBell style={{ width: rem(20) }} />
                  </ActionIcon>
                </Indicator>
              </Popover.Target>

              <Popover.Dropdown>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={600} size="lg">Notifications</Text>
                    {unreadCount > 0 && (
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={markAllAsRead}
                        loading={loadingNotifications}
                      >
                        Mark all as read
                      </Button>
                    )}
                  </Group>

                  {/* Filters */}
                  <Group gap="xs">
                    <Select
                      placeholder="Filter by type"
                      size="xs"
                      value={notificationFilter}
                      onChange={(value) => setNotificationFilter(value || 'all')}
                      data={[
                        { value: 'all', label: 'All Types' },
                        { value: 'tasks', label: 'Tasks' },
                        { value: 'chores', label: 'Chores' },
                        { value: 'rewards', label: 'Rewards' },
                        { value: 'events', label: 'Events' },
                        { value: 'shopping', label: 'Shopping' },
                        { value: 'budget', label: 'Budget' },
                        { value: 'family', label: 'Family' },
                      ]}
                      style={{ flex: 1 }}
                      clearable
                    />
                    <SegmentedControl
                      size="xs"
                      value={notificationReadFilter}
                      onChange={setNotificationReadFilter}
                      data={[
                        { label: 'All', value: 'all' },
                        { label: 'Unread', value: 'unread' },
                        { label: 'Read', value: 'read' },
                      ]}
                    />
                  </Group>

                  <Divider />

                  {filteredNotifications.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      {notifications.length === 0
                        ? 'No notifications yet'
                        : 'No notifications match your filters'}
                    </Text>
                  ) : (
                    <ScrollArea h={isMobile ? 300 : 400}>
                      <Stack gap="xs">
                        {filteredNotifications.map((notification) => (
                          <Card
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            p="md"
                            withBorder
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              borderLeft: !notification.read ? '3px solid var(--mantine-color-blue-6)' : undefined,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <Group justify="space-between" align="flex-start" mb="xs">
                              <Text fw={!notification.read ? 600 : 500} size="sm">
                                {notification.title}
                              </Text>
                              {!notification.read && (
                                <Badge size="xs" color="blue">
                                  New
                                </Badge>
                              )}
                            </Group>
                            <Text size="xs" opacity={0.8}>
                              {notification.message}
                            </Text>
                            <Text size="xs" opacity={0.6} mt="xs">
                              {new Date(notification.createdAt).toLocaleString()}
                            </Text>
                          </Card>
                        ))}
                      </Stack>
                    </ScrollArea>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <IconUser size={24} />
                    <Text size="sm" visibleFrom="sm">{user?.name || user?.email?.split('@')[0] || 'User'}</Text>
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconUser size={16} />} component={Link} href="/settings">
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={() => signOut({ redirectUrl: '/landing' })}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <ScrollArea style={{ height: 'calc(100vh - 80px)' }}>
          <Stack gap={0}>
            {/* Main Section */}
            {navItems
              .filter((item) => {
                if (item.pageName === null) return true;
                return canAccessPage(user?.role, user?.allowedPages, item.pageName);
              })
              .filter((item) => ['/', '/calendar', '/shopping'].includes(item.href))
              .map((item) => (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  leftSection={<item.icon size={18} />}
                  active={pathname === item.href}
                  onClick={() => opened && toggle()}
                  style={{ borderRadius: 8, marginBottom: 2 }}
                />
              ))}

            {/* Tasks & Rewards Section */}
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c="dimmed"
              mt="xl"
              mb="xs"
              px="xs"
              style={{ letterSpacing: '0.5px', opacity: 0.6 }}
            >
              Tasks & Rewards
            </Text>
            {navItems
              .filter((item) => {
                if (item.pageName === null) return true;
                return canAccessPage(user?.role, user?.allowedPages, item.pageName);
              })
              .filter((item) => ['/tasks', '/chores', '/rewards'].includes(item.href))
              .map((item) => (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  leftSection={<item.icon size={18} />}
                  active={pathname === item.href}
                  onClick={() => opened && toggle()}
                  style={{ borderRadius: 8, marginBottom: 2 }}
                />
              ))}

            {/* Family Content Section */}
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c="dimmed"
              mt="xl"
              mb="xs"
              px="xs"
              style={{ letterSpacing: '0.5px', opacity: 0.6 }}
            >
              Family Content
            </Text>
            {navItems
              .filter((item) => {
                if (item.pageName === null) return true;
                return canAccessPage(user?.role, user?.allowedPages, item.pageName);
              })
              .filter((item) => ['/recipes', '/photos', '/notes', '/community'].includes(item.href))
              .map((item) => (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  leftSection={<item.icon size={18} />}
                  active={pathname === item.href}
                  onClick={() => opened && toggle()}
                  style={{ borderRadius: 8, marginBottom: 2 }}
                />
              ))}

            {/* Finance & Settings Section */}
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c="dimmed"
              mt="xl"
              mb="xs"
              px="xs"
              style={{ letterSpacing: '0.5px', opacity: 0.6 }}
            >
              Settings
            </Text>
            {navItems
              .filter((item) => {
                if (item.pageName === null) return true;
                return canAccessPage(user?.role, user?.allowedPages, item.pageName);
              })
              .filter((item) => ['/budget', '/family', '/settings'].includes(item.href))
              .map((item) => (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  leftSection={<item.icon size={18} />}
                  active={pathname === item.href}
                  onClick={() => opened && toggle()}
                  style={{ borderRadius: 8, marginBottom: 2 }}
                />
              ))}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="md">
          <PushNotificationPrompt />
          <OfflineIndicator />
          {children}
        </Stack>
      </AppShell.Main>
    </AppShell>
    </RealtimeProvider>
  );
}
