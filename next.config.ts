import type { NextConfig } from 'next';
import { getBackendUrl } from './lib/backend-url.mjs';

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${getBackendUrl()}/api/:path*` }];
  },
};

export default nextConfig;
