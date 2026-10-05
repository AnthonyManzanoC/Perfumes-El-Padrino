import type { Metadata } from 'next';
import { Storefront } from '@/components/storefront';
import { getPublicStore } from '@/lib/public-store';
import {
  siteUrl,
  absoluteUrl,
  homeDescription,
  homeTitle,
  jsonLd,
  brandKeywords,
  storeKeywords,
  uniqueKeywords,
} from '@/lib/seo';
import type { StorefrontData } from '@/lib/store-types';
export const revalidate = 60;

const fallbackStore: StorefrontData = {
  settings: {
    storeName: 'Perfumes El Padrino',
    tagline: 'Tu esencia. Tu legado.',
    announcement: 'Perfumería 100% original · Asesoría personalizada por WhatsApp',
    heroEyebrow: 'Fragancias que dejan huella',
    heroTitle: 'Tu esencia.',
    heroAccent: 'Tu legado.',
    heroDescription: 'Perfumes originales seleccionados para convertir cada llegada en una declaración.',
    logoUrl: '/brand/el-padrino-mark.svg',
    heroImageUrl: '',
    whatsAppNumber: '',
    whatsAppGreeting: 'Hola, quiero asesoría para elegir mi perfume.',
    aboutTitle: 'Una fragancia para cada historia',
    aboutText: 'Perfumería de Jordy Tamayo en Babahoyo, Ecuador.',
    instagramUrl: 'https://www.instagram.com/el_padrino28/',
    address: 'Babahoyo, Los Ríos, Ecuador',
    deliveryText: 'Envíos a todo Ecuador',
    currency: 'USD',
    primaryColor: '#11100d',
    accentColor: '#d8b96e',
    backgroundColor: '#f4f0e7',
  },
  categories: [],
  products: [],
};

async function getStoreOrFallback() {
  try {
    return await getPublicStore();
  } catch {
    return fallbackStore;
  }
}

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
  const store = await getStoreOrFallback();
  return {
    title: homeTitle,
    description: homeDescription,
    alternates: { canonical: '/' },
    keywords: uniqueKeywords([
      ...storeKeywords,
      ...brandKeywords(store.products),
    ]),
  };
}

export default async function Home() {
  const store = await getStoreOrFallback();
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
        description: homeDescription,
        inLanguage: 'es-EC',
        publisher: { '@id': `${siteUrl}/#store` },
      },
      {
        '@type': 'Store',
        '@id': `${siteUrl}/#store`,
        name: 'Perfumes El Padrino',
        alternateName: ['El Padrino Perfumes', 'Perfumes Padrino'],
        url: siteUrl,
        logo: absoluteUrl('/brand/el-padrino-mark.svg'),
        image: absoluteUrl('/icons/icon-512.png'),
        description: homeDescription,
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
      <Storefront initialData={store.products.length ? store : undefined} />
    </>
  );
}
