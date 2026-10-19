import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const api = process.env.PERFUMES_API_URL ?? 'https://perfumes-el-padrino-api.onrender.com';
const apply = process.argv.includes('--apply');
const review = JSON.parse(await fs.readFile('catalog/inventory-availability-review-2026-10-18.json', 'utf8'));
const initial = JSON.parse(await fs.readFile(review.previousManifest, 'utf8'));
const arrivals = JSON.parse(await fs.readFile(review.previousArrivals, 'utf8'));
const identity = p => `${p.brand}|${p.name}|${p.sizeMl ?? ''}`;
const email = process.env.PERFUMES_ADMIN_EMAIL;
const password = process.env.PERFUMES_ADMIN_PASSWORD;
assert(email && password, 'Set administrative credentials in the process environment.');
async function request(route, options = {}) {
  const response = await fetch(`${api}${route}`, { signal: AbortSignal.timeout(60000), ...options });
  const data = response.status === 204 ? undefined : await response.json();
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${route}: HTTP ${response.status} ${data?.message ?? ''}`);
  return data;
}
const login = await request('/api/admin/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({email,password}) });
const auth = {authorization:`Bearer ${login.token}`, 'content-type':'application/json'};
try {
  const [before, storefront, health] = await Promise.all([
    request('/api/admin/products', {headers:auth}), request('/api/storefront'), request('/health'),
  ]);
  if (apply) assert.equal(health.catalogRevision, initial.date, 'The URL-preserving API must be deployed.');
  const bySlug = new Map(before.map(p => [p.slug,p]));
  const listed = new Set([...initial.existing.map(p => p.slug), ...review.additionalConfirmedAvailable.map(p => p.slug)]);
  for (const arrival of arrivals) {
    const matches = before.filter(p => identity(p) === identity(arrival));
    assert.equal(matches.length,1,`Exact arrival identity: ${arrival.name}`);
    listed.add(matches[0].slug);
  }
  assert.equal(listed.size,89,'Expected 83 initial references plus six newly confirmed models.');
  for (const slug of listed) assert(bySlug.has(slug),`Missing listed product: ${slug}`);
  const absent = initial.unavailableSlugs.filter(slug=>!listed.has(slug));
  assert.deepEqual([...absent].sort(),[...review.unavailableSlugs].sort(),'Cross-check the eight absent models against both inventory cuts.');
  const expected = new Set([...listed,...absent]);
  assert.equal(absent.length,8,'Exactly eight previous references remain absent.');
  assert.equal(before.length,expected.size,'The catalog changed since this inventory review; recheck before writing.');
  assert(before.every(p=>expected.has(p.slug)),'Unknown product; never silently change newly added inventory.');
  assert(before.filter(p=>listed.has(p.slug)).every(p=>p.isActive),'Inactive pictured product requires a separate activation review.');
  assert.equal(review.minimumAvailableStock,1,'One sellable unit is the authorized minimum, not a bulk quantity.');
  assert.equal(review.testReservationBufferAuthorized,true,'Owner must explicitly confirm test reservations.');
  const reservationsFor = p => Math.max(0,p.stock-(storefront.products.find(x=>x.id===p.id)?.stock??p.stock));
  const reserved = before.filter(p=>listed.has(p.slug)&&reservationsFor(p)>0)
    .map(p=>({slug:p.slug,name:p.name,rawStock:p.stock,publicStock:storefront.products.find(x=>x.id===p.id)?.stock??0,reserved:reservationsFor(p)}));
  const changes = before.map(p=>({old:p,target:listed.has(p.slug)?Math.max(p.stock,reservationsFor(p)+review.minimumAvailableStock):0}))
    .filter(change=>change.old.stock!==change.target);
  const fields = ['name','brand','description','gender','sizeMl','price','compareAtPrice','freeShipping','shippingFee','stock','imageUrl','notesCsv','categoryId','featured','bestseller','newUntil','isActive','sortOrder'];
  console.log(JSON.stringify({ mode:apply?'apply':'read-only', confirmedReferences:listed.size, stockCorrections:changes.map(({old,target})=>({slug:old.slug,from:old.stock,to:target})), preservedTestReservations:reserved, catalogObservationsNotChanged:review.catalogObservationsNotChanged },null,2));
  const directory = path.join('work/catalog-backups',`availability-review-${Date.now()}`);
  await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,'before-products.json'),JSON.stringify(before,null,2));
  if (apply) {
    for (const {old,target} of changes) {
      // Owner requested stock only: keep names, volumes, pricing, galleries and orders intact.
      const payload = { ...Object.fromEntries(fields.map(key=>[key,old[key]??null])),stock:target,originalStock:old.stock,
        images:old.images.map(({url,altText})=>({url,altText})) };
      const saved = await request(`/api/admin/products/${old.id}`,{method:'PUT',headers:auth,body:JSON.stringify(payload)});
      assert.equal(saved.slug,old.slug,'Published URL must not change');
      assert.equal(saved.stock,target,'Adjusted raw stock');
      assert.equal(saved.price,old.price,'Preserve price');
      assert.deepEqual(saved.images.map(i=>i.url),old.images.map(i=>i.url),'Preserve gallery');
      console.log(`Restored availability: ${old.brand} ${old.name} — ${saved.slug}`);
    }
  }
  const [after, current] = await Promise.all([request('/api/admin/products',{headers:auth}),request('/api/storefront')]);
  for (const old of before) {
    const saved = after.find(p=>p.id===old.id);
    assert(saved && saved.slug===old.slug,`Product/URL preserved: ${old.slug}`);
    for(const field of fields.filter(field=>field!=='stock')) assert.deepEqual(saved[field]??null,old[field]??null,`Non-stock field preserved: ${old.slug}/${field}`);
    assert.deepEqual(saved.images,old.images,`Gallery preserved: ${old.slug}`);
    if (!apply || !changes.some(change=>change.old.id===old.id)) assert.equal(saved.stock,old.stock,`Unrelated stock preserved: ${old.slug}`);
  }
  const unavailableListed = current.products.filter(p=>listed.has(p.slug)&&p.stock===0).map(p=>({slug:p.slug,name:p.name,rawStock:after.find(x=>x.id===p.id)?.stock??0}));
  const report = { checkedAt:new Date().toISOString(), applied:apply, corrections:apply?changes.map(change=>change.old.slug):[], confirmedReferences:listed.size,
    listedAvailable:current.products.filter(p=>listed.has(p.slug)&&p.stock>0).length, unavailableListed,
    outsideConfirmedInventory:current.products.filter(p=>!listed.has(p.slug)).map(p=>({slug:p.slug,stock:p.stock})),
    catalogObservationsNotChanged:review.catalogObservationsNotChanged };
  if(apply) {
    assert.equal(unavailableListed.length,0,'Every pictured reference must be available publicly');
    assert(report.outsideConfirmedInventory.every(p=>p.stock===0),'Every absent reference must remain unavailable');
  }
  await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
  const csvCell = value => `"${String(value??'').replace(/"/g,'""')}"`;
  const csvRows = [['Marca','Perfume','Presentación ml','Precio USD','Stock administrativo','Reservas de prueba','Disponible para compra','Estado','URL']];
  for(const p of [...after].sort((a,b)=>`${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`))) {
    const available = current.products.find(x=>x.id===p.id)?.stock??0;
    csvRows.push([p.brand,p.name,p.sizeMl??'No especificada',p.price,p.stock,Math.max(0,p.stock-available),available,available>0?'Disponible':'Agotado',`https://perfumes-el-padrino.vercel.app/perfumes/${p.slug}`]);
  }
  await fs.mkdir('work/inventory-2026-10-18',{recursive:true});
  await fs.writeFile('work/inventory-2026-10-18/availability-review.csv','\uFEFF'+csvRows.map(row=>row.map(csvCell).join(';')).join('\r\n'));
  console.log(JSON.stringify(report,null,2));
} finally { await request('/api/admin/logout',{method:'POST',headers:auth}).catch(()=>{}); }
