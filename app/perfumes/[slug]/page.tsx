import type { Metadata } from 'next';

import { ProductDetail } from '@/components/product-detail';
import type { Product, StorefrontData } from '@/lib/store-types';
import { getBackendUrl } from '@/lib/backend-url.mjs';

const apiUrl = getBackendUrl();
export const dynamic = 'force-dynamic';

async function getProduct(slug: string) {
  const response = await fetch(
    `${apiUrl}/api/storefront/products/${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  return response.ok ? ((await response.json()) as Product) : null;
}

async function getStore() {
  const response = await fetch(`${apiUrl}/api/storefront`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('No se pudo cargar la tienda.');
  return (await response.json()) as StorefrontData;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Perfume no encontrado | El Padrino' };
  const shareImage = [product.imageUrl];
  return {
    title: `${product.name} de ${product.brand} | Perfumes El Padrino`,
    description:
      product.description ??
      `Compra ${product.name} original con asesoría por WhatsApp.`,
    openGraph: {
      title: `${product.name} · ${product.brand}`,
      description: product.description ?? 'Perfume original seleccionado.',
      type: 'website',
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
  if (!product) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f0e7] px-5 text-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#8a6c29]">
            Colección El Padrino
          </p>
          <h1 className="mt-4 font-heading text-5xl font-semibold">
            Ese perfume ya no está disponible
          </h1>
          <a
            href="/#catalogo"
            className="mt-7 inline-flex rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
          >
            Volver al catálogo
          </a>
        </div>
      </main>
    );
  }
  const related = store.products
    .filter(
      (item) =>
        item.id !== product.id &&
        (item.categoryId === product.categoryId ||
          item.gender === product.gender),
    )
    .slice(0, 4);
  return (
    <ProductDetail
      product={product}
      settings={store.settings}
      related={related}
    />
  );
}
