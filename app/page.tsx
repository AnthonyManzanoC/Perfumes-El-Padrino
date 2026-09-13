import { Storefront } from '@/components/storefront';
import { getPublicStore } from '@/lib/public-store';
import { siteUrl, absoluteUrl, jsonLd } from '@/lib/seo';
export const revalidate = 60;
export const metadata = { alternates: { canonical: '/' } };

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
        inLanguage: 'es-EC',
      },
      {
        '@type': 'Store',
        '@id': `${siteUrl}/#store`,
        name: 'Perfumes El Padrino',
        url: siteUrl,
        logo: absoluteUrl('/icons/icon-512.png'),
        image: absoluteUrl('/icons/icon-512.png'),
        description:
          'Perfumes originales by Jordy Tamayo desde Babahoyo, Ecuador.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Babahoyo',
          addressRegion: 'Los Ríos',
          addressCountry: 'EC',
        },
        areaServed: 'Ecuador',
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
