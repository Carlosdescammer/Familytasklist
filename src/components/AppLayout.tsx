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
} from '@tabler/icons-react';
import { useClerk } from '@clerk/nextjs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { canAccessPage, type PageName } from '@/lib/page-access';
import { FamilySwitcher } from '@/components/FamilySwitcher';

const navItems = [
  { href: '/', label: 'Dashboard', icon: IconHome, pageName: null }, // Dashboard has no restrictions
  { href: '/calendar', label: 'Calendar', icon: IconCalendar, pageName: 'calendar' as PageName },
  { href: '/shopping', label: 'Shopping', icon: IconShoppingCart, pageName: 'shopping' as PageName },
  { href: '/recipes', label: 'Recipes', icon: IconChefHat, pageName: null }, // Recipes has no restrictions
  { href: '/photos', label: 'Photos', icon: IconPhoto, pageName: null }, // Photos has no restrictions
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
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<string>('all');
  const [notificationReadFilter, setNotificationReadFilter] = useState<string>('all');

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

  const unreadCount = notifications.filter(n => !n.read).length;

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

      if (typeCategory === 'tasks' && !taskTypes.includes(notification.type)) return false;
      if (typeCategory === 'events' && !eventTypes.includes(notification.type)) return false;
      if (typeCategory === 'shopping' && !shoppingTypes.includes(notification.type)) return false;
      if (typeCategory === 'budget' && !budgetTypes.includes(notification.type)) return false;
      if (typeCategory === 'family' && !familyTypes.includes(notification.type)) return false;
    }

    // Filter by read status
    if (notificationReadFilter === 'unread' && notification.read) return false;
    if (notificationReadFilter === 'read' && !notification.read) return false;

    return true;
  });

  return (
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
                          <div
                            key={notification.id}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              backgroundColor: notification.read
                                ? 'transparent'
                                : 'var(--mantine-color-blue-0)',
                              border: '1px solid var(--mantine-color-gray-3)',
                            }}
                          >
                            <Group justify="space-between" align="flex-start" mb="xs">
                              <Text fw={500} size="sm">
                                {notification.title}
                              </Text>
                              {!notification.read && (
                                <Badge size="xs" color="blue">
                                  New
                                </Badge>
                              )}
                            </Group>
                            <Text size="xs" c="dimmed">
                              {notification.message}
                            </Text>
                            <Text size="xs" c="dimmed" mt="xs">
                              {new Date(notification.createdAt).toLocaleString()}
                            </Text>
                          </div>
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
        {navItems
          .filter((item) => {
            // Dashboard is always accessible
            if (item.pageName === null) return true;

            // Check if user has access to this page
            return canAccessPage(
              user?.role,
              user?.allowedPages,
              item.pageName
            );
          })
          .map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={pathname === item.href}
              onClick={() => opened && toggle()}
            />
          ))}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
