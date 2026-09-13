import type { Metadata } from 'next';
import { Storefront } from '@/components/storefront';
import { getPublicStore } from '@/lib/public-store';
import {
  siteUrl,
  absoluteUrl,
  jsonLd,
  brandKeywords,
  storeKeywords,
  uniqueKeywords,
} from '@/lib/seo';
export const revalidate = 60;
export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStore();
  return {
    alternates: { canonical: '/' },
    keywords: uniqueKeywords([
      ...storeKeywords,
      ...brandKeywords(store.products),
    ]),
  };
}

export default async function Home() {
  const store = await getPublicStore();
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Perfumes El Padrino',
        alternateName: ['El Padrino', 'Perfumes El Padrino by Jordy Tamayo'],
        description:
          'Perfumes originales, de lujo y árabes con envíos desde Babahoyo a todo Ecuador.',
        inLanguage: 'es-EC',
        publisher: { '@id': `${siteUrl}/#store` },
      },
      {
        '@type': 'Store',
        '@id': `${siteUrl}/#store`,
        name: 'Perfumes El Padrino',
        url: siteUrl,
        logo: absoluteUrl('/icons/icon-512.png'),
        image: absoluteUrl('/icons/icon-512.png'),
        description:
          'Perfumería de Jordy Tamayo con perfumes originales, de lujo y árabes desde Babahoyo, Ecuador.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Babahoyo',
          addressRegion: 'Los Ríos',
          addressCountry: 'EC',
        },
        areaServed: 'Ecuador',
        founder: { '@type': 'Person', name: 'Jordy Tamayo' },
        currenciesAccepted: store.settings.currency,
        ...(store.settings.instagramUrl
          ? { sameAs: [store.settings.instagramUrl] }
          : {}),
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(graph) }}
      />
      <Storefront initialData={store} />
    </>
  );
}
