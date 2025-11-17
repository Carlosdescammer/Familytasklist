'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { canAccessPage, type PageName } from '@/lib/page-access';
import { Container, Text, Center, Stack } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';

interface PageAccessGuardProps {
  children: ReactNode;
  pageName: PageName;
}

export default function PageAccessGuard({
  children,
  pageName,
}: PageAccessGuardProps) {
  const { user, loading, isSignedIn } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    if (user) {
      const hasAccess = canAccessPage(
        user.role,
        user.allowedPages,
        pageName
      );

      if (!hasAccess) {
        // Redirect to dashboard if no access
        router.push('/');
      }
    }
  }, [user, loading, isSignedIn, router, pageName]);

  // Show loading state
  if (loading) {
    return (
      <Container>
        <Center style={{ minHeight: '50vh' }}>
          <Text>Loading...</Text>
        </Center>
      </Container>
    );
  }

  // Check access
  if (user) {
    const hasAccess = canAccessPage(
      user.role,
      user.allowedPages,
      pageName
    );

    if (!hasAccess) {
      return (
        <Container>
          <Center style={{ minHeight: '50vh' }}>
            <Stack align="center" gap="md">
              <IconLock size={48} color="gray" />
              <Text size="xl" fw={500}>
                Access Restricted
              </Text>
              <Text c="dimmed">
                You don&apos;t have permission to view this page.
              </Text>
            </Stack>
          </Center>
        </Container>
      );
    }
  }

  return <>{children}</>;
}
