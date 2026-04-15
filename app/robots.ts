import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/tracker'], // tracker is gated, API routes are private
      },
    ],
    sitemap: 'https://tipora.bet/sitemap.xml',
  };
}
