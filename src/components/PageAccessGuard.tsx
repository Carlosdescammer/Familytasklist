'use client';

import { useSession } from 'next-auth/react';
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
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user) {
      const hasAccess = canAccessPage(
        session.user.role,
        session.user.allowedPages,
        pageName
      );

      if (!hasAccess) {
        // Redirect to dashboard if no access
        router.push('/');
      }
    }
  }, [session, status, router, pageName]);

  // Show loading state
  if (status === 'loading') {
    return (
      <Container>
        <Center style={{ minHeight: '50vh' }}>
          <Text>Loading...</Text>
        </Center>
      </Container>
    );
  }

  // Check access
  if (session?.user) {
    const hasAccess = canAccessPage(
      session.user.role,
      session.user.allowedPages,
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
