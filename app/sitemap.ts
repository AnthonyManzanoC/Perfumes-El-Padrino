import type { MetadataRoute } from 'next';
import { getPublicStore } from '@/lib/public-store';
import { siteUrl, absoluteUrl } from '@/lib/seo';
export const revalidate = 300;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await getPublicStore();
  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    {
      url: absoluteUrl('/nosotros'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...store.products
      .filter((p) => p.isActive)
      .map((p) => ({
        url: absoluteUrl(`/perfumes/${encodeURIComponent(p.slug)}`),
        lastModified: new Date(p.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
  ];
}
