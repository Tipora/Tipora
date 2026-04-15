import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tipora — Data-Driven Football Tips',
    short_name: 'Tipora',
    description: 'Finding the angle the market missed. Data-driven football tips with full P&L tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#34d399',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
