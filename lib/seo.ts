export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  'https://perfumes-el-padrino.vercel.app'
).replace(/\/$/, '');
export const absoluteUrl = (path: string) => new URL(path, siteUrl).href;
export const jsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');
