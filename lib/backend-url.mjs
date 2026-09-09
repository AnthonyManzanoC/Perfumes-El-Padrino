// Only the public address of the C# service belongs here, never DB credentials.
export function getBackendUrl(env = process.env) {
  const configured = env.API_URL || env.NEXT_PUBLIC_API_URL;
  const fallback = env.NODE_ENV === 'production'
    ? 'https://perfumes-el-padrino-api.onrender.com'
    : 'http://localhost:5190';
  const url = new URL(configured || fallback);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error('API_URL debe ser la URL HTTP(S) de la API C#, sin credenciales.');
  if (env.VERCEL && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    throw new Error('En Vercel, API_URL debe apuntar a la API pública HTTPS de Render, no a localhost.');
  return url.href.replace(/\/+$/, '');
}
