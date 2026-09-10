'use client';

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Camera as Instagram,
  LoaderCircle,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Truck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CheckoutForm } from '@/components/checkout-form';
import { apiFetch } from '@/lib/api';
import { cartStorageKey, readCart } from '@/lib/cart';
import type {
  CartEntry,
  Product,
  SiteSettings,
  StorefrontData,
} from '@/lib/store-types';

function money(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(
    value,
  );
}

function BrandMark({
  settings,
  dark = false,
}: {
  settings: SiteSettings;
  dark?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      {settings.logoUrl ? (
        <img
          className="size-11 rounded-full border border-[var(--brand-accent)]/40 object-cover"
          src={settings.logoUrl}
          alt={`Logo de ${settings.storeName}`}
        />
      ) : (
        <span
          className={`grid size-11 place-items-center rounded-full border font-heading text-xl font-semibold ${dark ? 'border-black/20 bg-black text-[#e3c87f]' : 'border-white/20 bg-black/30 text-[var(--brand-accent)]'}`}
        >
          P
        </span>
      )}
      <span
        className={`max-w-[7rem] font-heading text-xs font-semibold leading-5 tracking-[0.1em] sm:max-w-none sm:text-lg ${dark ? 'text-[#171611]' : 'text-white'}`}
      >
        {settings.storeName.toUpperCase()}
              <span className="block font-heading text-xs font-normal italic leading-4 tracking-normal opacity-80">by Jordy Tamayo</span>
      </span>
    </span>
  );
}

function ProductCard({
  product,
  currency,
  onAdd,
}: {
  product: Product;
  currency: string;
  onAdd: (product: Product) => void;
}) {
  const soldOut = product.stock === 0;
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  return (
    <article className="group min-w-0 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_1px_0_rgba(23,22,17,.04)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(47,37,16,.11)]">
      <a
        href={`/perfumes/${product.slug}`}
        className="relative block aspect-[4/4.4] w-full overflow-hidden bg-[#e9e2d5] text-left"
        aria-label={`Ver detalles de ${product.name}`}
      >
        <img
          alt={product.name}
          className="h-full w-full object-contain bg-white p-4 transition duration-700 group-hover:scale-[1.045]"
          loading="lazy"
          src={product.imageUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.bestseller && (
            <span className="rounded-full bg-white/92 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-black backdrop-blur">
              Más vendido
            </span>
          )}
          {product.compareAtPrice && (
            <span className="rounded-full bg-[#7c201b] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
              Oferta · -{discount}%
            </span>
          )}
        </div>
        {product.stock > 0 && product.stock <= 3 && (
          <span className="absolute bottom-4 left-4 rounded-full bg-black/75 px-3 py-1.5 text-[10px] font-medium text-white backdrop-blur">
            Solo quedan {product.stock}
          </span>
        )}
      </a>
      <div className="p-5">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6c29]">
              {product.brand}
            </p>
            <a
              href={`/perfumes/${product.slug}`}
              className="block max-w-full truncate text-left font-heading text-[1.35rem] font-semibold leading-tight hover:text-[#8a6c29]"
            >
              {product.name}
            </a>
            <p className="mt-1.5 text-sm text-black/48">
              {product.sizeMl
                ? `${product.sizeMl} ml`
                : 'Presentación original'}{' '}
              · {product.gender}
            </p>
          </div>
          <button
            disabled={soldOut}
            onClick={() => onAdd(product)}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-[#171611] text-white transition hover:scale-105 hover:bg-[#8a6c29] disabled:cursor-not-allowed disabled:bg-black/15"
            aria-label={`Añadir ${product.name} al carrito`}
          >
            {soldOut ? (
              <span className="text-[9px] uppercase">Agotado</span>
            ) : (
              <Plus className="size-4" />
            )}
          </button>
        </div>
        {product.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-black/65">{product.description}</p>}
        {product.notesCsv && <p className="mt-3 text-sm text-[#80601f]">{product.notesCsv.split(',').slice(0, 3).join(' · ')}</p>}
        <button disabled={soldOut} onClick={() => onAdd(product)} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/15 px-4 text-sm font-semibold transition hover:bg-[#171611] hover:text-white disabled:opacity-40"><ShoppingBag className="size-4" />{soldOut ? 'Agotado' : 'Añadir al carrito'}</button>
        <div className="mt-4 flex items-baseline gap-2 border-t border-black/7 pt-4">
          <span className="font-semibold">
            {money(product.price, currency)}
          </span>
          {product.compareAtPrice && (
            <span className="text-sm text-black/38 line-through">
              {money(product.compareAtPrice, currency)}
            </span>
          )}
        </div>
        <p
          className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold ${product.freeShipping ? 'text-green-700' : 'text-[#8a6c29]'}`}
        >
          <Truck className="size-3.5" />
          {product.freeShipping
            ? 'Envío gratis'
            : `Envío: + ${money(product.shippingFee ?? 0, currency)}`}
        </p>
      </div>
    </article>
  );
}

export function Storefront() {
  const [data, setData] = useState<StorefrontData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');

  const loadStore = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setData(await apiFetch<StorefrontData>('/api/storefront'));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'No pudimos cargar la tienda.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStore();
  }, []);
  useEffect(() => {
    let updating = false;
    const controller = new AbortController();
    const timer = window.setInterval(async () => {
      if (updating || document.visibilityState !== 'visible') return;
      updating = true;
      try {
        const latest = await apiFetch<StorefrontData>('/api/storefront', { cache: 'no-store', signal: controller.signal });
        setData(latest);
      } catch { /* Keep the last usable catalog during a temporary connection failure. */ }
      finally { updating = false; }
    }, 15000);
    return () => { clearInterval(timer); controller.abort(); };
  }, []);
  useEffect(() => {
    try {
      setCart(readCart());
    } catch {}
    setCartHydrated(true);
    if (new URLSearchParams(window.location.search).get('cart') === '1')
      setCartOpen(true);
  }, []);
  useEffect(() => {
    if (cartHydrated)
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart, cartHydrated]);
  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const cartItems = useMemo(() => {
    if (!data) return [];
    return cart
      .map((entry) => ({
        entry,
        product: data.products.find(
          (product) => product.id === entry.productId,
        ),
      }))
      .filter((item) => item.product) as Array<{
      entry: CartEntry;
      product: Product;
    }>;
  }, [cart, data]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.entry.quantity,
    0,
  );
  const cartShipping = cartItems.reduce(
    (sum, item) =>
      sum + (item.product.freeShipping ? 0 : (item.product.shippingFee ?? 0)),
    0,
  );
  const cartTotal = cartSubtotal + cartShipping;

  const visibleProducts = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLocaleLowerCase('es');
    const filtered = data.products.filter((product) => {
      const matchesCategory =
        category === 'all' || product.categoryId === category;
      const haystack =
        `${product.name} ${product.brand} ${product.gender} ${product.notesCsv ?? ''}`.toLocaleLowerCase(
          'es',
        );
      return matchesCategory && (!term || haystack.includes(term));
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name') return a.name.localeCompare(b.name, 'es');
      return (
        Number(b.featured) - Number(a.featured) ||
        Number(b.bestseller) - Number(a.bestseller) ||
        a.sortOrder - b.sortOrder
      );
    });
  }, [category, data, search, sort]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing)
        return [...current, { productId: product.id, quantity: 1 }];
      return current.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
          : item,
      );
    });
    setToastMessage(`${product.name} se añadió al carrito. Pulsa Ver carrito para comprar.`);
  };

  const setQuantity = (product: Product, quantity: number) => {
    if (quantity <= 0)
      setCart((current) =>
        current.filter((item) => item.productId !== product.id),
      );
    else
      setCart((current) =>
        current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(quantity, product.stock) }
            : item,
        ),
      );
  };

  const answerQuiz = (answer: string) => {
    const nextAnswers = [...quizAnswers.slice(0, quizStep), answer];
    setQuizAnswers(nextAnswers);
    setQuizStep((step) => Math.min(step + 1, 3));
  };

  const quizRecommendation = useMemo(() => {
    if (!data || quizAnswers.length < 3) return null;
    const [who, moment, style] = quizAnswers;
    return (
      [...data.products].sort((a, b) => {
        const score = (product: Product) => {
          const text =
            `${product.gender} ${product.notesCsv ?? ''} ${product.description ?? ''}`.toLowerCase();
          let value = Number(product.featured) + Number(product.bestseller) * 2;
          if (who === 'dama' && text.includes('dama')) value += 5;
          if (who === 'caballero' && text.includes('caballero')) value += 5;
          if (who === 'unisex' && text.includes('unisex')) value += 5;
          if (
            moment === 'noche' &&
            /(intenso|ámbar|especias|gourmand)/.test(text)
          )
            value += 4;
          if (moment === 'diario' && /(fresco|luminoso|moderno)/.test(text))
            value += 4;
          if (style === 'dulce' && /(gourmand|vainilla|floral)/.test(text))
            value += 4;
          if (
            style === 'amaderado' &&
            /(madera|amaderado|oud|especias)/.test(text)
          )
            value += 4;
          if (style === 'fresco' && /(fresco|luminoso)/.test(text)) value += 4;
          return value;
        };
        return score(b) - score(a);
      })[0] ?? null
    );
  }, [data, quizAnswers]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#11100d] text-white">
        <div className="text-center">
          <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-[#d8b96e]/40 font-heading text-2xl text-[#d8b96e]">
            P
          </span>
          <LoaderCircle className="mx-auto size-5 animate-spin text-[#d8b96e]" />
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/50">
            Preparando tu experiencia
          </p>
        </div>
      </main>
    );
  }

  if (!data || loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f0e7] px-5 text-center">
        <div className="max-w-md rounded-[2rem] bg-white p-10 shadow-xl">
          <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-black font-heading text-2xl text-[#d8b96e]">
            P
          </span>
          <h1 className="font-heading text-3xl">
            La vitrina está tomando aire
          </h1>
          <p className="mt-3 text-sm leading-6 text-black/55">
            {loadError || 'Intenta nuevamente en unos segundos.'}
          </p>
          <Button
            onClick={() => void loadStore()}
            className="mt-6 h-11 rounded-full px-6"
          >
            Reintentar
          </Button>
        </div>
      </main>
    );
  }

  const { settings } = data;
  const themeStyle = {
    '--brand-primary': settings.primaryColor,
    '--brand-accent': settings.accentColor,
    '--brand-background': settings.backgroundColor,
  } as CSSProperties;
  const genericWhatsappUrl = `https://wa.me/${settings.whatsAppNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vengo de la web de ${settings.storeName} y quiero asesoría para elegir mi perfume.`)}`;
  const featured = data.products
    .filter((product) => product.featured)
    .slice(0, 4);

  return (
    <main
      style={themeStyle}
      className="min-h-screen overflow-hidden bg-[var(--brand-background)] text-[#171611]"
    >
      <div className="bg-[var(--brand-primary)] px-5 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-accent)] sm:text-[11px]">
        {settings.announcement}
      </div>

      <header className="absolute left-0 right-0 z-30 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 text-white sm:px-9 lg:px-14">
        <a href="#inicio" aria-label={`${settings.storeName}, inicio`}>
          <BrandMark settings={settings} />
        </a>
        <nav
          className="hidden items-center gap-8 text-sm text-white/70 lg:flex"
          aria-label="Navegación principal"
        >
          <a className="transition hover:text-white" href="#coleccion">
            Colección
          </a>
          <a className="transition hover:text-white" href="#catalogo">
            Catálogo
          </a>
          <a className="transition hover:text-white" href="#experiencia">
            Encuentra tu aroma
          </a>
          <a className="transition hover:text-white" href="/nosotros">
            Nosotros
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen((value) => !value)}
            className="hidden size-10 place-items-center rounded-full border border-white/15 bg-black/20 backdrop-blur transition hover:bg-white/10 sm:grid"
            aria-label="Buscar perfumes"
          >
            <Search className="size-4" />
          </button>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex h-11 items-center gap-2 rounded-full px-3 bg-[var(--brand-accent)] text-black transition hover:scale-105"
            aria-label={`Abrir carrito con ${cartCount} productos`}
          >
            <ShoppingBag className="size-4" /><span className="hidden text-sm font-bold sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-[#15120d] bg-white text-[10px] font-bold">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="grid size-10 place-items-center rounded-full border border-white/15 bg-black/20 backdrop-blur lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="absolute left-1/2 top-[104px] z-40 w-[min(600px,calc(100%-2.5rem))] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/75 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Search className="ml-2 size-4 text-white/50" />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter')
                  document.querySelector('#catalogo')?.scrollIntoView();
              }}
              placeholder="Busca por perfume, marca o nota…"
              className="h-11 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
            <Button
              onClick={() => {
                setSearchOpen(false);
                document.querySelector('#catalogo')?.scrollIntoView();
              }}
              className="rounded-full bg-[var(--brand-accent)] text-black"
            >
              Buscar
            </Button>
          </div>
        </div>
      )}
      {menuOpen && (
        <nav className="absolute left-5 right-5 top-[104px] z-40 grid gap-1 rounded-2xl bg-white p-3 text-sm shadow-2xl lg:hidden">
          {[
            ['Colección', '#coleccion'],
            ['Catálogo', '#catalogo'],
            ['Encuentra tu aroma', '#experiencia'],
            ['Nosotros', '/nosotros'],
          ].map(([label, href]) => (
            <a
              key={href}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 hover:bg-black/5"
              href={href}
            >
              {label}
            </a>
          ))}
        </nav>
      )}

      <section
        id="inicio"
        className="relative min-h-[760px] bg-[#0d0d0c] text-white lg:min-h-[800px]"
      >
        <img
          alt="Frasco de perfume de lujo"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
          src={settings.heroImageUrl}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,.98)_0%,rgba(5,5,5,.8)_40%,rgba(5,5,5,.08)_82%),linear-gradient(0deg,rgba(5,5,5,.8)_0%,transparent_44%)]" />
        <div className="relative mx-auto flex min-h-[760px] max-w-[1440px] items-end px-5 pb-20 pt-40 sm:px-9 lg:min-h-[800px] lg:items-center lg:px-14 lg:pb-0 lg:pt-24">
          <div className="max-w-[720px]">
            <Badge className="mb-7 h-8 border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 px-3 text-[10px] uppercase tracking-[0.2em] text-[var(--brand-accent)]">
              <Sparkles /> {settings.heroEyebrow}
            </Badge>
            <h1 className="font-heading text-[clamp(3.8rem,8vw,8rem)] font-medium leading-[0.82] tracking-[-0.055em]">
              {settings.heroTitle}
              <span className="mt-2 block font-light italic text-[var(--brand-accent)]">
                {settings.heroAccent}
              </span>
            </h1>
            <p className="mt-8 max-w-lg text-base leading-7 text-white/67 sm:text-lg">
              {settings.heroDescription}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() =>
                  document.querySelector('#catalogo')?.scrollIntoView()
                }
                className="h-12 rounded-full bg-[var(--brand-accent)] px-7 text-sm font-bold text-black hover:brightness-110"
              >
                Explorar la colección <ArrowUpRight />
              </Button>
              <Button
                onClick={() => {
                  setQuizOpen(true);
                  setQuizStep(0);
                  setQuizAnswers([]);
                }}
                variant="outline"
                className="h-12 rounded-full border-white/20 bg-white/5 px-7 text-sm text-white backdrop-blur hover:bg-white/10 hover:text-white"
              >
                Encontrar mi fragancia
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-xs text-white/57">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--brand-accent)]" />{' '}
                Autenticidad garantizada
              </span>
              <span className="flex items-center gap-2">
                <Truck className="size-4 text-[var(--brand-accent)]" />{' '}
                {settings.deliveryText}
              </span>
              <span className="flex items-center gap-2">
                <MessageCircle className="size-4 text-[var(--brand-accent)]" />{' '}
                Compra asistida
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => document.querySelector('#coleccion')?.scrollIntoView()}
          className="absolute bottom-8 right-8 hidden size-12 place-items-center rounded-full border border-white/20 text-white/70 lg:grid"
          aria-label="Bajar a productos"
        >
          <ChevronRight className="size-4 rotate-90" />
        </button>
      </section>

      <section id="coleccion" className="px-5 py-20 sm:px-9 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#8a6c29]">
                Curaduría El Padrino
              </p>
              <h2 className="font-heading text-4xl font-semibold tracking-tight sm:text-6xl">
                Los más deseados
              </h2>
            </div>
            <button
              onClick={() =>
                document.querySelector('#catalogo')?.scrollIntoView()
              }
              className="group flex w-fit items-center gap-2 border-b border-black/30 pb-1 text-sm font-semibold"
            >
              Ver catálogo completo{' '}
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={settings.currency}
                onAdd={addToCart}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        id="experiencia"
        className="bg-[var(--brand-primary)] px-5 py-20 text-white sm:px-9 lg:px-14 lg:py-24"
      >
        <div className="mx-auto grid max-w-[1440px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#171611] lg:grid-cols-[1.08fr_.92fr]">
          <div className="p-8 sm:p-12 lg:p-16">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
              Asesor personal
            </span>
            <h2 className="mt-5 max-w-2xl font-heading text-4xl font-semibold leading-[.96] sm:text-6xl">
              Tu próxima firma olfativa está a tres preguntas.
            </h2>
            <p className="mt-6 max-w-xl leading-7 text-white/58">
              Nuestro recomendador utiliza ocasión, estilo y familia aromática
              para encontrar opciones del catálogo. Sin IA, sin complicaciones:
              una guía clara para empezar.
            </p>
            <Button
              onClick={() => {
                setQuizOpen(true);
                setQuizStep(0);
                setQuizAnswers([]);
              }}
              className="mt-9 h-12 rounded-full bg-[var(--brand-accent)] px-7 font-bold text-black hover:brightness-110"
            >
              Descubrir mi perfume <ArrowUpRight />
            </Button>
          </div>
          <div className="relative min-h-[430px] overflow-hidden bg-[#211c14]">
            <img
              className="absolute inset-0 h-full w-full object-cover opacity-65"
              alt="Colección de fragancias premium"
              src={settings.heroImageUrl}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-transparent to-[#d8b96e]/20" />
            <div className="absolute bottom-7 left-7 right-7 grid grid-cols-3 gap-2">
              {['Tu ocasión', 'Tu estilo', 'Tu match'].map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur"
                >
                  <span className="text-xs text-[var(--brand-accent)]">
                    0{index + 1}
                  </span>
                  <p className="mt-2 text-xs font-semibold sm:text-sm">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="catalogo" className="px-5 py-20 sm:px-9 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#8a6c29]">
              Explora por ti
            </p>
            <h2 className="font-heading text-4xl font-semibold sm:text-6xl">
              Toda la colección
            </h2>
          </div>
          <div className="sticky top-3 z-20 mb-9 rounded-2xl border border-black/8 bg-white/88 p-3 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                <button
                  onClick={() => setCategory('all')}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${category === 'all' ? 'bg-black text-white' : 'bg-black/5 hover:bg-black/9'}`}
                >
                  Todos
                </button>
                {data.categories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCategory(item.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${category === item.id ? 'bg-black text-white' : 'bg-black/5 hover:bg-black/9'}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-black/5 px-4 lg:w-64">
                  <Search className="size-4 text-black/40" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar perfume…"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </label>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="h-10 rounded-full border border-black/10 bg-white px-4 text-xs font-semibold outline-none"
                >
                  <option value="featured">Destacados</option>
                  <option value="price-asc">Menor precio</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="name">Nombre A–Z</option>
                </select>
              </div>
            </div>
          </div>
          {visibleProducts.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currency={settings.currency}
                  onAdd={addToCart}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/15 py-20 text-center">
              <Search className="mx-auto size-7 text-black/25" />
              <h3 className="mt-4 font-heading text-3xl">
                No encontramos ese aroma
              </h3>
              <p className="mt-2 text-sm text-black/50">
                Prueba otra palabra o categoría.
              </p>
              <Button
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                }}
                variant="outline"
                className="mt-5 rounded-full"
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </section>

      <section
        id="nosotros"
        className="bg-[#e8dfcf] px-5 py-20 sm:px-9 lg:px-14 lg:py-28"
      >
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8a6c29]">
              La casa
            </p>
            <h2 className="mt-4 max-w-xl font-heading text-5xl font-semibold leading-[.96] sm:text-7xl">
              {settings.aboutTitle}
            </h2>
          </div>
          <div>
            <p className="max-w-xl text-lg leading-8 text-black/60">
              {settings.aboutText}
            </p>
            <a
              href="/nosotros"
              className="mt-7 inline-flex items-center gap-2 border-b border-black/35 pb-1 text-sm font-bold"
            >
              Conocer nuestra historia <ArrowRight className="size-4" />
            </a>
            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {[
                [ShieldCheck, 'Originales', 'Autenticidad verificada'],
                [MessageCircle, 'Humanos', 'Te asesoramos de verdad'],
                [PackageCheck, 'Cercanos', 'Seguimos cada pedido'],
              ].map(([Icon, title, text]) => (
                <div
                  key={String(title)}
                  className="rounded-2xl border border-black/8 bg-white/45 p-5"
                >
                  <Icon className="size-5 text-[#8a6c29]" />
                  <p className="mt-4 text-sm font-bold">{String(title)}</p>
                  <p className="mt-1 text-xs leading-5 text-black/45">
                    {String(text)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0c0c0b] px-5 py-14 text-white sm:px-9 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-10 border-b border-white/10 pb-12 lg:flex-row lg:items-end">
            <div>
              <BrandMark settings={settings} />
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/45">
                {settings.tagline} Perfumes originales con asesoría
                personalizada y compra directa.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                target="_blank"
                rel="noreferrer"
                href={genericWhatsappUrl}
                className="flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-bold text-black"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <a
                target="_blank"
                rel="noreferrer"
                href={settings.instagramUrl}
                className="grid size-11 place-items-center rounded-full border border-white/15"
              >
                <Instagram className="size-4" />
              </a>
              <button
                onClick={async () => {
                  if (navigator.share)
                    await navigator.share({
                      title: settings.storeName,
                      text: settings.tagline,
                      url: location.href,
                    });
                  else {
                    await navigator.clipboard.writeText(location.href);
                    setToastMessage('Enlace copiado');
                  }
                }}
                className="grid size-11 place-items-center rounded-full border border-white/15"
                aria-label="Compartir tienda"
              >
                <Share2 className="size-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 pt-6 text-[11px] text-white/35 sm:flex-row">
            <span>
              © {new Date().getFullYear()} {settings.storeName}. Todos los
              derechos reservados.
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-3" /> {settings.address}
            </span>
            <a href="/admin" className="hover:text-white/70">
              Administración
            </a>
          </div>
        </div>
      </footer>

      <a
        href={genericWhatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 font-bold text-black shadow-2xl transition hover:scale-105 sm:px-5"
        aria-label="Escribir por WhatsApp"
      >
        <MessageCircle className="size-5" />
        <span className="hidden text-sm sm:inline">Te asesoramos</span>
      </a>

      <button onClick={() => setCartOpen(true)} className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-3 rounded-full border border-[#d8b96e]/60 bg-[#171611] px-6 text-[#e3c87f] shadow-2xl" aria-label={`Ver carrito, ${cartCount} productos`}>
        <ShoppingBag className="size-5" /><span className="text-sm font-bold">{cartCount ? `Ver carrito (${cartCount}) · Comprar` : 'Carrito de compras'}</span><ArrowRight className="size-4" />
      </button>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full overflow-y-auto border-0 bg-[#f5f1e8] sm:max-w-lg">
          <SheetHeader className="border-b border-black/8 px-6 py-6">
            <SheetTitle className="font-heading text-3xl font-semibold">
              Tu carrito de compras
            </SheetTitle>
            <SheetDescription>
              {cartCount
                ? `${cartCount} ${cartCount === 1 ? 'perfume elegido' : 'perfumes elegidos'}`
                : 'Aquí aparecerán tus perfumes.'}
            </SheetDescription>
          </SheetHeader>
          <div className="shrink-0 px-6">
            {!cartItems.length ? (
              <div className="grid h-full place-items-center py-20 text-center">
                <div>
                  <ShoppingBag className="mx-auto size-8 text-black/20" />
                  <h3 className="mt-4 font-heading text-3xl">
                    Tu selección está vacía
                  </h3>
                  <p className="mt-2 text-sm text-black/45">
                    Descubre un perfume y añádelo para comenzar.
                  </p>
                  <Button
                    onClick={() => setCartOpen(false)}
                    className="mt-6 rounded-full px-6"
                  >
                    Ver colección
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-black/8">
                {cartItems.map(({ product, entry }) => (
                  <div key={product.id} className="flex gap-4 py-5">
                    <img
                      className="size-20 rounded-2xl object-cover"
                      src={product.imageUrl}
                      alt={product.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-lg font-semibold">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-black/45">
                        {product.sizeMl ? `${product.sizeMl} ml · ` : ''}
                        {money(product.price, settings.currency)}
                      </p>
                      <p
                        className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${product.freeShipping ? 'text-green-700' : 'text-[#8a6c29]'}`}
                      >
                        <Truck className="size-3" />
                        {product.freeShipping
                          ? 'Envío gratis'
                          : `+ ${money(product.shippingFee ?? 0, settings.currency)} de envío`}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-black/10 bg-white">
                          <button
                            onClick={() =>
                              setQuantity(product, entry.quantity - 1)
                            }
                            className="grid size-8 place-items-center"
                            aria-label="Quitar uno"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold">
                            {entry.quantity}
                          </span>
                          <button
                            onClick={() =>
                              setQuantity(product, entry.quantity + 1)
                            }
                            className="grid size-8 place-items-center"
                            aria-label="Añadir uno"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => setQuantity(product, 0)}
                          className="text-black/35 hover:text-red-700"
                          aria-label={`Eliminar ${product.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {cartItems.length > 0 && (
            <SheetFooter className="border-t border-black/8 bg-white px-6 py-6">
              <div className="mb-2 grid gap-2 rounded-2xl bg-[#f7f4ee] p-4">
                <div className="flex items-center justify-between text-xs text-black/50">
                  <span>Subtotal</span>
                  <span>{money(cartSubtotal, settings.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Envío</span>
                  <span className={cartShipping === 0 ? 'text-green-700' : ''}>
                    {cartShipping === 0
                      ? 'Gratis'
                      : money(cartShipping, settings.currency)}
                  </span>
                </div>
                <div className="flex items-end justify-between border-t border-black/8 pt-3">
                  <span className="text-sm text-black/55">Total estimado</span>
                  <strong className="font-heading text-3xl">
                    {money(cartTotal, settings.currency)}
                  </strong>
                </div>
              </div>
              <CheckoutForm items={cart} onCreated={() => { setCart([]); localStorage.removeItem(cartStorageKey); }} />
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="overflow-hidden rounded-[2rem] border-0 bg-[#15130f] p-0 text-white sm:max-w-2xl">
          <div className="p-7 sm:p-10">
            <DialogHeader>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-accent)]">
                Tu asesor personal · {Math.min(quizStep + 1, 3)}/3
              </p>
              <DialogTitle className="font-heading text-4xl font-semibold text-white">
                {quizStep === 0
                  ? '¿Para quién buscamos?'
                  : quizStep === 1
                    ? '¿En qué momento quieres brillar?'
                    : quizStep === 2
                      ? '¿Qué sensación te atrae?'
                      : 'Tu match tiene nombre'}
              </DialogTitle>
              <DialogDescription className="text-white/45">
                Elige la opción que más se parezca a ti.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-8 grid gap-3">
              {quizStep === 0 &&
                [
                  ['dama', 'Para ella'],
                  ['caballero', 'Para él'],
                  ['unisex', 'Sin etiquetas'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => answerQuiz(value)}
                    className="group flex items-center justify-between rounded-2xl border border-white/10 p-5 text-left transition hover:border-[var(--brand-accent)]/60 hover:bg-white/5"
                  >
                    <span className="font-heading text-2xl">{label}</span>
                    <ChevronRight className="size-5 text-white/25 group-hover:text-[var(--brand-accent)]" />
                  </button>
                ))}
              {quizStep === 1 &&
                [
                  ['diario', 'Todos los días'],
                  ['noche', 'Noches y citas'],
                  ['especial', 'Una ocasión especial'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => answerQuiz(value)}
                    className="group flex items-center justify-between rounded-2xl border border-white/10 p-5 text-left transition hover:border-[var(--brand-accent)]/60 hover:bg-white/5"
                  >
                    <span className="font-heading text-2xl">{label}</span>
                    <ChevronRight className="size-5 text-white/25 group-hover:text-[var(--brand-accent)]" />
                  </button>
                ))}
              {quizStep === 2 &&
                [
                  ['fresco', 'Fresco y luminoso'],
                  ['dulce', 'Dulce y envolvente'],
                  ['amaderado', 'Amaderado e intenso'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => answerQuiz(value)}
                    className="group flex items-center justify-between rounded-2xl border border-white/10 p-5 text-left transition hover:border-[var(--brand-accent)]/60 hover:bg-white/5"
                  >
                    <span className="font-heading text-2xl">{label}</span>
                    <ChevronRight className="size-5 text-white/25 group-hover:text-[var(--brand-accent)]" />
                  </button>
                ))}
              {quizStep === 3 && quizRecommendation && (
                <div>
                  <div className="grid gap-5 rounded-2xl bg-white/5 p-4 sm:grid-cols-[140px_1fr]">
                    <img
                      className="aspect-square w-full rounded-xl object-cover"
                      src={quizRecommendation.imageUrl}
                      alt={quizRecommendation.name}
                    />
                    <div className="flex flex-col justify-center">
                      <div className="mb-2 flex text-[var(--brand-accent)]">
                        {[0, 1, 2, 3, 4].map((item) => (
                          <Star key={item} className="size-3 fill-current" />
                        ))}
                      </div>
                      <p className="text-xs uppercase tracking-[.16em] text-white/40">
                        Recomendación El Padrino
                      </p>
                      <h3 className="mt-2 font-heading text-3xl font-semibold">
                        {quizRecommendation.name}
                      </h3>
                      <p className="mt-1 text-sm text-white/45">
                        {quizRecommendation.brand} ·{' '}
                        {money(quizRecommendation.price, settings.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-3">
                    <Button
                      onClick={() => {
                        addToCart(quizRecommendation);
                        setQuizOpen(false);
                        setCartOpen(true);
                      }}
                      className="h-11 flex-1 rounded-full bg-[var(--brand-accent)] font-bold text-black"
                    >
                      Quiero este
                    </Button>
                    <Button
                      onClick={() => {
                        setQuizStep(0);
                        setQuizAnswers([]);
                      }}
                      variant="outline"
                      className="h-11 rounded-full border-white/15 bg-transparent text-white hover:bg-white/5 hover:text-white"
                    >
                      Repetir
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {quizStep > 0 && quizStep < 3 && (
              <button
                onClick={() => {
                  setQuizStep((step) => step - 1);
                  setQuizAnswers((answers) => answers.slice(0, -1));
                }}
                className="mt-6 flex items-center gap-2 text-xs text-white/45 hover:text-white"
              >
                <ChevronLeft className="size-4" /> Volver
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-semibold text-white shadow-2xl"
        >
          <Check className="size-4 text-[var(--brand-accent)]" /> {toastMessage}
        </div>
      )}
    </main>
  );
}
