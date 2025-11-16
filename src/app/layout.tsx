import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { Providers, ColorSchemeScript } from './providers';

export const metadata: Metadata = {
  title: 'FamilyList - Family Productivity App',
  description: 'Shared calendar, shopping lists, and tasks for your family',
  manifest: '/manifest.json',
  themeColor: '#228be6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FamilyList',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
