import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const expected = JSON.parse(await fs.readFile('catalog/real-catalog.json','utf8'));
const response = await fetch('http://localhost:5190/api/storefront');
assert.equal(response.status,200);
const store = await response.json();
assert.equal(store.products.length,expected.length);
for (const entry of expected) {
  const actual = store.products.find(p => p.name === entry.name && p.brand === entry.brand);
  assert.ok(actual,`${entry.brand} ${entry.name}`);
  for (const key of ['price','compareAtPrice','sizeMl','description']) assert.equal(actual[key],entry[key],`${entry.name}: ${key}`);
  assert.equal(actual.stock,1);
  assert.equal(actual.freeShipping,true);
  assert.equal(actual.images.length,entry.images.length);
  assert.equal(actual.imageUrl,entry.images[0]);
  assert.deepEqual(actual.images.map(i=>i.url),entry.images);
}
const images=store.products.flatMap(p=>p.images.map(i=>i.url));
for(let start=0; start<images.length; start+=8) {
  await Promise.all(images.slice(start,start+8).map(async url=>{
    const r=await fetch(`http://localhost:3001${url}`,{method:'HEAD'});
    assert.equal(r.status,200,url);
    assert.match(r.headers.get('content-type'),/image\/webp/,url);
  }));
}
for(const product of [store.products[0],store.products[19],store.products.at(-1)]) {
  const r=await fetch(`http://localhost:3001/perfumes/${product.slug}`);
  assert.equal(r.status,200,product.slug);
}
console.log(`PASS: ${store.products.length} products match screenshot prices, stock and shipping; ${images.length} local images load; product pages respond.`);
