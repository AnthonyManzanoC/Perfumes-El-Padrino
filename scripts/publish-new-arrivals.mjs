import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const api = process.env.PERFUMES_API_URL ?? 'https://perfumes-el-padrino-api.onrender.com';
const email = process.env.PERFUMES_ADMIN_EMAIL;
const password = process.env.PERFUMES_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Set PERFUMES_ADMIN_EMAIL and PERFUMES_ADMIN_PASSWORD for this one-time publish.');

const arrivals = JSON.parse(await fs.readFile('catalog/new-arrivals-2026-09-16.json', 'utf8'));
const now = Date.now();
const newUntil = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('es');
const identity = (product) => `${normalize(product.brand)}|${normalize(product.name)}|${product.sizeMl ?? ''}`;

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, options);
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : undefined; } catch { data = body; }
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path}: ${response.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

const login = await request('/api/admin/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const auth = { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
const [categories, existing] = await Promise.all([
  request('/api/admin/categories', { headers: auth }),
  request('/api/admin/products', { headers: auth }),
]);
const categoryIds = new Map(categories.map((category) => [normalize(category.name), category.id]));
const allKeys = new Set();
for (const arrival of arrivals) {
  const key = identity(arrival);
  assert(!allKeys.has(key), `Duplicate entry in arrival file: ${arrival.brand} ${arrival.name}`);
  allKeys.add(key);
  assert(categoryIds.has(normalize(arrival.category)), `Missing category: ${arrival.category}`);
  assert(Array.isArray(arrival.images) && arrival.images.length > 0, `Missing images: ${arrival.name}`);
}

const byIdentity = new Map();
for (const product of existing) {
  const key = identity(product);
  byIdentity.set(key, [...(byIdentity.get(key) ?? []), product]);
}
const toCreate = [];
for (const arrival of arrivals) {
  const matches = byIdentity.get(identity(arrival)) ?? [];
  if (matches.length > 1) throw new Error(`Duplicate product identities already exist for ${arrival.brand} ${arrival.name}; stopped without writing.`);
  if (matches.length === 1) {
    if (!matches[0].isActive) throw new Error(`${arrival.brand} ${arrival.name} already exists but is inactive; review it instead of creating a duplicate.`);
    console.log(`Already published: ${arrival.brand} ${arrival.name} (${arrival.sizeMl} ml)`);
    continue;
  }
  toCreate.push(arrival);
}

for (const arrival of toCreate) {
  const payload = {
    name: arrival.name,
    brand: arrival.brand,
    description: arrival.description,
    gender: arrival.gender,
    sizeMl: arrival.sizeMl,
    price: arrival.price,
    compareAtPrice: arrival.compareAtPrice ?? null,
    freeShipping: true,
    shippingFee: null,
    stock: 1,
    imageUrl: arrival.imageUrl,
    images: arrival.images.map((url, index) => ({
      url,
      altText: index === 0 ? `${arrival.brand} ${arrival.name}` : `Presentación real de ${arrival.brand} ${arrival.name}`,
    })),
    notesCsv: arrival.notesCsv,
    categoryId: categoryIds.get(normalize(arrival.category)),
    featured: false,
    bestseller: false,
    newUntil,
    isActive: true,
    sortOrder: arrival.sortOrder,
  };
  const created = await request('/api/admin/products', { method: 'POST', headers: auth, body: JSON.stringify(payload) });
  assert.equal(created.stock, 1, `${arrival.name}: stock`);
  assert.equal(created.price, arrival.price, `${arrival.name}: price`);
  assert.equal(created.newUntil, newUntil, `${arrival.name}: new badge expiry`);
  assert.deepEqual(created.images.map((image) => image.url), arrival.images, `${arrival.name}: image gallery`);
  console.log(`Published: ${created.brand} ${created.name} (${created.sizeMl} ml) — $${created.price}`);
}

const storefront = await request('/api/storefront');
for (const arrival of arrivals) {
  const matching = storefront.products.filter((product) => identity(product) === identity(arrival));
  assert.equal(matching.length, 1, `Public catalog should contain exactly one ${arrival.brand} ${arrival.name}`);
  const product = matching[0];
  assert.equal(product.stock, 1, `${arrival.name}: public stock`);
  assert.equal(product.newUntil, newUntil, `${arrival.name}: public new badge`);
}
console.log(`Verified ${arrivals.length} new arrivals live with stock 1 and badge expiry ${newUntil}.`);
