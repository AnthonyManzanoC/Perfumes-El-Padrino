import type { NextConfig } from 'next';
import { getBackendUrl } from './lib/backend-url.mjs';

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async headers() {
    return [{ source: '/sw.js', headers: [
      { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      { key: 'Service-Worker-Allowed', value: '/' },
    ] }];
  },
  async rewrites() {
    const backend = getBackendUrl();
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/despacho-rapido/:path*', destination: `${backend}/despacho-rapido/:path*` },
    ];
  },
};

export default nextConfig;
