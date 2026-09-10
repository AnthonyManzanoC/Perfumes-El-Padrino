import type { NextConfig } from 'next';
import { getBackendUrl } from './lib/backend-url.mjs';

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/sw.js', headers: [
      { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      { key: 'Service-Worker-Allowed', value: '/' },
    ] }];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${getBackendUrl()}/api/:path*` }];
  },
};

export default nextConfig;
