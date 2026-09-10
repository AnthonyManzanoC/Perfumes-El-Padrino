import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'Perfumes El Padrino · by Jordy Tamayo', short_name: 'El Padrino',
    description: 'Tu esencia. Tu legado. Perfumes originales by Jordy Tamayo.',
    lang: 'es', start_url: '/', scope: '/', display: 'standalone',
    background_color: '#11100d', theme_color: '#11100d',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
