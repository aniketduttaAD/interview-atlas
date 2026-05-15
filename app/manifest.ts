import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Interview Atlas',
    short_name: 'Atlas',
    description:
      'Offline-first interview preparation for senior engineers. AI assistant requires internet.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'browser'],
    orientation: 'any',
    prefer_related_applications: false,
    background_color: '#0a0a0a',
    theme_color: '#2563eb',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
