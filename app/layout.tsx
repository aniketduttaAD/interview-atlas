import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { SearchOverlay } from '@/components/search/SearchOverlay';
import { PwaRoot } from '@/components/pwa/PwaRoot';
import { buildRootMetadata } from '@/lib/seo/metadata';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const APP_NAME = 'Interview Atlas';
const APP_DESCRIPTION =
  'Offline-first interview preparation for senior engineers. AI assistant requires internet.';

export const metadata: Metadata = {
  ...buildRootMetadata(),
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans h-full antialiased system`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <PwaRoot>
          <AppShell>{children}</AppShell>
          <SearchOverlay />
          <Toaster position="top-center" richColors />
        </PwaRoot>
      </body>
    </html>
  );
}
