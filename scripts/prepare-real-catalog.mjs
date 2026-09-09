import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Explicit mapping follows screenshot order; never fuzzy-match similarly named flankers.
const mapping = [
 ['designers',16], ['designers',0], ['designers',1], ['arabic',0], ['arabic',1], ['arabic',2],
 ['designers',2], ['designers',3], ['designers',4], ['designers',5], ['designers',6], ['designers',7],
 ['designers',8], ['designers',9], ['designers',10], ['designers',14],
 ['arabic',3], ['arabic',4], ['arabic',5], ['arabic',6], ['arabic',7], ['arabic',8], ['arabic',9],
 ['arabic',10], ['arabic',11], ['arabic',12], ['designers',11], ['designers',13], ['designers',15], ['designers',12],
 ['arabic',21], ['arabic',13], ['arabic',14], ['arabic',15], ['arabic',16], ['arabic',17], ['arabic',18], ['arabic',19], ['arabic',20],
 ['women',0], ['women',1], ['women',2], ['women',3], ['women',4], ['women',5], ['women',6], ['women',7], ['women',8],
 ['women',9], ['women',10], ['women',11], ['women',12], ['women',13], ['women',14], ['women',15], ['women',16],
 ['women',17], ['women',18], ['women',19], ['women',20], ['women',21], ['women',22], ['women',23], ['women',24], ['women',25], ['women',26], ['women',27]
];
const root = process.cwd();
const manifests = {};
for (const group of ['designers','arabic','women']) {
  manifests[group] = JSON.parse(await fs.readFile(path.join(process.env.TEMP, `padrino-assets-${group}`, 'manifest.json'), 'utf8'));
}
const lines = (await fs.readFile('catalog/current-products.tsv', 'utf8')).trim().split(/\r?\n/);
const keys = lines.shift().split('\t');
const rows = lines.map(line => Object.fromEntries(line.split('\t').map((value,i) => [keys[i],value])));
if (rows.length !== 67 || mapping.length !== rows.length) throw Error('Catalog mapping is incomplete');
const catalog = [], provenance = [];
for (const [index,row] of rows.entries()) {
  const [group, assetIndex] = mapping[index];
  const asset = manifests[group][assetIndex];
  if (!asset || !asset.localPaths || asset.localPaths.length < 3) throw Error(`Missing gallery: ${row.name}`);
  const slug = `${row.brand}-${row.name}`.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const folder = path.join(root,'public','catalog',slug);
  await fs.mkdir(folder,{recursive:true});
  const images = [], sources = [], hashes = new Set();
  for (const [imageIndex,source] of asset.localPaths.slice(0,4).entries()) {
    const bytes = await fs.readFile(source);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(hash)) continue;
    hashes.add(hash);
    const target = `${images.length+1}.webp`;
    await sharp(bytes).rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(path.join(folder,target));
    images.push(`/catalog/${slug}/${target}`);
    sources.push({localImage:images.at(-1),sourceImage:asset.imageUrls?.[imageIndex],sha256:hash});
  }
  if(images.length < 3) throw Error(`Less than 3 distinct photos: ${row.name}`);
  const size = row.ml ? Number(row.ml) : null;
  const description = `${row.name} de ${row.brand}.${size ? ` Presentación de ${size} ml.` : ''} ${asset.descriptionEs ?? 'Consulta con nosotros para conocer más sobre esta fragancia y elegir tu próxima esencia.'}`;
  catalog.push({name:row.name,brand:row.brand,gender:row.gender,sizeMl:size,price:Number(row.price),compareAtPrice:row.before ? Number(row.before) : null,category:row.category,description,images});
  provenance.push({name:row.name,brand:row.brand,matchedAsset:asset.name,sourcePage:asset.sourcePage,sourcePages:asset.sourcePages,variant:asset.exactVariant ?? asset.inferredExactVariant,uncertainties:asset.uncertainties,reuseInfo:asset.reuseInfo,images:sources});
}
await fs.writeFile('catalog/real-catalog.json',JSON.stringify(catalog,null,2)+'\n');
await fs.writeFile('catalog/image-sources.json',JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({products:catalog.length,photos:catalog.reduce((n,p)=>n+p.images.length,0)}));
