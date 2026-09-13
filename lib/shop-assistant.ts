import type { Product } from './store-types';
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export type Preferences = {
  query?: string;
  gender?: string;
  scent?: string;
  budget?: number;
};
export function recommend(products: Product[], preferences: Preferences) {
  const terms = normalize(preferences.query || '')
    .split(/\s+/)
    .filter(Boolean);
  return products
    .filter(
      (p) =>
        p.isActive &&
        p.stock > 0 &&
        (preferences.budget === undefined || p.price <= preferences.budget) &&
        (!preferences.gender ||
          normalize(p.gender) === preferences.gender ||
          normalize(p.gender) === 'unisex'),
    )
    .map((p) => {
      const text = normalize(
        `${p.name} ${p.brand} ${p.description || ''} ${p.notesCsv || ''}`,
      );
      const scent = preferences.scent || '';
      const patterns: Record<string, RegExp> = {
        dulce: /vainilla|dulce|caramelo|gourmand/,
        fresco: /fresc|citric|bergamota|acuatic/,
        floral: /floral|rosa|jazmin|flor/,
        amaderado: /madera|amader|oud|cedro|sandalo/,
      };
      return {
        product: p,
        score:
          terms.filter((t) => text.includes(t)).length * 10 +
          (patterns[scent]?.test(text) ? 8 : 0) +
          Number(p.featured),
        match:
          (!terms.length || terms.every((t) => text.includes(t))) &&
          (!scent || patterns[scent]?.test(text)),
      };
    })
    .filter((p) => p.match)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, 4)
    .map((p) => p.product);
}

export const helpText = {
  comprar:
    'Añade los perfumes al carrito, completa tu correo y dirección y crea el pedido. Elige una cuenta bancaria, realiza la transferencia y sube una imagen del comprobante. La tienda verificará el ingreso antes de preparar el envío.',
  pago: 'El pago es por transferencia. Las cuentas disponibles aparecen dentro de tu pedido. Sube un comprobante JPG, PNG o WebP de hasta 2 MB. La captura no confirma automáticamente el pago: la tienda revisa su banco.',
  pedido:
    'Busca en tu correo el mensaje de Perfumes El Padrino con el número de pedido y pulsa «Ver mi pedido y subir comprobante». El enlace privado funciona desde otro dispositivo. Revisa Spam o Promociones si no lo encuentras.',
  envio:
    'Atendemos desde Babahoyo, Ecuador. El costo de envío aparece en cada perfume y en el total del carrito. Al despachar, la tienda registra la transportadora y la guía, que recibirás por correo. Para destinos o plazos especiales, consulta a Jordy.',
};
