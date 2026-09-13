import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { absoluteUrl, jsonLd } from '@/lib/seo';
import { getPublicStore } from '@/lib/public-store';

import { ProductDetail } from '@/components/product-detail';
import type { Product } from '@/lib/store-types';
import { getBackendUrl } from '@/lib/backend-url.mjs';

const apiUrl = getBackendUrl();
export const dynamic = 'force-dynamic';

const getProduct = cache(async (slug: string) => {
  const response = await fetch(
    `${apiUrl}/api/storefront/products/${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('No se pudo consultar el perfume.');
  return (await response.json()) as Product;
});

const getStore = getPublicStore;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product)
    return {
      title: 'Perfume no encontrado | El Padrino',
      robots: { index: false },
    };
  const shareImage = [absoluteUrl(product.imageUrl)];
  return {
    alternates: { canonical: `/perfumes/${encodeURIComponent(product.slug)}` },
    title: `${product.name} de ${product.brand} | Perfumes El Padrino`,
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} · ${product.brand}`,
      description: product.description ?? 'Perfume original en Ecuador.',
      images: shareImage,
    },
    description:
      product.description ??
      `Compra ${product.name} original en Perfumes El Padrino, Babahoyo, Ecuador.`,
    openGraph: {
      title: `${product.name} · ${product.brand}`,
      description: product.description ?? 'Perfume original seleccionado.',
      type: 'website',
      url: `/perfumes/${encodeURIComponent(product.slug)}`,
      images: shareImage,
    },
  };
}

export default async function PerfumePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, store] = await Promise.all([getProduct(slug), getStore()]);
  if (!product) notFound();
  const productUrl = `/perfumes/${encodeURIComponent(product.slug)}`;
  const gallery = [
    ...new Set([product.imageUrl, ...product.images.map((image) => image.url)]),
  ];
  const related = store.products
    .filter(
      (item) =>
        item.id !== product.id &&
        (item.categoryId === product.categoryId ||
          item.gender === product.gender),
    )
    .slice(0, 4);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Product',
                '@id': `${absoluteUrl(productUrl)}#product`,
                url: absoluteUrl(productUrl),
                name: `${product.brand} ${product.name}`,
                description: product.description,
                image: gallery.map(absoluteUrl),
                sku: product.id,
                category: product.categoryName,
                brand: { '@type': 'Brand', name: product.brand },
                ...(product.notesCsv
                  ? {
                      additionalProperty: [
                        {
                          '@type': 'PropertyValue',
                          name: 'Notas olfativas',
                          value: product.notesCsv,
                        },
                      ],
                    }
                  : {}),
                offers: {
                  '@type': 'Offer',
                  url: absoluteUrl(productUrl),
                  priceCurrency: store.settings.currency,
                  price: product.price,
                  availability:
                    product.stock > 0
                      ? 'https://schema.org/InStock'
                      : 'https://schema.org/OutOfStock',
                  itemCondition: 'https://schema.org/NewCondition',
                  seller: {
                    '@type': 'Organization',
                    name: store.settings.storeName,
                  },
                },
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Inicio',
                    item: absoluteUrl('/'),
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Catálogo',
                    item: absoluteUrl('/#catalogo'),
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: `${product.brand} ${product.name}`,
                    item: absoluteUrl(productUrl),
                  },
                ],
              },
            ],
          }),
        }}
      />
      <ProductDetail
        product={product}
        settings={store.settings}
        related={related}
      />
    </>
  );
}
