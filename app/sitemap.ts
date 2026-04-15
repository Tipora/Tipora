import type { MetadataRoute } from 'next';

const BASE_URL = 'https://tipora.bet';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticPages = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${BASE_URL}/tips`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${BASE_URL}/tips/acca/game`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/tips/acca/weekend`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE_URL}/tracker`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/faq`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/responsible-gambling`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.2 },
  ];

  // Generate last 30 days of historical tip pages
  const historicalPages = Array.from({ length: 30 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    return {
      url: `${BASE_URL}/tips/${dateStr}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    };
  });

  return [...staticPages, ...historicalPages];
}
