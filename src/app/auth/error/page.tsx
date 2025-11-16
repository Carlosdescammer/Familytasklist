'use client';

import { Container, Paper, Title, Text, Button, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      default:
        return 'An error occurred during authentication.';
    }
  };

  return (
    <Container size="xs" style={{ paddingTop: '5rem' }}>
      <Paper shadow="md" p="xl" radius="md">
        <Stack gap="lg">
          <div style={{ textAlign: 'center' }}>
            <IconAlertCircle size={48} color="red" style={{ margin: '0 auto' }} />
            <Title order={2} mt="md">
              Authentication Error
            </Title>
            <Text c="dimmed" mt="sm">
              {getErrorMessage(error)}
            </Text>
          </div>

          <Button component={Link} href="/auth/signin" size="lg">
            Try Again
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
