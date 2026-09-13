import type { MetadataRoute } from 'next';
import { getPublicStore } from '@/lib/public-store';
import { siteUrl, absoluteUrl } from '@/lib/seo';
export const revalidate = 60;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await getPublicStore();
  const activeProducts = store.products.filter((product) => product.isActive);
  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    {
      url: absoluteUrl('/nosotros'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...store.categories
      .filter((category) => category.isActive)
      .map((category) => {
        const products = activeProducts.filter(
          (product) => product.categoryId === category.id,
        );
        const newestProduct = products.reduce(
          (latest, product) =>
            !latest || new Date(product.updatedAt) > new Date(latest.updatedAt)
              ? product
              : latest,
          undefined as (typeof products)[number] | undefined,
        );
        return {
          url: absoluteUrl(`/coleccion/${encodeURIComponent(category.slug)}`),
          ...(newestProduct
            ? { lastModified: new Date(newestProduct.updatedAt) }
            : {}),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        };
      }),
    ...activeProducts.map((p) => ({
      url: absoluteUrl(`/perfumes/${encodeURIComponent(p.slug)}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      images: [
        ...new Set([p.imageUrl, ...p.images.map((image) => image.url)]),
      ].map(absoluteUrl),
    })),
  ];
}
