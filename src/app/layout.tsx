import type { Metadata, Viewport } from 'next';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { Providers, ColorSchemeScript } from './providers';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'FamilyList - Family Organization App | Shared Calendar, Tasks & Shopping Lists',
  description: 'The all-in-one family organization app. Manage shared calendars, shopping lists, tasks, recipes, and budgets in one beautiful platform. Free for families.',
  keywords: ['family organization', 'family app', 'shared calendar', 'shopping list', 'task management', 'family tasks', 'family calendar', 'recipe organizer', 'family budget'],
  authors: [{ name: 'FamilyList' }],
  creator: 'FamilyList',
  publisher: 'FamilyList',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://familylist.app',
    title: 'FamilyList - Family Organization App',
    description: 'The all-in-one family organization app. Manage shared calendars, shopping lists, tasks, recipes, and budgets in one beautiful platform.',
    siteName: 'FamilyList',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FamilyList - Family Organization App',
    description: 'The all-in-one family organization app. Manage shared calendars, shopping lists, tasks, recipes, and budgets.',
    creator: '@familylist',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FamilyList',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  metadataBase: new URL('https://familylist.app'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#228be6',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <ColorSchemeScript defaultColorScheme="auto" />
        </head>
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
