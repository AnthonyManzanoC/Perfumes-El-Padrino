import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicStore } from '@/lib/public-store';
import {
  absoluteUrl,
  jsonLd,
  identityKeywords,
  brandKeywords,
  uniqueKeywords,
  metaDescription,
} from '@/lib/seo';

export const revalidate = 60;

const categoryDescription = (name: string, description?: string | null) => {
  const detail = description?.trim().replace(/[.!?]+$/, '');
  return `Perfumes ${name.toLowerCase()} originales en Perfumes El Padrino. Envíos desde Babahoyo a todo Ecuador.${detail ? ` ${detail}.` : ''}`;
};

async function getCollection(slug: string) {
  const store = await getPublicStore();
  const category = store.categories.find(
    (item) => item.isActive && item.slug === slug,
  );
  if (!category) return null;
  return {
    store,
    category,
    products: store.products.filter(
      (product) => product.isActive && product.categoryId === category.id,
    ),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { robots: { index: false, follow: false } };

  const { category, products } = collection;
  const path = `/coleccion/${encodeURIComponent(category.slug)}`;
  const description = metaDescription(
    categoryDescription(category.name, category.description),
    '',
  );
  return {
    title: `Perfumes ${category.name} originales`,
    description,
    keywords: uniqueKeywords([
      ...identityKeywords,
      ...brandKeywords(products),
      `perfumes ${category.name.toLowerCase()} Ecuador`,
      `perfumes ${category.name.toLowerCase()} originales`,
      'perfumes originales Ecuador',
      'perfumes El Padrino',
      'perfumes Babahoyo',
      'Jordy Tamayo',
    ]),
    alternates: { canonical: path },
    openGraph: {
      title: `Perfumes ${category.name} | Perfumes El Padrino`,
      description,
      type: 'website',
      url: path,
      siteName: 'Perfumes El Padrino',
      locale: 'es_EC',
      ...(products[0] ? { images: [absoluteUrl(products[0].imageUrl)] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `Perfumes ${category.name} | Perfumes El Padrino`,
      description,
      ...(products[0] ? { images: [absoluteUrl(products[0].imageUrl)] } : {}),
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  const { store, category, products } = collection;
  const path = `/coleccion/${encodeURIComponent(category.slug)}`;
  const description = categoryDescription(category.name, category.description);
  const money = new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: store.settings.currency,
  });

  return (
    <main className="min-h-screen bg-[#f5f1e9] text-[#171611]">
      <header className="border-b border-white/10 bg-[#11100d] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-5 px-5 py-4 sm:px-9 lg:px-14">
          <Link
            href="/"
            className="font-heading text-sm font-semibold tracking-[.13em] sm:text-lg"
          >
            {store.settings.storeName.toUpperCase()}
            <span className="block text-xs font-normal italic tracking-normal text-white/65">
              by Jordy Tamayo
            </span>
          </Link>
          <Link
            href="/#catalogo"
            className="rounded-full border border-white/20 px-4 py-2.5 text-xs font-bold"
          >
            Ver todo el catálogo
          </Link>
        </div>
      </header>

      <section className="border-b border-black/8 bg-[#e8dfcf] px-5 py-14 sm:px-9 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <nav
            className="mb-8 flex flex-wrap gap-2 text-xs text-black/55"
            aria-label="Migas de pan"
          >
            <Link href="/" className="hover:text-black">
              Inicio
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/#catalogo" className="hover:text-black">
              Catálogo
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-black">{category.name}</span>
          </nav>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-[#8a6c29]">
            Colección {category.name}
          </p>
          <h1 className="mt-4 font-heading text-5xl font-semibold leading-none sm:text-7xl">
            Perfumes {category.name}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-black/65">
            {description}
          </p>
          <p className="mt-5 text-sm font-semibold text-black/55">
            {products.length}{' '}
            {products.length === 1
              ? 'perfume disponible'
              : 'perfumes disponibles'}
          </p>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-9 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          {products.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-[1.5rem] bg-white shadow-[0_1px_0_rgba(23,22,17,.04)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(47,37,16,.11)]"
                >
                  <Link
                    href={`/perfumes/${encodeURIComponent(product.slug)}`}
                    className="block"
                  >
                    <Image
                      src={product.imageUrl}
                      alt={`${product.brand} ${product.name}`}
                      className="aspect-[4/4.25] w-full bg-white object-contain p-5"
                      width={640}
                      height={680}
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </Link>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8a6c29]">
                      {product.brand}
                    </p>
                    <h2 className="mt-1 font-heading text-2xl font-semibold leading-tight">
                      <Link
                        href={`/perfumes/${encodeURIComponent(product.slug)}`}
                        className="hover:text-[#8a6c29]"
                      >
                        {product.name}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm text-black/52">
                      {product.sizeMl
                        ? `${product.sizeMl} ml`
                        : 'Presentación original'}{' '}
                      · {product.gender}
                    </p>
                    {product.notesCsv && (
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-black/55">
                        Notas: {product.notesCsv}
                      </p>
                    )}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <strong className="font-heading text-xl">
                        {money.format(product.price)}
                      </strong>
                      <Link
                        href={`/perfumes/${encodeURIComponent(product.slug)}`}
                        className="rounded-full bg-black px-3 py-2 text-[10px] font-bold text-white"
                      >
                        Ver perfume
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-[1.5rem] bg-white p-8 text-black/60">
              Esta colección se actualizará cuando haya perfumes disponibles.
            </p>
          )}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'CollectionPage',
                '@id': `${absoluteUrl(path)}#webpage`,
                url: absoluteUrl(path),
                name: `Perfumes ${category.name}`,
                description,
                isPartOf: { '@id': `${absoluteUrl('/')}#website` },
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
                    name: category.name,
                    item: absoluteUrl(path),
                  },
                ],
              },
              {
                '@type': 'ItemList',
                name: `Perfumes ${category.name}`,
                numberOfItems: products.length,
                itemListElement: products.map((product, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  url: absoluteUrl(
                    `/perfumes/${encodeURIComponent(product.slug)}`,
                  ),
                  name: `${product.brand} ${product.name}`,
                })),
              },
            ],
          }),
        }}
      />
    </main>
  );
}
