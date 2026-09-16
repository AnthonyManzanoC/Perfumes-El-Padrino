import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const warmWhite = { r: 248, g: 247, b: 243, alpha: 1 };
const actualPhotos = [
  ['emporio-armani-stronger-with-you-intensely-100ml', 'codex-clipboard-0931f930-89cb-4fb6-90bd-8ac373852929.png'],
  ['rabanne-invictus-eau-de-toilette-50ml', 'codex-clipboard-ee42937f-94a4-4135-967d-5444bf707d80.png'],
  ['creed-silver-mountain-water-50ml', 'codex-clipboard-af51251e-479b-4c3c-80c1-301c6d8ad158.png'],
  ['creed-aventus-50ml', 'codex-clipboard-2cd21c7d-f45f-42a7-9fbf-7706e0d8477b.png'],
  ['giorgio-armani-code-edt-75ml', 'codex-clipboard-81a2b31e-e480-4d54-a833-a33306a2fe26.png'],
  ['valentino-uomo-born-in-roma-50ml', 'codex-clipboard-71b4da03-311e-49a2-a7c3-c0e9e1bfa263.png'],
];

async function polished(source, target) {
  await sharp(source)
    .rotate()
    .resize(1400, 1400, { fit: 'contain', background: warmWhite, withoutEnlargement: false })
    .flatten({ background: warmWhite })
    .webp({ quality: 90 })
    .toFile(target);
}

for (const [folder, photo] of actualPhotos) {
  const dir = path.join(root, 'public', 'catalog', folder);
  await fs.mkdir(dir, { recursive: true });
  await polished(path.join(process.env.TEMP, photo), path.join(dir, '2.webp'));
}

// Give the 50 ml Invictus listing its own hero/gallery instead of sharing the 100 ml folder.
const invictusDir = path.join(root, 'public', 'catalog', 'rabanne-invictus-eau-de-toilette-50ml');
await polished(path.join(root, 'public', 'catalog', 'rabanne-invictus', '4.webp'), path.join(invictusDir, '1.webp'));

const primaryFolders = [
  'emporio-armani-stronger-with-you-intensely-100ml',
  'creed-silver-mountain-water-50ml',
  'creed-aventus-50ml',
  'giorgio-armani-code-edt-75ml',
  'valentino-uomo-born-in-roma-50ml',
  'burberry-her-eau-de-parfum-50ml',
];
for (const folder of primaryFolders) {
  const dir = path.join(root, 'public', 'catalog', folder);
  const source = (await fs.readdir(dir)).find((file) => /^1\.(?:png|jpe?g)$/i.test(file));
  if (!source) throw new Error(`Expected downloaded primary image for ${folder}`);
  await polished(path.join(dir, source), path.join(dir, '1.webp'));
}

console.log('Prepared 7 polished hero images and 6 real-stock gallery photos.');
