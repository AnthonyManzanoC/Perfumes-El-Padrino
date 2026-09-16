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

async function fetchAndPolish(source, target) {
  const response = await fetch(source, { headers: { 'user-agent': 'PerfumesElPadrinoCatalog/1.0' } });
  if (!response.ok) throw new Error(`Could not download ${source}: ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error(`Expected an image from ${source}, received ${contentType || 'unknown content'}`);
  await sharp(Buffer.from(await response.arrayBuffer()))
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
  if (source) {
    await polished(path.join(dir, source), path.join(dir, '1.webp'));
  } else {
    await fs.access(path.join(dir, '1.webp'));
  }
}

const productViews = [
  ['emporio-armani-stronger-with-you-intensely-100ml',
    'https://f.nooncdn.com/p/pzsku/Z055C3565FF19E8950CA8Z/45/_/1779345580/d0404b69-2ab4-4487-afb6-1e3a76cfd1ba.jpg',
    'https://f.nooncdn.com/p/pzsku/Z055C3565FF19E8950CA8Z/45/_/1779345580/689a4c53-f053-4249-b5b1-9d97cc839999.jpg'],
  ['rabanne-invictus-eau-de-toilette-50ml',
    'https://cdn.shopify.com/s/files/1/0743/0891/1392/files/181865-paco-rabanne-invictus-eau-de-toilette-vaporisateur-50-ml-1000x1000.jpg?v=1741283849',
    'https://perfumemarket.fi/cdn/shop/files/3349668515660.png?v=1781160905'],
  ['creed-silver-mountain-water-50ml',
    'https://cdn.shopify.com/s/files/1/0844/3861/4342/files/CREED0013-1.png?v=1751897612',
    'https://cdn.shopify.com/s/files/1/0844/3861/4342/files/CREED0013-2.png?v=1751897612'],
  ['creed-aventus-50ml',
    'https://www.creedfragrances.co.uk/cdn/shop/files/Aventus_50ml_Mobile_2.jpg?v=1788439970&width=1500',
    'https://www.creedfragrances.co.uk/cdn/shop/files/av-btf-1.jpg?v=1779173336&width=1500'],
  ['giorgio-armani-code-edt-75ml',
    'https://cdn.notinoimg.com/detail_main_hq/armani/3614273636568_03/code___230209.jpg',
    'https://www.giorgioarmanibeauty-usa.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-gab-master-catalog/default/dw1a68d780/products/A020-2023/code%20edt%20refill%20visual%20LD424200,%20LD424000m%20LD423500,%20LD423300.jpg?sw=1442&sh=1442&sm=cut&sfrm=jpg&q=85'],
  ['valentino-uomo-born-in-roma-50ml',
    'https://www.valentino-beauty.us/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-valentino-master-catalog/default/dw3e50ada0/images/pdp/MPL00475/alt1.webp?sw=1440&sh=1440&sm=cut&sfrm=jpg&q=70',
    'https://www.valentino-beauty.us/on/demandware.static/-/Sites-valentino-master-catalog/default/dw6483775c/images/pdp/MPL00475/Uomo%20Born%20in%20Roma%20EDT%20Notes%20Tab%20Desktop.jpg'],
  ['burberry-her-eau-de-parfum-50ml',
    'https://assets.burberry.com/is/image/Burberryltd/B306366F-8387-4231-A0E9-7E3DE5094AD9?$BBY_V3_SL_1$&wid=1600&hei=1600',
    'https://assets.burberry.com/is/image/Burberryltd/170DBE43-9B00-40B1-A766-F1482E6F263D?$BBY_V3_SL_1$&wid=1600&hei=1600'],
];

for (const [folder, thirdView, fourthView] of productViews) {
  const dir = path.join(root, 'public', 'catalog', folder);
  await fetchAndPolish(thirdView, path.join(dir, '3.webp'));
  await fetchAndPolish(fourthView, path.join(dir, '4.webp'));
}

console.log('Prepared seven four-photo galleries with hero, real stock, and verified product views.');
