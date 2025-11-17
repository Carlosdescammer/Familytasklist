'use client';

import { signIn } from 'next-auth/react';
import { Container, Paper, Title, Text, Button, Stack } from '@mantine/core';
import { IconBrandGoogle } from '@tabler/icons-react';

export default function SignInPage() {
  return (
    <Container size="xs" style={{ paddingTop: '5rem' }}>
      <Paper shadow="md" p="xl" radius="md">
        <Stack gap="lg">
          <div style={{ textAlign: 'center' }}>
            <Title order={1}>FamilyList</Title>
            <Text c="dimmed" size="sm" mt="sm">
              Your family's productivity hub
            </Text>
          </div>

          <Button
            leftSection={<IconBrandGoogle size={20} />}
            variant="default"
            size="lg"
            onClick={() => signIn('google', { callbackUrl: '/' })}
          >
            Sign in with Google
          </Button>

          <Text size="xs" c="dimmed" ta="center">
            By signing in, you agree to share your calendar and profile information
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
}
