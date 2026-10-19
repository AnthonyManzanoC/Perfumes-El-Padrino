import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const site = 'https://perfumes-el-padrino.vercel.app';
const api = 'https://perfumes-el-padrino-api.onrender.com';
const arrivals = JSON.parse(await fs.readFile('catalog/new-arrivals-2026-10-18.json', 'utf8'));
const manifest = JSON.parse(await fs.readFile('catalog/inventory-2026-10-18.json', 'utf8'));
const review = await fs.readFile('catalog/inventory-availability-review-2026-10-18.json','utf8').then(JSON.parse,()=>null);
const absent = review?.unavailableSlugs ?? manifest.unavailableSlugs;
const get = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, `HTTP status: ${url}`);
  return response;
};
const store = await (await get(`${api}/api/storefront`)).json();
assert.equal(store.products.length, 97, 'Published catalog count');
const sitemap = await (await get(`${site}/sitemap.xml`)).text();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(locs.length, 103, 'Sitemap includes home, about, four collections and 97 product URLs');
for (const product of store.products) assert(locs.includes(`${site}/perfumes/${product.slug}`), `Not in sitemap: ${product.slug}`);
for (const slug of absent) assert.equal(store.products.find(p => p.slug === slug)?.stock, 0, `${slug}: unavailable`);
if(review) {
  const known = new Set(store.products.filter(p=>!absent.includes(p.slug)).map(p=>p.slug));
  assert.equal(known.size,89,'Latest owner-reviewed inventory references');
  assert(store.products.filter(p=>known.has(p.slug)).every(p=>p.stock>0),'Every pictured reference is available for purchase');
}
const results = [];
for (let offset = 0; offset < arrivals.length; offset += 4) {
  await Promise.all(arrivals.slice(offset, offset + 4).map(async arrival => {
    const matching = store.products.filter(p => p.brand === arrival.brand && p.name === arrival.name && p.sizeMl === arrival.sizeMl);
    assert.equal(matching.length, 1, `Exact new model: ${arrival.brand} ${arrival.name}`);
    const product = matching[0];
    const url = `${site}/perfumes/${product.slug}`;
    const html = await (await get(url)).text();
    const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap(match => { const schema = JSON.parse(match[1]); return schema['@graph'] ?? [schema]; });
    const schema = schemas.find(value => value['@type'] === 'Product');
    assert(schema, `Server-rendered Product schema: ${url}`);
    assert.equal(schema.name, `${arrival.brand} ${arrival.name}`, `${url}: product name`);
    assert.equal(Number(schema.offers.price), arrival.price, `${url}: structured price`);
    assert.equal(schema.offers.priceCurrency, 'USD', `${url}: currency`);
    assert.equal(schema.image.length, arrival.images.length, `${url}: image schema`);
    assert(html.includes(`rel="canonical" href="${url}"`), `${url}: canonical`);
    assert(!/name="robots" content="[^"]*noindex/.test(html), `${url}: indexability`);
    results.push({ slug: product.slug, status: 200, price: arrival.price, images: schema.image.length, canonical: true, productSchema: true });
  }));
}
const report = {
  checkedAt: new Date().toISOString(), site, catalogProducts: store.products.length,
  inventoryReferences: review?89:83, newProducts: results.length, newImages: results.reduce((sum, p) => sum + p.images, 0),
  available: store.products.filter(p => p.stock > 0).length,
  unavailableLegacy: absent.length, sitemapUrls: locs.length,
  checkedNewPages: results.sort((a, b) => a.slug.localeCompare(b.slug)),
};
await fs.mkdir('work/inventory-2026-10-18', { recursive: true });
await fs.writeFile('work/inventory-2026-10-18/public-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
