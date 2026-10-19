import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile('lib/luxury-recommendations.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { recommendLuxuryShowcase } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const product = (id, brand, price, stock, extra = {}) => ({
  id, name: `Perfume ${id}`, brand, price, stock, isActive: true,
  imageUrl: '/catalog/test.webp', updatedAt: '2026-10-18T12:00:00Z', sortOrder: 1, ...extra,
});
const now = Date.parse('2026-10-18T15:00:00Z');
const available = [product('a', 'Armaf', 70, 1), product('b', 'Lattafa', 75, 1), product('c', 'Mugler', 105, 1), product('d', 'Rasasi', 70, 1)];
const unavailable = [product('sold', 'Creed', 300, 0, { featured: true, bestseller: true }), product('archived', 'Dior', 150, 1, { isActive: false })];
for (const mode of ['wanted', 'prestige', 'new']) {
  const result = recommendLuxuryShowcase([...available, ...unavailable], mode, now, 24);
  assert.equal(result.length, 4, `${mode}: complete available row`);
  assert(result.every(p => p.stock > 0 && p.isActive), `${mode}: no archived, sold or reserved products`);
  assert.deepEqual(recommendLuxuryShowcase(unavailable, mode, now, 4), [], `${mode}: empty stock must not recommend unavailable products`);
  assert.equal(recommendLuxuryShowcase([available[0]], mode, now, 4).length, 1, `${mode}: never duplicate a product to fill gaps`);
}
const manifest = JSON.parse(await fs.readFile('catalog/inventory-2026-10-18.json', 'utf8'));
const arrivals = JSON.parse(await fs.readFile('catalog/new-arrivals-2026-10-18.json', 'utf8'));
assert.equal(manifest.existing.length + arrivals.length, 83);
assert.equal(arrivals.length, 23);
assert.equal(manifest.unavailableSlugs.length, 14);
assert.equal(arrivals.reduce((sum, p) => sum + p.images.length, 0), 84);
assert(arrivals.every(p => p.images.length >= 3 && p.images.length <= 4));
const review = JSON.parse(await fs.readFile('catalog/inventory-availability-review-2026-10-18.json','utf8'));
assert.equal(manifest.existing.length+arrivals.length+review.additionalConfirmedAvailable.length,89);
assert.equal(review.unavailableSlugs.length,8);
assert(review.additionalConfirmedAvailable.every(p=>manifest.unavailableSlugs.includes(p.slug)));
assert(review.unavailableSlugs.every(slug=>!review.additionalConfirmedAvailable.some(p=>p.slug===slug)));
console.log('PASS: available-only recommendations in all three modes; current owner review89 references/8 unavailable, preserving historical83-reference import and84 new photos.');
