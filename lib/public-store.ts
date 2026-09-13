import { cache } from 'react';
import { getBackendUrl } from './backend-url.mjs';
import type { StorefrontData } from './store-types';

// Only the public catalog is cached. Checkout always verifies current prices and inventory.
export const getPublicStore = cache(async (): Promise<StorefrontData> => {
  const response = await fetch(`${getBackendUrl()}/api/storefront`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
  return response.json();
});
