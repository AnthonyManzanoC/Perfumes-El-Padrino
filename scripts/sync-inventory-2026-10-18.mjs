import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

// Read-only unless explicitly invoked with --apply. Credentials are environment-only.
const apply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
const createOnly = process.argv.includes('--create-only');
assert(!(apply && verifyOnly), 'Choose --apply or --verify, not both.');
assert(!createOnly || apply, '--create-only requires --apply.');
const api = process.env.PERFUMES_API_URL ?? 'https://perfumes-el-padrino-api.onrender.com';
const site = process.env.PERFUMES_SITE_URL ?? 'https://perfumes-el-padrino.vercel.app';
const manifest = JSON.parse(await fs.readFile('catalog/inventory-2026-10-18.json', 'utf8'));
const superseded = await fs.access('catalog/inventory-availability-review-2026-10-18.json').then(()=>true,()=>false);
assert(!superseded,'This first inventory cut was superseded by the owner\'s follow-up. Use scripts/reconcile-availability-2026-10-18.mjs; never restore the previous 14-unavailable snapshot.');
const normalize = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
const identity = p => `${normalize(p.brand)}|${normalize(p.name)}|${p.sizeMl ?? ''}`;
const arrivals = JSON.parse(await fs.readFile('catalog/new-arrivals-2026-10-18.json', 'utf8'));
assert.equal(arrivals.length, manifest.expectedNewCount, 'New product count');
assert.equal(manifest.existing.length + arrivals.length, manifest.expectedListedCount, 'Complete screenshot inventory count');
assert.equal(new Set(arrivals.map(identity)).size, arrivals.length, 'Duplicate new identities');
assert.equal(new Set(manifest.existing.map(p => p.slug)).size, manifest.existing.length, 'Duplicate existing slugs');
assert(manifest.unavailableSlugs.every(slug => !manifest.existing.some(p => p.slug === slug)), 'Conflicting availability');
for (const p of arrivals) {
  assert(p.name && p.brand && p.description && p.notesCsv, `Incomplete product: ${p.slug}`);
  assert(Number.isInteger(p.sizeMl) && p.sizeMl > 0, `Unverified volume: ${p.slug}`);
  assert(['Caballero', 'Dama', 'Unisex'].includes(p.gender), `Invalid gender: ${p.slug}`);
  assert(p.price > 0 && (!p.compareAtPrice || p.compareAtPrice > p.price), `Invalid price: ${p.slug}`);
  assert(p.images?.length >= 2 && p.images.length <= 8, `Insufficient or excessive gallery: ${p.slug}`);
  assert.equal(new Set(p.images).size, p.images.length, `Duplicate gallery URL: ${p.slug}`);
  const hashes = [];
  for (const url of p.images) {
    assert(url.startsWith('/catalog/2026-10-18/'), `Expected local catalog asset: ${url}`);
    const bytes = await fs.readFile(path.join('public', url));
    assert(bytes.length > 3000, `Empty/suspicious image: ${url}`);
    hashes.push(createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(new Set(hashes).size, hashes.length, `Duplicate photograph bytes: ${p.slug}`);
}

async function request(route, options = {}) {
  const response = await fetch(`${api}${route}`, { signal: AbortSignal.timeout(60000), ...options });
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : undefined; } catch { data = body; }
  if (!response.ok) {
    const error = new Error(`${options.method ?? 'GET'} ${route}: HTTP ${response.status}`);
    error.status = response.status;
    error.detail = data?.message ?? data?.title ?? '';
    throw error;
  }
  return data;
}
const health = await request('/health');
if (apply && !createOnly) assert.equal(health.catalogRevision, manifest.date, 'Deploy the stable-URL backend before applying inventory.');
const email = process.env.PERFUMES_ADMIN_EMAIL;
const password = process.env.PERFUMES_ADMIN_PASSWORD;
assert(email && password, 'Set PERFUMES_ADMIN_EMAIL and PERFUMES_ADMIN_PASSWORD.');
async function sync() {
const login = await request('/api/admin/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
});
const auth = { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
try {
  const [before, categories] = await Promise.all([
    request('/api/admin/products', { headers: auth }), request('/api/admin/categories', { headers: auth }),
  ]);
  const categoriesByName = new Map(categories.map(c => [normalize(c.name), c.id]));
  const bySlug = new Map(before.map(p => [p.slug, p]));
  const byIdentity = new Map();
  for (const p of before) {
    const key = identity(p);
    assert(!byIdentity.has(key), `Existing duplicate identity: ${key}`);
    byIdentity.set(key, p);
  }
  for (const row of [...manifest.existing, ...manifest.unavailableSlugs.map(slug => ({ slug }))])
    assert(bySlug.has(row.slug), `Missing known product; refusing partial sync: ${row.slug}`);
  const knownSlugs = new Set([...manifest.existing.map(p => p.slug), ...manifest.unavailableSlugs]);
  const arrivalKeys = new Set(arrivals.map(identity));
  const unknown = before.filter(p => !knownSlugs.has(p.slug) && !arrivalKeys.has(identity(p)));
  assert.equal(unknown.length, 0, `Unexpected products added since inventory review: ${unknown.map(p => p.slug).join(', ')}`);

  const fields = ['name','brand','description','gender','sizeMl','price','compareAtPrice','freeShipping','shippingFee','stock','imageUrl','notesCsv','categoryId','featured','bestseller','newUntil','isActive','sortOrder'];
  const payloadFor = product => ({
    ...Object.fromEntries(fields.map(field => [field, product[field] ?? null])),
    originalStock: product.stock,
    images: product.images.map(image => ({ url: image.url, altText: image.altText })),
  });
  const changes = [];
  for (const row of manifest.existing) {
    const old = bySlug.get(row.slug);
    const payload = { ...payloadFor(old), price: row.price, compareAtPrice: row.compareAtPrice, sizeMl: row.sizeMl, stock: Math.max(1, old.stock), isActive: true };
    if (!isDeepStrictEqual(payload, payloadFor(old))) changes.push({ kind: 'listed', old, payload });
  }
  for (const slug of manifest.unavailableSlugs) {
    const old = bySlug.get(slug);
    if (old.stock !== 0) changes.push({ kind: 'unavailable', old, payload: { ...payloadFor(old), stock: 0 } });
  }
  const newUntil = new Date(Date.now() + 30 * 86400000).toISOString();
  for (const [index, p] of arrivals.entries()) {
    const old = byIdentity.get(identity(p));
    const payload = {
      name: p.name, brand: p.brand, description: p.description, gender: p.gender, sizeMl: p.sizeMl,
      price: p.price, compareAtPrice: p.compareAtPrice ?? null, freeShipping: true, shippingFee: null,
      stock: old ? old.stock : 1, ...(old ? { originalStock: old.stock } : {}),
      imageUrl: p.images[0], images: p.images.map((url, i) => ({ url, altText: `${p.brand} ${p.name} ${p.sizeMl} ml — ${i === 0 ? 'presentación' : `vista ${i + 1}`}` })),
      notesCsv: p.notesCsv, categoryId: categoriesByName.get(normalize(p.category)),
      featured: old?.featured ?? false, bestseller: old?.bestseller ?? false,
      newUntil: old?.newUntil ?? newUntil, isActive: true, sortOrder: old?.sortOrder ?? 300 + index,
    };
    assert(payload.categoryId, `Unknown category: ${p.category}`);
    if (!old || !isDeepStrictEqual(payloadFor(old), payload)) changes.push({ kind: old ? 'arrival-update' : 'create', old, payload, arrival: p });
  }
  // Legacy deployments may safely CREATE new products, but must never PUT an existing URL.
  if (createOnly) assert(changes.every(c => c.kind === 'create'), 'Create-only mode refuses all edits. Apply the stock-only database plan first.');
  const planned = {
    listed: manifest.expectedListedCount, newProducts: arrivals.length,
    create: changes.filter(c => c.kind === 'create').length,
    existingUpdates: changes.filter(c => c.kind === 'listed').length,
    unavailableUpdates: changes.filter(c => c.kind === 'unavailable').length,
    galleryUpdates: changes.filter(c => c.kind === 'arrival-update').length,
    newImages: arrivals.reduce((sum, p) => sum + p.images.length, 0),
  };
  console.log(JSON.stringify({ mode: apply ? 'apply' : verifyOnly ? 'verify' : 'dry-run', ...planned }, null, 2));
  if (!apply && !verifyOnly) {
    for (const c of changes) console.log(`${c.kind}: ${c.payload.brand} ${c.payload.name} | stock ${c.old?.stock ?? '-'} → ${c.payload.stock} | $${c.payload.price}`);
    console.log('Read-only plan complete; no catalog mutations.');
    return;
  }
  const receipt = { date: manifest.date, appliedAt: new Date().toISOString(), plan: planned, results: [], conflicts: [] };
  let backupDir;
  if (apply) {
    // Verify the deployed files BEFORE referencing them from the live database.
    const imageUrls = arrivals.flatMap(p => p.images);
    for (let start = 0; start < imageUrls.length; start += 6) {
      await Promise.all(imageUrls.slice(start, start + 6).map(async url => {
        const response = await fetch(`${site}${url}`, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
        assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Asset not deployed: ${url} (${response.status})`);
      }));
    }
    backupDir = path.join('work/catalog-backups', `inventory-${manifest.date}-${Date.now()}`);
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, 'before-products.json'), JSON.stringify(before, null, 2));
    await fs.writeFile(path.join(backupDir, 'plan.json'), JSON.stringify(changes.map(c => ({ kind: c.kind, id: c.old?.id, previousSlug: c.old?.slug, payload: c.payload })), null, 2));
    for (const change of changes) {
      try {
        const saved = await request(change.old ? `/api/admin/products/${change.old.id}` : '/api/admin/products', {
          method: change.old ? 'PUT' : 'POST', headers: auth, body: JSON.stringify(change.payload),
        });
        if (change.old) assert.equal(saved.slug, change.old.slug, `Published URL changed: ${change.old.slug}`);
        assert.equal(saved.price, change.payload.price, 'Saved price');
        assert.equal(saved.stock, change.payload.stock, 'Saved raw stock');
        receipt.results.push({ kind: change.kind, id: saved.id, slug: saved.slug, stock: saved.stock });
        console.log(`Saved ${change.kind}: ${saved.brand} ${saved.name} (${saved.slug})`);
      } catch (error) {
        if (error.status !== 409) throw error;
        // Never override sold or reserved units, even if the owner's snapshot predates a live order.
        receipt.conflicts.push({ slug: change.old?.slug, reason: error.detail });
        console.log(`Preserved concurrent/reserved inventory: ${change.old?.slug}`);
      }
      await fs.writeFile(path.join(backupDir, 'receipt.json'), JSON.stringify(receipt, null, 2));
    }
  }
  const [after, publicStore] = await Promise.all([
    request('/api/admin/products', { headers: auth }), request('/api/storefront'),
  ]);
  const conflictSlugs = new Set(receipt.conflicts.map(c => c.slug));
  for (const row of manifest.existing) {
    const p = after.find(p => p.slug === row.slug);
    assert(p?.isActive, `Listed product is missing: ${row.slug}`);
    assert.equal(p.price, row.price, `${row.slug}: price`);
    assert.equal(p.compareAtPrice, row.compareAtPrice, `${row.slug}: offer`);
    assert.equal(p.sizeMl, row.sizeMl, `${row.slug}: volume`);
    if (!conflictSlugs.has(row.slug)) assert(p.stock > 0, `${row.slug}: raw inventory`);
  }
  for (const slug of manifest.unavailableSlugs) {
    const p = after.find(p => p.slug === slug);
    assert(p?.isActive, `Preserve old URL instead of deleting: ${slug}`);
    if (!conflictSlugs.has(slug)) assert.equal(p.stock, 0, `${slug}: unavailable`);
  }
  for (const arrival of arrivals) {
    const matches = after.filter(p => identity(p) === identity(arrival));
    assert.equal(matches.length, 1, `New product must appear exactly once: ${arrival.name}`);
    const p = matches[0];
    assert.equal(p.price, arrival.price, `${p.slug}: new price`);
    assert.equal(p.sizeMl, arrival.sizeMl, `${p.slug}: new volume`);
    assert.deepEqual(p.images.map(i => i.url), arrival.images, `${p.slug}: complete gallery`);
    assert(p.isActive && new Date(p.newUntil).getTime() > Date.now(), `${p.slug}: active with temporary new badge`);
    assert(publicStore.products.some(x => x.id === p.id), `${p.slug}: publicly listed`);
  }
  for (const old of before) assert(after.some(p => p.id === old.id && p.slug === old.slug), `Lost old product/URL: ${old.slug}`);
  assert.equal(after.length, manifest.existing.length + manifest.unavailableSlugs.length + arrivals.length, 'Unexpected final catalog size');
  const reserved = publicStore.products.filter(p => manifest.existing.some(row => row.slug === p.slug) && p.stock === 0 && after.find(a => a.id === p.id)?.stock > 0);
  const result = { verified: true, catalogTotal: after.length, inventoryListed: manifest.expectedListedCount, unavailable: manifest.unavailableSlugs.length, newProducts: arrivals.length, newImages: planned.newImages, reservedListed: reserved.map(p => p.slug), conflicts: receipt.conflicts };
  if (backupDir) {
    await fs.writeFile(path.join(backupDir, 'after-products.json'), JSON.stringify(after, null, 2));
    await fs.writeFile(path.join(backupDir, 'verification.json'), JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await request('/api/admin/logout', { method: 'POST', headers: auth }).catch(() => {});
}
}
await sync();
