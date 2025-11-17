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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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
} from '@tabler/icons-react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { canAccessPage, type PageName } from '@/lib/page-access';
import { FamilySwitcher } from '@/components/FamilySwitcher';

const navItems = [
  { href: '/', label: 'Dashboard', icon: IconHome, pageName: null }, // Dashboard has no restrictions
  { href: '/calendar', label: 'Calendar', icon: IconCalendar, pageName: 'calendar' as PageName },
  { href: '/shopping', label: 'Shopping', icon: IconShoppingCart, pageName: 'shopping' as PageName },
  { href: '/recipes', label: 'Recipes', icon: IconChefHat, pageName: null }, // Recipes has no restrictions
  { href: '/tasks', label: 'Tasks', icon: IconCheckbox, pageName: 'tasks' as PageName },
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
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id, fetchNotifications]);

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

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
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
              width={400}
              position="bottom-end"
              shadow="md"
              opened={notifOpened}
              onChange={toggleNotif}
            >
              <Popover.Target>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Notifications"
                  onClick={toggleNotif}
                >
                  <Indicator
                    disabled={unreadCount === 0}
                    label={unreadCount}
                    size={16}
                    color="red"
                  >
                    <IconBell style={{ width: rem(20) }} />
                  </Indicator>
                </ActionIcon>
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

                  <Divider />

                  {notifications.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No notifications yet
                    </Text>
                  ) : (
                    <ScrollArea h={400}>
                      <Stack gap="xs">
                        {notifications.map((notification) => (
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
                    <Text size="sm">{session?.user?.email?.split('@')[0]}</Text>
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
                  onClick={() => signOut()}
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
              session?.user?.role,
              session?.user?.allowedPages,
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
