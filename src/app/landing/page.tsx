import { Container, Title, Text, Button, Group, Stack, Card, SimpleGrid, ThemeIcon } from '@mantine/core';
import { IconCalendar, IconShoppingCart, IconCheckbox, IconUsers, IconChefHat, IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';

export default function LandingPage() {
  const features = [
    {
      icon: IconCalendar,
      title: 'Shared Calendar',
      description: 'Keep everyone on the same page with a family calendar. Schedule events, set reminders, and never miss important dates.',
      color: 'blue',
    },
    {
      icon: IconShoppingCart,
      title: 'Smart Shopping Lists',
      description: 'Create collaborative shopping lists with AI-powered suggestions. Get price estimates and organize by store.',
      color: 'green',
    },
    {
      icon: IconCheckbox,
      title: 'Task Management',
      description: 'Assign tasks to family members, track progress, and reward completion with points. Make chores fun!',
      color: 'grape',
    },
    {
      icon: IconChefHat,
      title: 'Recipe Collections',
      description: 'Save and share family recipes. Generate shopping lists from recipes with one click.',
      color: 'orange',
    },
    {
      icon: IconUsers,
      title: 'Multi-Family Support',
      description: 'Manage multiple households from one account. Perfect for extended families and co-parenting.',
      color: 'cyan',
    },
    {
      icon: IconSparkles,
      title: 'AI-Powered Features',
      description: 'Get smart suggestions for recipes, shopping items, and task assignments based on your family\'s habits.',
      color: 'pink',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <Container size="xl" style={{ flex: 1, paddingTop: '4rem', paddingBottom: '4rem' }}>
        <Stack gap="xl" align="center" style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <Title order={1} size="3.5rem" fw={900} style={{ maxWidth: '800px' }}>
            Organize Your Family Life in One Place
          </Title>
          <Text size="xl" c="dimmed" style={{ maxWidth: '600px' }}>
            FamilyList brings your family together with shared calendars, shopping lists, tasks, and recipes. 
            Stay organized, save time, and focus on what matters most.
          </Text>
          <Group gap="md">
            <Button component={Link} href="/sign-up" size="xl" radius="md">
              Get Started Free
            </Button>
            <Button component={Link} href="/sign-in" size="xl" variant="outline" radius="md">
              Sign In
            </Button>
          </Group>
        </Stack>

        {/* Features Grid */}
        <Stack gap="xl">
          <div style={{ textAlign: 'center' }}>
            <Title order={2} size="2.5rem" mb="md">
              Everything Your Family Needs
            </Title>
            <Text size="lg" c="dimmed">
              Powerful features designed to simplify family coordination
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {features.map((feature) => (
              <Card key={feature.title} shadow="sm" padding="xl" radius="md" withBorder>
                <Stack gap="md">
                  <ThemeIcon size={60} radius="md" variant="light" color={feature.color}>
                    <feature.icon size={32} />
                  </ThemeIcon>
                  <div>
                    <Title order={3} size="h3" mb="xs">
                      {feature.title}
                    </Title>
                    <Text c="dimmed">{feature.description}</Text>
                  </div>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>

        {/* CTA Section */}
        <Stack gap="lg" align="center" style={{ marginTop: '4rem', textAlign: 'center' }}>
          <Title order={2} size="2rem">
            Ready to Get Organized?
          </Title>
          <Text size="lg" c="dimmed" style={{ maxWidth: '600px' }}>
            Join thousands of families who have simplified their lives with FamilyList. 
            Start your free account today—no credit card required.
          </Text>
          <Button component={Link} href="/sign-up" size="xl" radius="md">
            Create Your Free Account
          </Button>
        </Stack>
      </Container>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--mantine-color-gray-3)', padding: '2rem 0' }}>
        <Container size="xl">
          <Group justify="space-between">
            <Text c="dimmed" size="sm">
              © 2025 FamilyList. All rights reserved.
            </Text>
            <Group gap="md">
              <Text component={Link} href="/sign-in" c="dimmed" size="sm" style={{ textDecoration: 'none' }}>
                Sign In
              </Text>
              <Text component={Link} href="/sign-up" c="dimmed" size="sm" style={{ textDecoration: 'none' }}>
                Sign Up
              </Text>
            </Group>
          </Group>
        </Container>
      </div>
    </div>
  );
}
