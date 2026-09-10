'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';

import { addProductToStoredCart } from '@/lib/cart';
import type { Product, SiteSettings } from '@/lib/store-types';

function money(value: number, currency: string) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(
    value,
  );
}

export function ProductDetail({
  product,
  settings,
  related,
}: {
  product: Product;
  settings: SiteSettings;
  related: Product[];
}) {
  const gallery = useMemo(
    () =>
      product.images?.length
        ? product.images.map((image) => image.url)
        : [product.imageUrl],
    [product],
  );
  const [activeImage, setActiveImage] = useState(gallery[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  const theme = {
    '--brand-primary': settings.primaryColor,
    '--brand-accent': settings.accentColor,
    '--brand-background': settings.backgroundColor,
  } as CSSProperties;
  const whatsappUrl = `https://wa.me/${settings.whatsAppNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vengo de la web de ${settings.storeName}. Quiero información sobre ${product.name} de ${product.brand}.`)}`;

  const addToCart = () => {
    if (product.stock <= 0) return;
    addProductToStoredCart(product, quantity);
    setAdded(true);
  };

  return (
    <main
      style={theme}
      className="min-h-screen bg-[var(--brand-background)] text-[#171611]"
    >
      <div className="bg-[var(--brand-primary)] px-5 py-2.5 text-center text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand-accent)]">
        {settings.announcement}
      </div>
      <header className="sticky top-0 z-40 border-b border-black/8 bg-[var(--brand-background)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-9 lg:px-14">
          <a href="/" className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={`Logo de ${settings.storeName}`}
                className="size-10 rounded-full border border-black/10 object-cover"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-black font-heading text-xl text-[var(--brand-accent)]">
                P
              </span>
            )}
            <span className="font-heading text-base font-semibold tracking-[.12em] sm:text-lg">
              {settings.storeName.toUpperCase()}
              <span className="block font-heading text-xs font-normal italic leading-4 tracking-normal opacity-80">by Jordy Tamayo</span>
            </span>
          </a>
          <nav className="flex items-center gap-2">
            <a
              href="/#catalogo"
              className="hidden rounded-full border border-black/10 px-5 py-2.5 text-xs font-bold sm:flex"
            >
              Ver colección
            </a>
            <a
              href="/?cart=1"
              className="grid size-11 place-items-center rounded-full bg-black text-white"
              aria-label="Abrir mi selección"
            >
              <ShoppingBag className="size-4" />
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-7 sm:px-9 lg:px-14">
        <nav className="mb-7 flex flex-wrap items-center gap-2 text-xs text-black/45">
          <a href="/" className="hover:text-black">
            Inicio
          </a>
          <ChevronRight className="size-3" />
          <a href="/#catalogo" className="hover:text-black">
            Catálogo
          </a>
          <ChevronRight className="size-3" />
          <span className="text-black/75">{product.name}</span>
        </nav>

        <section className="grid overflow-hidden rounded-[2rem] border border-black/7 bg-white shadow-[0_28px_90px_rgba(31,25,14,.1)] lg:grid-cols-[1.08fr_.92fr]">
          <div
            className={`grid min-h-[520px] bg-[#e9e2d5] lg:min-h-[720px] ${gallery.length > 1 ? 'sm:grid-cols-[92px_1fr]' : ''}`}
          >
            {gallery.length > 1 && (
              <div className="order-2 flex gap-3 overflow-x-auto border-t border-black/8 p-4 sm:order-1 sm:flex-col sm:border-r sm:border-t-0">
                {gallery.map((url, index) => (
                  <button
                    key={`${url.slice(0, 42)}-${index}`}
                    onClick={() => setActiveImage(url)}
                    className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition sm:size-[60px] ${activeImage === url ? 'border-black' : 'border-transparent opacity-65 hover:opacity-100'}`}
                    aria-label={`Ver foto ${index + 1} de ${product.name}`}
                  >
                    <img
                      className="h-full w-full object-cover"
                      src={url}
                      alt={`${product.name}, foto ${index + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="relative order-1 min-h-[430px] overflow-hidden sm:order-2 sm:min-h-0">
              <img
                key={activeImage}
                src={activeImage}
                alt={product.name}
                className="absolute inset-0 h-full w-full bg-white object-contain p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
              />
              <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                {product.bestseller && (
                  <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.15em] shadow">
                    Más vendido
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-full bg-[#7c201b] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.15em] text-white shadow">
                    Ahorra {discount}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center p-7 sm:p-11 lg:p-14">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#8a6c29]">
              {product.brand} · {product.categoryName ?? 'Colección El Padrino'}
            </p>
            <h1 className="mt-4 font-heading text-5xl font-semibold leading-[.92] sm:text-7xl">
              {product.name}
            </h1>
            <p className="mt-4 text-sm text-black/48">
              {product.sizeMl
                ? `${product.sizeMl} ml`
                : 'Presentación original'}{' '}
              · {product.gender}
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-3">
              <strong className="font-heading text-4xl">
                {money(product.price, settings.currency)}
              </strong>
              {product.compareAtPrice && (
                <span className="pb-1 text-base text-black/35 line-through">
                  {money(product.compareAtPrice, settings.currency)}
                </span>
              )}
            </div>

            <div
              className={`mt-4 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${product.freeShipping ? 'bg-green-50 text-green-700' : 'bg-[#efe5ca] text-[#76591e]'}`}
            >
              <Truck className="size-4" />
              {product.freeShipping
                ? 'Envío gratis'
                : `Envío con costo: + ${money(product.shippingFee ?? 0, settings.currency)}`}
            </div>

            <h2 className="mt-7 font-heading text-2xl font-semibold">Así huele</h2>
            <p className="mt-3 text-base leading-7 text-black/65">
              {product.description ||
                `Una fragancia original de ${product.brand}, seleccionada por ${settings.storeName}.`}
            </p>

            {product.notesCsv && (
              <div className="mt-7">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-black/40">
                  Notas olfativas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.notesCsv.split(',').map((note) => (
                    <span
                      key={note}
                      className="rounded-full bg-black/5 px-4 py-2 text-xs capitalize"
                    >
                      {note.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center gap-2 text-xs text-black/55">
              <Check className="size-4 text-green-700" />
              {product.stock > 0
                ? `${product.stock} unidades disponibles`
                : 'Temporalmente agotado'}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[120px_1fr]">
              <div className="flex h-13 items-center justify-between rounded-full border border-black/12 px-3">
                <button
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="grid size-8 place-items-center"
                  aria-label="Reducir cantidad"
                >
                  <Minus className="size-4" />
                </button>
                <strong>{quantity}</strong>
                <button
                  onClick={() =>
                    setQuantity((value) => Math.min(product.stock, value + 1))
                  }
                  className="grid size-8 place-items-center"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                disabled={product.stock === 0}
                onClick={addToCart}
                className="flex h-13 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-bold text-white transition hover:bg-[#8a6c29] disabled:cursor-not-allowed disabled:bg-black/20"
              >
                {added ? (
                  <Check className="size-4" />
                ) : (
                  <ShoppingBag className="size-4" />
                )}
                {added ? 'Añadido al carrito' : 'Añadir al carrito'}
              </button>
            </div>
            {added && (
              <button
                onClick={() => window.location.assign('/?cart=1')}
                className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand-accent)] text-sm font-bold text-black"
              >
                Ir al carrito y comprar{' '}
                <ChevronRight className="size-4" />
              </button>
            )}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-black/55 hover:text-black"
            >
              <MessageCircle className="size-4 text-green-700" /> Preguntar por
              este perfume
            </a>

            <div className="mt-9 grid grid-cols-3 gap-2 border-t border-black/8 pt-7">
              {[
                [ShieldCheck, 'Original', 'Autenticidad'],
                [Truck, 'Nacional', 'Envíos'],
                [PackageCheck, 'Cercano', 'Seguimiento'],
              ].map(([Icon, title, text]) => (
                <div key={String(title)} className="text-center">
                  <Icon className="mx-auto size-5 text-[#8a6c29]" />
                  <p className="mt-2 text-[10px] font-bold">{String(title)}</p>
                  <p className="text-[9px] text-black/38">{String(text)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8a6c29]">
                También te puede enamorar
              </p>
              <h2 className="mt-3 font-heading text-4xl font-semibold sm:text-5xl">
                Continúa descubriendo
              </h2>
            </div>
            <a
              href="/#catalogo"
              className="hidden items-center gap-2 text-xs font-bold sm:flex"
            >
              Toda la colección <ChevronRight className="size-4" />
            </a>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <a
                href={`/perfumes/${item.slug}`}
                key={item.id}
                className="group overflow-hidden rounded-[1.4rem] bg-white shadow-sm"
              >
                <div className="aspect-[4/4.2] overflow-hidden bg-[#e9e2d5]">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#8a6c29]">
                    {item.brand}
                  </p>
                  <h3 className="mt-1 font-heading text-2xl font-semibold">
                    {item.name}
                  </h3>
                  <p className="mt-3 text-sm font-bold">
                    {money(item.price, settings.currency)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <a
          href="/#catalogo"
          className="inline-flex items-center gap-2 text-xs font-bold text-black/55 hover:text-black"
        >
          <ArrowLeft className="size-4" /> Volver al catálogo
        </a>
      </div>

      <footer className="bg-[var(--brand-primary)] px-5 py-10 text-white sm:px-9 lg:px-14">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-[var(--brand-accent)]" />
            <span className="font-heading text-xl">{settings.storeName}<span className="block font-heading text-xs font-normal italic leading-4 tracking-normal opacity-80">by Jordy Tamayo</span></span>
          </div>
          <p className="text-xs text-white/40">{settings.deliveryText}</p>
        </div>
      </footer>
    </main>
  );
}
