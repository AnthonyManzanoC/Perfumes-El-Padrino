import type { CartEntry, Product } from '@/lib/store-types';

export const cartStorageKey = 'el-padrino-cart-v1';

export function readCart(): CartEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(cartStorageKey) ?? '[]');
    return Array.isArray(value) ? (value as CartEntry[]) : [];
  } catch {
    return [];
  }
}

export function addProductToStoredCart(product: Product, quantity = 1) {
  const current = readCart();
  const existing = current.find((item) => item.productId === product.id);
  const next = existing
    ? current.map((item) =>
        item.productId === product.id
          ? {
              ...item,
              quantity: Math.min(item.quantity + quantity, product.stock),
            }
          : item,
      )
    : [
        ...current,
        { productId: product.id, quantity: Math.min(quantity, product.stock) },
      ];
  localStorage.setItem(cartStorageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('el-padrino-cart-updated'));
  return next;
}
