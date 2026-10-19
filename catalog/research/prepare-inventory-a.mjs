import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const sourceFile = path.resolve('catalog/research/inventory-2026-10-18-a.json');
const products = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
for (const product of products) {
  const folder = path.resolve('public/catalog/2026-10-18', product.slug);
  await fs.mkdir(folder, { recursive: true });
  product.images = [];
  product.assetErrors = [];
  for (let i = 0; i < product.sourceImages.length; i++) {
    const url = product.sourceImages[i];
    try {
      const bytes = execFileSync('curl.exe', ['-fsSL', '--retry', '1', '--max-time', '30', url], { maxBuffer: 20 * 1024 * 1024 });
      const metadata = await sharp(bytes).metadata();
      if (!metadata.width || !metadata.height || metadata.width < 200 || metadata.height < 200) throw new Error('Image below minimum dimensions');
      const name = `${i + 1}.webp`;
      await sharp(bytes).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(folder, name));
      product.images.push(`/catalog/2026-10-18/${product.slug}/${name}`);
      console.log(`${product.slug}/${name}: ${metadata.width}x${metadata.height}`);
    } catch (error) {
      product.assetErrors.push({ url, error: error.message });
      console.log(`FAILED ${product.slug}/${i + 1}: ${error.message}`);
    }
  }
  product.imageUrl = product.images[0] ?? null;
}
await fs.writeFile(sourceFile, `${JSON.stringify(products, null, 2)}\n`);
