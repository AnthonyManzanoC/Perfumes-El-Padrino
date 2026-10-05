import type { Product } from './store-types';

export type ShowcaseMode = 'wanted' | 'prestige' | 'new';

const prestigeHouses = [
  ['maison francis kurkdjian', 5],
  ['parfums de marly', 5],
  ['clive christian', 5],
  ['frederic malle', 5],
  ['tom ford', 5],
  ['roja', 5],
  ['xerjoff', 5],
  ['initio', 5],
  ['amouage', 5],
  ['creed', 5],
  ['kilian', 5],
  ['le labo', 5],
  ['byredo', 5],
  ['mancera', 5],
  ['montale', 5],
  ['hermes', 4],
  ['hermès', 4],
  ['chanel', 4],
  ['dior', 4],
  ['armani', 4],
  ['giorgio armani', 4],
  ['ysl', 4],
  ['yves saint laurent', 4],
  ['gucci', 4],
  ['prada', 4],
  ['valentino', 4],
  ['burberry', 4],
  ['versace', 4],
  ['carolina herrera', 4],
  ['givenchy', 4],
  ['jean paul gaultier', 4],
  ['rabanne', 4],
  ['paco rabanne', 4],
  ['dolce', 4],
  ['bvlgari', 4],
  ['bulgari', 4],
  ['viktor', 4],
  ['lancome', 4],
  ['lattafa', 3],
  ['afnan', 3],
  ['armaf', 3],
  ['al haramain', 3],
  ['swiss arabian', 3],
  ['ajmal', 3],
  ['rasasi', 3],
  ['dumont', 2],
  ['coach', 3],
  ['lacoste', 3],
  ['calvin klein', 3],
] as const;

function prestigeScore(brand: string) {
  const normalized = brand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return prestigeHouses.find(([house]) => normalized.includes(house))?.[1] ?? 1;
}

function isNew(product: Product, now: number) {
  const expiry = product.newUntil ? Date.parse(product.newUntil) : 0;
  return Number.isFinite(expiry) && expiry > now;
}

export function recommendLuxuryShowcase(
  products: Product[],
  mode: ShowcaseMode,
  now = Date.now(),
  limit = 4,
) {
  const pool = products.filter((product) => product.isActive);
  if (!pool.length) return [];

  const prices = pool.map((product) => product.price).sort((a, b) => a - b);
  const priceScore = (price: number) =>
    prices.length < 2 ? 0 : (prices.findIndex((value) => value >= price) / (prices.length - 1)) * 25;

  const score = (product: Product) => {
    const house = prestigeScore(product.brand);
    const available = product.stock > 0;
    const isRecentlyNew = isNew(product, now);
    const updated = Date.parse(product.updatedAt);
    const freshness = Number.isFinite(updated)
      ? Math.max(0, 1 - (now - updated) / (90 * 86400000))
      : 0;
    const price = priceScore(product.price);
    const status = (available ? 24 : 0) +
      (product.bestseller ? 19 : 0) +
      (product.featured ? 13 : 0) +
      (isRecentlyNew ? 15 : 0) +
      (product.compareAtPrice && product.compareAtPrice > product.price ? 2 : 0);
    const visualQuality = product.imageUrl?.trim() ? 18 : 0;

    if (mode === 'prestige') return house * 16 + price * 1.3 + status * 0.45 + visualQuality;
    if (mode === 'new') return (isRecentlyNew ? 46 : 0) + freshness * 20 + house * 5 + status * 0.65 + price * 0.25 + visualQuality;
    return house * 11 + price + status + visualQuality;
  };

  const remaining = [...pool].sort(
    (a, b) => score(b) - score(a) || b.price - a.price || a.sortOrder - b.sortOrder,
  );
  const selected: Product[] = [];
  while (remaining.length && selected.length < limit) {
    const selectedBrands = new Set(selected.map((product) => product.brand.toLowerCase()));
    const differentBrandExists = remaining.some(
      (product) => !selectedBrands.has(product.brand.toLowerCase()),
    );
    const index = remaining.findIndex(
      (product) => !differentBrandExists || !selectedBrands.has(product.brand.toLowerCase()),
    );
    selected.push(remaining.splice(Math.max(index, 0), 1)[0]);
  }
  return selected;
}

export function prestigeLabel(product: Product) {
  const level = prestigeScore(product.brand);
  if (level >= 5) return 'Alta perfumería';
  if (level >= 4) return 'Casa de lujo';
  if (level >= 3) return 'Casa de diseño';
  return 'Selección El Padrino';
}
