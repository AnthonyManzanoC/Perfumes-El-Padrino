import type { Product } from './store-types';

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  'https://perfumes-el-padrino.vercel.app'
).replace(/\/$/, '');
export const absoluteUrl = (path: string) => new URL(path, siteUrl).href;
export const jsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');

export const identityKeywords = [
  'Perfumes El Padrino',
  'El Padrino',
  'El Padrino perfumes',
  'perfumería El Padrino',
  'Perfumes El Padrino by Jordy Tamayo',
  'Jordy Tamayo',
];

// Descriptive metadata only: Google does not use meta keywords for ranking.
export const storeKeywords = [
  ...identityKeywords,
  'perfumes',
  'perfumería',
  'fragancias',
  'perfumes originales',
  'perfumes originales Ecuador',
  'perfumes Ecuador',
  'perfumería Ecuador',
  'perfumes Babahoyo',
  'perfumería Babahoyo',
  'Babahoyo',
  'Los Ríos',
  'perfumes Los Ríos',
  'perfumes originales Babahoyo',
  'perfumes árabes',
  'perfumes árabes Ecuador',
  'perfumes árabes Babahoyo',
  'fragancias árabes',
  'perfumes de lujo',
  'fragancias de lujo Ecuador',
  'perfumes de diseñador',
  'perfumes para hombre',
  'perfumes de caballero',
  'perfumes masculinos',
  'perfumes para mujer',
  'perfumes de dama',
  'perfumes femeninos',
  'perfumes unisex',
  'perfumes para regalo',
  'comprar perfumes Ecuador',
  'comprar perfumes originales',
  'comprar perfumes online Ecuador',
  'tienda de perfumes Ecuador',
  'catálogo de perfumes',
  'precios de perfumes Ecuador',
  'perfumes con envíos a todo Ecuador',
  'envío de perfumes a Guayaquil',
  'envío de perfumes a Quito',
  'envío de perfumes a Cuenca',
  'envío de perfumes a Quevedo',
  'envío de perfumes a Manta',
  'envío de perfumes a Machala',
  'envío de perfumes a Santo Domingo',
];

export function uniqueKeywords(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLocaleLowerCase('es');
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function brandKeywords(products: Product[]) {
  return uniqueKeywords(
    products
      .filter((product) => product.isActive)
      .map((product) => `perfumes ${product.brand} Ecuador`),
  );
}

export function productKeywords(product: Product) {
  const name = `${product.brand} ${product.name}`;
  const audience =
    product.gender === 'Dama'
      ? ['perfumes para mujer', 'perfumes de dama']
      : product.gender === 'Caballero'
        ? ['perfumes para hombre', 'perfumes de caballero']
        : ['perfumes unisex'];
  return uniqueKeywords([
    ...identityKeywords,
    name,
    `${name} Ecuador`,
    `${name} Babahoyo`,
    `comprar ${name}`,
    `precio ${name} Ecuador`,
    `perfumes ${product.brand} Ecuador`,
    ...(product.sizeMl ? [`${name} ${product.sizeMl} ml`] : []),
    ...audience,
    'perfumes originales Ecuador',
    'perfumes Babahoyo',
    ...(product.notesCsv
      ?.split(',')
      .map((note) => `perfume con ${note.trim()}`) ?? []),
  ]);
}

export const metaDescription = (
  value: string | null | undefined,
  fallback: string,
  maxLength = 155,
) => {
  const description = (value?.trim() || fallback).replace(/\s+/g, ' ').trim();
  if (description.length <= maxLength) return description;

  const shortened = description
    .slice(0, maxLength - 1)
    .replace(/\s+\S*$/, '')
    .trim();
  return `${shortened || description.slice(0, maxLength - 1)}…`;
};
