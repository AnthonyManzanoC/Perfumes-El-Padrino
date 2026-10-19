import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const files = ['a', 'b', 'c'];
const all = [];
await fs.mkdir('work/inventory-2026-10-18/contact-sheets', { recursive: true });
for (const file of files) {
  const data = JSON.parse(await fs.readFile(`catalog/research/inventory-2026-10-18-${file}.json`, 'utf8'));
  for (const product of Array.isArray(data) ? data : data.products) {
    let images;
    if (file === 'a') images = product.images.filter((url, index) => !(product.slug === 'armaf-club-de-nuit-iconic-105ml' && index === 2));
    if (file === 'b') images = product.localImages.map(url => url.replace(/\.jpg$/, '.webp'));
    if (file === 'c') {
      images = [];
      for (const [index, sourceUrl] of product.images.entries()) {
        const extension = path.extname(new URL(sourceUrl).pathname);
        const source = `public/catalog/2026-10-18/${product.slug}/${index + 1}${extension}`;
        const target = `/catalog/2026-10-18/${product.slug}/${index + 1}.webp`;
        await sharp(source).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, effort: 5 }).toFile(path.join('public', target));
        images.push(target);
      }
    }
    const entry = {
      name: product.name, brand: product.brand, slug: product.slug, gender: product.gender,
      sizeMl: product.sizeMl ?? Number.parseInt(product.size, 10),
      price: product.price, compareAtPrice: product.compareAtPrice ?? null,
      category: product.category ?? 'Árabes', description: product.description,
      notesCsv: product.notesCsv ?? [...new Set(Object.values(product.notes ?? {}).flat())].join(', '),
      imageUrl: images[0], images,
      sources: product.sourceUrls ?? product.sources ?? [product.sourcePage, product.notesSource].filter(Boolean),
      editorialCaution: product.ambiguities ?? product.ambiguityFlags ?? (product.uncertainties ? [product.uncertainties] : []),
    };
    all.push(entry);
    const panels = [];
    for (const [index, image] of images.entries()) {
      const thumb = await sharp(path.join(root, 'public', image)).resize(280, 330, { fit: 'contain', background: '#f5f2eb' }).png().toBuffer();
      panels.push({ input: thumb, left: index * 300 + 10, top: 40 });
    }
    const safeName = `${entry.brand} ${entry.name}`.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    panels.push({ input: Buffer.from(`<svg width="${images.length * 300}" height="30"><text x="10" y="22" font-family="sans-serif" font-size="17">${safeName}</text></svg>`), left: 0, top: 0 });
    await sharp({ create: { width: images.length * 300, height: 390, channels: 3, background: '#f5f2eb' } }).composite(panels).jpeg({ quality: 90 }).toFile(`work/inventory-2026-10-18/contact-sheets/${entry.slug}.jpg`);
  }
}
await fs.writeFile('catalog/new-arrivals-2026-10-18.json', JSON.stringify(all, null, 2) + '\n');
console.log(JSON.stringify({ products: all.length, images: all.reduce((sum, p) => sum + p.images.length, 0) }));
