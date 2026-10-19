import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Rebuild only the seven manufacturer galleries researched in inventory B.
// Source JPGs remain untouched; outputs are WebP siblings with matching numbers.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const researchPath = path.join(root, 'catalog/research/inventory-2026-10-18-b.json');
const publicRoot = path.join(root, 'public');
const assetRoot = path.join(publicRoot, 'catalog/2026-10-18');
const reportRoot = path.join(root, 'work/inventory-2026-10-18/asset-qa-b');
const permittedSlugs = new Set([
  'french-avenue-liquid-brun',
  'french-avenue-vulcan-sable',
  'french-avenue-vulcan-baie',
  'french-avenue-vulcan-feu',
  'french-avenue-veneno-scarlet',
  'french-avenue-veneno',
  'lattafa-musamam',
]);
const maximumDimension = 1400;
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

function requireInside(candidate, directory) {
  const relative = path.relative(directory, candidate);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the intended product directory: ${candidate}`);
  }
  return candidate;
}

const research = JSON.parse(await fs.readFile(researchPath, 'utf8'));
if (research.products.length !== permittedSlugs.size) {
  throw new Error('Research B must contain exactly the seven expected products.');
}
const seenSlugs = new Set();
const plans = [];
for (const product of research.products) {
  if (!permittedSlugs.has(product.slug) || seenSlugs.has(product.slug)) {
    throw new Error(`Unexpected or duplicate product: ${product.slug}`);
  }
  seenSlugs.add(product.slug);
  const productDirectory = path.join(assetRoot, product.slug);
  for (const sourceUrl of product.localImages) {
    if (!/^\/catalog\/2026-10-18\/[a-z0-9-]+\/\d{2}\.jpg$/.test(sourceUrl)) {
      throw new Error(`Unexpected original image path: ${sourceUrl}`);
    }
    const source = requireInside(path.resolve(publicRoot, sourceUrl.slice(1)), productDirectory);
    const resolvedSource = await fs.realpath(source);
    requireInside(resolvedSource, productDirectory);
    const destination = requireInside(source.replace(/\.jpg$/i, '.webp'), productDirectory);
    plans.push({ product, sourceUrl, source, destination });
  }
}

await fs.mkdir(reportRoot, { recursive: true });
const results = [];
for (const plan of plans) {
  const original = await fs.readFile(plan.source);
  const metadata = await sharp(original).metadata();
  if (!metadata.width || !metadata.height || metadata.format !== 'jpeg') {
    throw new Error(`Expected a complete JPEG original: ${plan.source}`);
  }

  // A low tolerance removes plain white, while keeping pale glass, reflections,
  // and soft shadows. Reserve up to 4% of the original long edge around content.
  const margin = Math.max(32, Math.round(Math.max(metadata.width, metadata.height) * 0.04));
  const trimmed = await sharp(original)
    .rotate()
    .trim({ background: '#ffffff', threshold: 6, margin })
    .png()
    .toBuffer({ resolveWithObject: true });
  const trimmedAreaRatio = (trimmed.info.width * trimmed.info.height) / (metadata.width * metadata.height);
  if (trimmed.info.width < 120 || trimmed.info.height < 120 || trimmedAreaRatio < 0.1) {
    throw new Error(`Trim requires manual review before use: ${plan.source}`);
  }
  const output = await sharp(trimmed.data)
    .resize({ width: maximumDimension, height: maximumDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, effort: 6, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  await fs.writeFile(plan.destination, output.data);
  results.push({
    slug: plan.product.slug,
    source: plan.sourceUrl,
    optimized: `/${path.relative(publicRoot, plan.destination).split(path.sep).join('/')}`,
    originalDimensions: [metadata.width, metadata.height],
    trimmedDimensions: [trimmed.info.width, trimmed.info.height],
    outputDimensions: [output.info.width, output.info.height],
    trimOffset: [trimmed.info.trimOffsetLeft ?? 0, trimmed.info.trimOffsetTop ?? 0],
    trimMargin: margin,
    removedAreaPercent: Number(((1 - trimmedAreaRatio) * 100).toFixed(2)),
    strongTrim: trimmedAreaRatio < 0.65,
    originalBytes: original.length,
    optimizedBytes: output.data.length,
    originalSha256: sha256(original),
    optimizedSha256: sha256(output.data),
  });
}

// Compact contact sheets exist only for human QA, never in the storefront.
for (const slug of permittedSlugs) {
  const productResults = results.filter((entry) => entry.slug === slug);
  const panels = [];
  const tileWidth = 300;
  const tileHeight = 400;
  for (let index = 0; index < productResults.length; index += 1) {
    const entry = productResults[index];
    const thumbnail = await sharp(path.join(publicRoot, entry.optimized.slice(1)))
      .resize(tileWidth - 24, tileHeight - 50, { fit: 'contain', background: '#ffffff' })
      .png()
      .toBuffer();
    panels.push({ input: thumbnail, left: index * tileWidth + 12, top: 36 });
    const label = Buffer.from(`<svg width="300" height="30"><text x="12" y="22" font-family="sans-serif" font-size="17" fill="#202020">${index + 1} · trim ${entry.removedAreaPercent}%</text></svg>`);
    panels.push({ input: label, left: index * tileWidth, top: 0 });
  }
  await sharp({ create: { width: tileWidth * productResults.length, height: tileHeight, channels: 3, background: '#ffffff' } })
    .composite(panels)
    .jpeg({ quality: 93 })
    .toFile(path.join(reportRoot, `${slug}.jpg`));
}

const summary = {
  products: seenSlugs.size,
  images: results.length,
  uniqueOriginalHashes: new Set(results.map((result) => result.originalSha256)).size,
  uniqueOptimizedHashes: new Set(results.map((result) => result.optimizedSha256)).size,
  originalBytes: results.reduce((total, result) => total + result.originalBytes, 0),
  optimizedBytes: results.reduce((total, result) => total + result.optimizedBytes, 0),
  strongTrimImages: results.filter((result) => result.strongTrim).length,
  maximumDimension,
};
await fs.writeFile(path.join(reportRoot, 'manifest.json'), `${JSON.stringify({ summary, images: results }, null, 2)}\n`);
console.log(JSON.stringify({ ...summary, reportDirectory: reportRoot }, null, 2));
