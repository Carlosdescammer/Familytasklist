'use client';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { SessionProvider } from 'next-auth/react';
import { theme } from '@/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications />
        {children}
      </MantineProvider>
    </SessionProvider>
  );
}

export { ColorSchemeScript };
