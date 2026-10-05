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
  ['guerlain', 4],
  ['maison margiela', 5],
  ['acqua di parma', 4],
  ['penhaligon', 5],
  ['house of sillage', 5],
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
  ['moschino', 3],
  ['jimmy choo', 3],
  ['mugler', 4],
  ['issey miyake', 3],
  ['elizabeth arden', 3],
] as const;

const celebratedNames = [
  'sauvage',
  "j'adore",
  'jadore',
  'aventus',
  'invictus',
  'bleu de chanel',
  'coco mademoiselle',
  'chance',
  'armani code',
  'acqua di gio',
  'born in roma',
  'la vie est belle',
  'libre',
  'good girl',
  'one million',
  'black opium',
  'light blue',
  'eros',
  'goddess',
  'cloud',
  'yara',
  '9pm',
] as const;

function prestigeScore(brand: string) {
  const normalized = brand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return prestigeHouses.find(([house]) => normalized.includes(house))?.[1] ?? 1;
}

function nameRecognitionScore(product: Product) {
  const name = `${product.brand} ${product.name}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return celebratedNames.some((signature) => name.includes(signature)) ? 34 : 0;
}

function mainstreamFameScore(brand: string) {
  const level = prestigeScore(brand);
  // Widely recognized designer houses get more weight in the “most wanted” mode
  // than niche prestige alone; sales flags can further personalize this ranking.
  return level === 4 ? 20 : level === 3 ? 12 : level === 5 ? 8 : 0;
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
    const status = (available ? 25 : 0) +
      (product.bestseller ? 32 : 0) +
      (product.featured ? 22 : 0) +
      (isRecentlyNew ? 7 : 0) +
      (product.compareAtPrice && product.compareAtPrice > product.price ? 2 : 0);
    const visualQuality = product.imageUrl?.trim() ? 18 : 0;

    if (mode === 'prestige') return house * 38 + price * 0.72 + status * 0.18 + visualQuality;
    if (mode === 'new') return (isRecentlyNew ? 58 : 0) + freshness * 25 + house * 7 + status * 0.45 + price * 0.2 + visualQuality;
    return nameRecognitionScore(product) + mainstreamFameScore(product.brand) + status + price * 0.25 + house * 2 + visualQuality;
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
