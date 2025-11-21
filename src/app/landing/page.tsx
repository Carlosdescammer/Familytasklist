'use client';

import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  SimpleGrid,
  ThemeIcon,
  Box,
  Badge,
  Avatar,
  rem,
} from '@mantine/core';
import {
  IconCalendar,
  IconShoppingCart,
  IconCheckbox,
  IconUsers,
  IconChefHat,
  IconSparkles,
  IconArrowRight,
  IconDeviceTv,
  IconStar,
  IconCheck,
  IconShield,
  IconCloud,
} from '@tabler/icons-react';
import Link from 'next/link';

export default function LandingPage() {
  const features = [
    {
      icon: IconCalendar,
      title: 'Shared Calendar',
      description: 'Sync schedules across your entire family. Never miss soccer practice or date night again.',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      icon: IconShoppingCart,
      title: 'Smart Shopping Lists',
      description: 'Smart lists that learn your preferences. Get price estimates and store recommendations.',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      icon: IconCheckbox,
      title: 'Task Management',
      description: 'Assign chores, track progress, and gamify responsibilities with points and rewards.',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      icon: IconChefHat,
      title: 'Recipe Collections',
      description: 'Save family recipes, share with relatives, and auto-generate shopping lists.',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
    {
      icon: IconDeviceTv,
      title: 'Family Board',
      description: 'Beautiful dashboard display for your kitchen tablet or TV. Auto-refreshes in real-time.',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      icon: IconSparkles,
      title: 'Smart Suggestions',
      description: 'Intelligent suggestions for meals, tasks, and budgets based on your family patterns.',
      gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Active Families' },
    { value: '500K+', label: 'Tasks Completed' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9', label: 'App Rating' },
  ];

  const testimonials = [
    {
      name: 'Sarah M.',
      role: 'Mom of 3',
      avatar: 'SM',
      content: 'FamilyList transformed how we manage our household. The kids actually complete their chores now because of the points system!',
    },
    {
      name: 'David K.',
      role: 'Working Dad',
      avatar: 'DK',
      content: 'The shared calendar and shopping lists have saved us hours every week. We finally feel organized as a family.',
    },
    {
      name: 'Jennifer L.',
      role: 'Co-Parenting',
      avatar: 'JL',
      content: 'Multi-family support is a game changer. Coordinating between two households has never been easier.',
    },
  ];

  return (
    <Box style={{ minHeight: '100vh' }}>
      {/* Navigation */}
      <Box
        component="nav"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backdropFilter: 'blur(20px)',
          background: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Container size="xl" py="md">
          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon size={36} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                <IconUsers size={20} />
              </ThemeIcon>
              <Text fw={700} size="xl">FamilyList</Text>
            </Group>
            <Group gap="sm">
              <Button component={Link} href="/sign-in" variant="subtle" color="gray" radius="md">
                Sign In
              </Button>
              <Button
                component={Link}
                href="/sign-up"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                radius="md"
              >
                Get Started
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        style={{
          position: 'relative',
          overflow: 'hidden',
          paddingTop: rem(120),
          paddingBottom: rem(80),
        }}
      >
        <Container size="lg">
          <Stack gap="xl" align="center" style={{ textAlign: 'center' }}>
            <Title
              order={1}
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                maxWidth: rem(900),
              }}
            >
              The operating system for
              <Text
                component="span"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                inherit
              >
                {' '}modern families
              </Text>
            </Title>

            <Text
              size="xl"
              c="dimmed"
              style={{ maxWidth: rem(600), lineHeight: 1.6 }}
            >
              Calendars, shopping lists, tasks, recipes, and budgets - all in one beautiful app.
              Built for families who value their time together.
            </Text>

            <Group gap="md" mt="lg">
              <Button
                component={Link}
                href="/sign-up"
                size="xl"
                radius="xl"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                rightSection={<IconArrowRight size={20} />}
                style={{ paddingLeft: rem(32), paddingRight: rem(32) }}
              >
                Start Free Trial
              </Button>
            </Group>

            <Text size="sm" c="dimmed" mt="sm">
              No credit card required. Free for families with up to 5 members.
            </Text>
          </Stack>
        </Container>

        {/* Floating gradient orbs */}
        <Box
          style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: rem(300),
            height: rem(300),
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <Box
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '5%',
            width: rem(400),
            height: rem(400),
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* Stats Section */}
      <Box py={60} style={{ borderTop: '1px solid var(--mantine-color-default-border)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Container size="lg">
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xl">
            {stats.map((stat) => (
              <Stack key={stat.label} gap={4} align="center">
                <Text
                  size={rem(48)}
                  fw={800}
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                >
                  {stat.value}
                </Text>
                <Text c="dimmed" size="sm">{stat.label}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={100}>
        <Container size="lg">
          <Stack gap={60}>
            <Stack gap="md" align="center" style={{ textAlign: 'center' }}>
              <Badge size="lg" variant="light" color="blue">Features</Badge>
              <Title order={2} size={rem(40)} fw={800}>
                Everything your family needs
              </Title>
              <Text c="dimmed" size="lg" style={{ maxWidth: rem(500) }}>
                Powerful tools designed to bring your family together and simplify daily life.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  padding="xl"
                  radius="lg"
                  withBorder
                  style={{
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <Stack gap="md">
                    <Box
                      style={{
                        width: rem(56),
                        height: rem(56),
                        borderRadius: rem(12),
                        background: feature.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <feature.icon size={28} color="white" />
                    </Box>
                    <div>
                      <Title order={3} size="h4" mb="xs">
                        {feature.title}
                      </Title>
                      <Text c="dimmed" size="sm" lh={1.6}>
                        {feature.description}
                      </Text>
                    </div>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box py={100} bg="var(--mantine-color-gray-light)">
        <Container size="lg">
          <Stack gap={60}>
            <Stack gap="md" align="center" style={{ textAlign: 'center' }}>
              <Badge size="lg" variant="light" color="pink">Testimonials</Badge>
              <Title order={2} size={rem(40)} fw={800}>
                Loved by families everywhere
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
              {testimonials.map((testimonial) => (
                <Card
                  key={testimonial.name}
                  padding="xl"
                  radius="lg"
                  withBorder
                >
                  <Stack gap="lg">
                    <Group gap={4}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <IconStar key={star} size={16} fill="#fbbf24" color="#fbbf24" />
                      ))}
                    </Group>
                    <Text c="dimmed" size="sm" lh={1.7} style={{ fontStyle: 'italic' }}>
                      "{testimonial.content}"
                    </Text>
                    <Group gap="sm">
                      <Avatar color="blue" radius="xl">{testimonial.avatar}</Avatar>
                      <div>
                        <Text fw={600} size="sm">{testimonial.name}</Text>
                        <Text c="dimmed" size="xs">{testimonial.role}</Text>
                      </div>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Trust Section */}
      <Box py={60}>
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
            <Group gap="md" align="flex-start">
              <ThemeIcon size={48} radius="md" variant="light" color="green">
                <IconShield size={24} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Enterprise Security</Text>
                <Text c="dimmed" size="sm">Your data is encrypted and secure. SOC 2 compliant.</Text>
              </div>
            </Group>
            <Group gap="md" align="flex-start">
              <ThemeIcon size={48} radius="md" variant="light" color="blue">
                <IconCloud size={24} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Always Synced</Text>
                <Text c="dimmed" size="sm">Real-time sync across all devices. Works offline too.</Text>
              </div>
            </Group>
            <Group gap="md" align="flex-start">
              <ThemeIcon size={48} radius="md" variant="light" color="grape">
                <IconUsers size={24} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Unlimited Members</Text>
                <Text c="dimmed" size="sm">Add grandparents, babysitters, and extended family.</Text>
              </div>
            </Group>
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={100}>
        <Container size="md">
          <Card
            padding={60}
            radius="xl"
            style={{
              background: 'linear-gradient(135deg, var(--mantine-color-blue-light) 0%, var(--mantine-color-grape-light) 100%)',
              textAlign: 'center',
            }}
          >
            <Stack gap="xl" align="center">
              <Title order={2} size={rem(36)} fw={800}>
                Ready to simplify your family life?
              </Title>
              <Text c="dimmed" size="lg" style={{ maxWidth: rem(400) }}>
                Join thousands of families already using FamilyList. Get started in under 2 minutes.
              </Text>
              <Button
                component={Link}
                href="/sign-up"
                size="xl"
                radius="xl"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                rightSection={<IconArrowRight size={20} />}
              >
                Create Free Account
              </Button>
              <Group gap="xl">
                <Group gap={6}>
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text c="dimmed" size="sm">Free forever plan</Text>
                </Group>
                <Group gap={6}>
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text c="dimmed" size="sm">No credit card</Text>
                </Group>
                <Group gap={6}>
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text c="dimmed" size="sm">Cancel anytime</Text>
                </Group>
              </Group>
            </Stack>
          </Card>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        py={40}
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Container size="lg">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ThemeIcon size={28} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                <IconUsers size={16} />
              </ThemeIcon>
              <Text fw={600}>FamilyList</Text>
            </Group>
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
      </Box>
    </Box>
  );
}
