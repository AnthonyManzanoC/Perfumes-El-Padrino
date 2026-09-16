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

const instagramProfile = (value: string) => {
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/^\/+|\/+$/g, '');
    return /^www\.instagram\.com$/i.test(url.hostname) || /^instagram\.com$/i.test(url.hostname)
      ? path
        ? url.href
        : undefined
      : undefined;
  } catch {
    return undefined;
  }
};

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
  const whatsappNumber = store.settings.whatsAppNumber.replace(/\D/g, '');
  const instagramUrl = instagramProfile(store.settings.instagramUrl);
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Perfumes El Padrino',
        alternateName: [
          'El Padrino',
          'El Padrino Perfumes',
          'Perfumes Padrino',
          'Perfumes El Padrino by Jordy Tamayo',
        ],
        description:
          'Perfumes originales, de lujo y árabes con envíos desde Babahoyo a todo Ecuador.',
        inLanguage: 'es-EC',
        publisher: { '@id': `${siteUrl}/#store` },
      },
      {
        '@type': 'Store',
        '@id': `${siteUrl}/#store`,
        name: 'Perfumes El Padrino',
        alternateName: ['El Padrino Perfumes', 'Perfumes Padrino'],
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
        ...(whatsappNumber
          ? {
              telephone: `+${whatsappNumber}`,
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: `+${whatsappNumber}`,
                contactType: 'ventas y atención al cliente',
                availableLanguage: 'es',
              },
            }
          : {}),
        ...(instagramUrl
          ? { sameAs: [instagramUrl] }
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
