'use client';
import { ShopAssistant } from '@/components/shop-assistant';
import { NewProductBadge } from '@/components/new-product-badge';
import { StoreCarousel, type StoreCarouselSlide } from '@/components/store-carousel';
import { normalize } from '@/lib/shop-assistant';
import {
  prestigeLabel,
  recommendLuxuryShowcase,
  type ShowcaseMode,
} from '@/lib/luxury-recommendations';

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
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
      <img
        className={`size-12 rounded-full border object-cover shadow-[0_0_24px_rgba(216,185,110,.12)] ${dark ? 'border-black/20' : 'border-white/15'}`}
        src={settings.logoUrl || '/brand/el-padrino-mark.svg'}
        alt={`Emblema de ${settings.storeName}`}
      />
      <span
        className={`max-w-[7rem] font-heading text-xs font-semibold leading-5 tracking-[0.1em] sm:max-w-none sm:text-lg ${dark ? 'text-[#171611]' : 'text-white'}`}
      >
        {settings.storeName.toUpperCase()}
        <span className="block font-heading text-xs font-normal italic leading-4 tracking-normal opacity-80">
          by Jordy Tamayo
        </span>
      </span>
    </span>
  );
}

function ProductCard({
  product,
  currency,
  onAdd,
  recommendation,
}: {
  product: Product;
  currency: string;
  onAdd: (product: Product) => void;
  recommendation?: string;
}) {
  const soldOut = product.stock === 0;
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-[#211d14]/[.07] bg-[#fffefa] shadow-[0_8px_30px_rgba(40,32,16,.035)] transition duration-500 hover:-translate-y-1 hover:border-[#b28a3a]/35 hover:shadow-[0_28px_70px_rgba(47,37,16,.12)]">
      <a
        href={`/perfumes/${product.slug}`}
        className="relative block aspect-[4/4.35] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,#fffefa_0%,#f1ede5_66%,#e5dece_100%)] text-left"
        aria-label={`Ver detalles de ${product.name}`}
      >
        {product.imageUrl?.trim() ? (
          <img
            alt={product.name}
            className="h-full w-full object-contain p-5 mix-blend-multiply transition duration-700 group-hover:scale-[1.055] sm:p-6"
            loading="lazy"
            src={product.imageUrl}
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(ellipse_at_50%_40%,#fffefa,#e9e2d5)]">
            <img src="/brand/el-padrino-mark.svg" alt="" className="size-24 opacity-55" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <NewProductBadge until={product.newUntil} />
          {product.bestseller && (
            <span className="rounded-full bg-white/92 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-black backdrop-blur">
              Más vendido
            </span>
          )}
          {product.compareAtPrice && (
            <span className="rounded-full bg-[#8d3425] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white shadow-sm">
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
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#98752f]">
              {product.brand}
            </p>
            <a
              href={`/perfumes/${product.slug}`}
              className="block max-w-full truncate text-left font-heading text-[1.55rem] font-medium leading-[1.05] transition-colors hover:text-[#8a6c29]"
            >
              {product.name}
            </a>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.11em] text-black/45">
              {product.sizeMl
                ? `${product.sizeMl} ml`
                : 'Presentación original'}{' '}
              · {product.gender}
            </p>
            {recommendation && (
              <p className="mt-2 text-[8px] font-semibold uppercase tracking-[.13em] text-[#98752f]">
                {recommendation}
              </p>
            )}
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
        <div className="mt-4 flex items-baseline gap-2 border-t border-black/[.07] pt-3">
          <span className="font-heading text-xl font-semibold tracking-tight">
            {money(product.price, currency)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-black/38 line-through">
              {money(product.compareAtPrice, currency)}
            </span>
          )}
        </div>
        {product.description && (
          <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-black/58">
            {product.description}
          </p>
        )}
        {product.notesCsv && (
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[#80601f]">
            {product.notesCsv.split(',').slice(0, 3).join(' · ')}
          </p>
        )}
        <button
          disabled={soldOut}
          onClick={() => onAdd(product)}
          className="mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#171611] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-white transition hover:bg-[#95722e] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag className="size-4" />
          {soldOut ? 'Agotado' : 'Añadir al carrito'}
        </button>
        <p
          className={`mt-3 flex items-center gap-1.5 text-[10px] font-medium ${product.freeShipping ? 'text-green-800' : 'text-[#80601f]'}`}
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

export function Storefront({ initialData }: { initialData?: StorefrontData }) {
  const [data, setData] = useState<StorefrontData | null>(initialData ?? null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(!initialData);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [showcaseMode, setShowcaseMode] = useState<ShowcaseMode>('wanted');
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [showcasePaused, setShowcasePaused] = useState(false);
  const [rankingNow, setRankingNow] = useState(0);
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
    if (!initialData) void loadStore();
  }, [initialData]);
  useEffect(() => {
    let updating = false;
    const controller = new AbortController();
    const timer = window.setInterval(async () => {
      if (updating || document.visibilityState !== 'visible') return;
      updating = true;
      try {
        const latest = await apiFetch<StorefrontData>('/api/storefront', {
          cache: 'no-store',
          signal: controller.signal,
        });
        setData(latest);
      } catch {
        /* Keep the last usable catalog during a temporary connection failure. */
      } finally {
        updating = false;
      }
    }, 15000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);
  useEffect(() => {
    const refreshRankingClock = () => setRankingNow(Date.now());
    refreshRankingClock();
    const timer = window.setInterval(refreshRankingClock, 60_000);
    return () => window.clearInterval(timer);
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
    const term = normalize(search.trim());
    const filtered = data.products.filter((product) => {
      const matchesCategory =
        category === 'all' || product.categoryId === category;
      const haystack = normalize(
        `${product.name} ${product.brand} ${product.gender} ${product.notesCsv ?? ''}`,
      );
      return (
        matchesCategory &&
        (!term || term.split(/\s+/).every((word) => haystack.includes(word)))
      );
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
    setToastMessage(
      `${product.name} se añadió al carrito. Pulsa Ver carrito para comprar.`,
    );
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

  const showcasePool = useMemo(
    () =>
      recommendLuxuryShowcase(
        data?.products ?? [],
        showcaseMode,
        rankingNow,
        Number.MAX_SAFE_INTEGER,
      ),
    [data, showcaseMode, rankingNow],
  );
  const showcaseWindow = showcasePool.length > 4
    ? Array.from({ length: 4 }, (_, index) => showcasePool[(showcaseIndex + index) % showcasePool.length])
    : showcasePool;
  useEffect(() => {
    if (
      showcasePool.length <= 4 ||
      showcasePaused ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;
    const timer = window.setInterval(() => {
      setShowcaseIndex((index) => (index + 1) % showcasePool.length);
    }, 7800);
    return () => window.clearInterval(timer);
  }, [showcasePool.length, showcaseMode, showcasePaused]);
  useEffect(() => {
    setShowcaseIndex((index) =>
      showcasePool.length ? index % showcasePool.length : 0,
    );
  }, [showcasePool.length]);
  const moveShowcase = (direction: 1 | -1) => {
    if (showcasePool.length <= 4) return;
    setShowcaseIndex((index) =>
      (index + direction + showcasePool.length) % showcasePool.length,
    );
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#11100d] text-white">
        <div className="text-center">
          <img className="mx-auto mb-5 size-14 rounded-full border border-[#d8b96e]/40 p-1" src="/brand/el-padrino-mark.svg" alt="Perfumes El Padrino" />
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
          <img className="mx-auto mb-5 size-14 rounded-full bg-[#11100d] p-1" src="/brand/el-padrino-mark.svg" alt="Perfumes El Padrino" />
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
  const heroSlides: StoreCarouselSlide[] = [...data.products]
    .filter((product) => product.isActive && product.stock > 0 && product.imageUrl)
    .sort((left, right) => {
      const score = (product: Product) =>
        Number(product.featured) * 4 + Number(product.bestseller) * 2;
      return score(right) - score(left) || left.sortOrder - right.sortOrder;
    })
    .map((product) => ({
      id: product.id,
      image: product.imageUrl,
      brand: product.brand,
      name: product.name,
      price: product.price,
      href: `/perfumes/${encodeURIComponent(product.slug)}`,
      newUntil: product.newUntil,
      featured: product.featured,
      bestseller: product.bestseller,
      updatedAt: product.updatedAt,
    }));
  const advisorSlides = heroSlides;

  return (
    <main
      style={themeStyle}
      className="min-h-screen overflow-hidden bg-[var(--brand-background)] text-[#171611]"
    >
      <div className="relative z-40 bg-[var(--brand-primary)] px-5 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-accent)] sm:text-[10px]">
        {settings.announcement}
      </div>

      <header className="absolute left-0 right-0 z-30 mx-auto flex max-w-[1440px] items-center justify-between border-b border-white/[.07] px-5 py-5 text-white sm:px-9 lg:px-14">
        <a href="#inicio" aria-label={`${settings.storeName}, inicio`}>
          <BrandMark settings={settings} />
        </a>
        <nav
          className="hidden items-center gap-9 text-[11px] font-medium uppercase tracking-[0.13em] text-white/66 lg:flex"
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
            <ShoppingBag className="size-4" />
            <span className="hidden text-sm font-bold sm:inline">Carrito</span>
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
        className="relative isolate overflow-hidden bg-[#0d0d0c] text-white"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_79%_43%,rgba(198,159,81,.22),transparent_34%),radial-gradient(ellipse_at_7%_94%,rgba(144,103,41,.12),transparent_40%),linear-gradient(118deg,#090807_0%,#17140f_54%,#090807_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.1] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:84px_84px] [mask-image:linear-gradient(90deg,transparent,black)]" />
        <div className="relative mx-auto grid min-h-[820px] max-w-[1540px] items-center gap-4 px-5 pb-20 pt-32 sm:px-9 lg:min-h-[790px] lg:grid-cols-[1fr_1fr] lg:gap-5 lg:px-14 lg:pb-16 lg:pt-24">
          <div className="max-w-[720px] py-10 lg:py-16">
            <Badge className="mb-8 h-9 rounded-full border border-[var(--brand-accent)]/45 bg-[var(--brand-accent)]/[.08] px-4 text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-accent)] shadow-[inset_0_0_14px_rgba(216,185,110,.06)]">
              <Sparkles /> {settings.heroEyebrow}
            </Badge>
            <h1 className="font-heading text-[clamp(4rem,7.9vw,8.4rem)] font-medium leading-[0.8] tracking-[-0.06em] [text-shadow:0_4px_32px_rgba(0,0,0,.2)]">
              {settings.heroTitle}
              <span className="mt-2 block font-light italic text-[var(--brand-accent)]">
                {settings.heroAccent}
              </span>
            </h1>
            <p className="mt-8 max-w-[32rem] text-[15px] leading-7 text-[#e5dfd3]/75 sm:text-lg sm:leading-8">
              {settings.heroDescription}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() =>
                  document.querySelector('#catalogo')?.scrollIntoView()
                }
                className="h-12 rounded-full bg-[var(--brand-accent)] px-7 text-[11px] font-bold uppercase tracking-[0.09em] text-black shadow-[0_8px_28px_rgba(216,185,110,.17)] hover:-translate-y-0.5 hover:brightness-105"
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
                className="h-12 rounded-full border-white/20 bg-white/[.035] px-7 text-[11px] font-semibold uppercase tracking-[0.09em] text-white backdrop-blur hover:border-[var(--brand-accent)]/50 hover:bg-white/[.07] hover:text-white"
              >
                Encontrar mi fragancia
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-[10px] font-medium uppercase tracking-[0.06em] text-white/58">
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
          <div className="relative h-[440px] w-full sm:h-[540px] lg:h-[650px]">
            <StoreCarousel
              slides={heroSlides}
              variant="hero"
              currency={settings.currency}
            />
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

      <section id="coleccion" className="relative px-5 py-20 sm:px-9 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 flex flex-col justify-between gap-5 border-b border-black/[.09] pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.24em] text-[#8a6c29]">
                <span className="h-px w-8 bg-[#b28a3a]" />
                Curaduría El Padrino
              </p>
              <h2 className="font-heading text-4xl font-medium tracking-tight sm:text-6xl">
                Los más deseados
              </h2>
            </div>
            <button
              onClick={() =>
                document.querySelector('#catalogo')?.scrollIntoView()
              }
              className="group flex w-fit items-center gap-2 border-b border-[#9c7a39]/45 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors hover:border-black"
            >
              Ver catálogo completo{' '}
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </button>
          </div>
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <p className="max-w-xl text-[11px] leading-5 text-black/52 sm:text-xs">
              Selección dinámica según prestigio de marca, valor, novedades, popularidad y disponibilidad actual.
            </p>
            <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-fit items-center gap-1 rounded-full border border-black/[.08] bg-white/60 p-1" role="group" aria-label="Criterio de recomendación">
              {([
                ['wanted', 'Más deseados'],
                ['prestige', 'Prestigio'],
                ['new', 'Novedades'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setShowcaseMode(mode);
                    setShowcaseIndex(0);
                  }}
                  aria-pressed={showcaseMode === mode}
                  className={`rounded-full px-3 py-2 text-[9px] font-semibold uppercase tracking-[.07em] transition sm:px-4 ${showcaseMode === mode ? 'bg-[#171611] text-[#e3c87f] shadow-sm' : 'text-black/55 hover:bg-black/[.06] hover:text-black'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {showcasePool.length > 4 && (
              <div className="flex h-10 items-center gap-2 rounded-full border border-black/[.08] bg-white/55 px-2">
                <span className="min-w-14 text-center text-[9px] font-semibold tabular-nums text-black/55">
                  {String(showcaseIndex + 1).padStart(2, '0')} / {String(showcasePool.length).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => moveShowcase(-1)}
                  className="grid size-7 place-items-center rounded-full text-black/60 transition hover:bg-black hover:text-white"
                  aria-label="Ver recomendaciones anteriores"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveShowcase(1)}
                  className="grid size-7 place-items-center rounded-full bg-[#171611] text-[#e3c87f] transition hover:bg-[#927034] hover:text-white"
                  aria-label="Ver más recomendaciones"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
            </div>
          </div>
          <div
            role="region"
            aria-roledescription="carrusel"
            aria-label={`Recomendaciones de ${showcaseMode === 'wanted' ? 'los más deseados' : showcaseMode === 'prestige' ? 'perfumería de prestigio' : 'novedades'}`}
            onMouseEnter={() => setShowcasePaused(true)}
            onMouseLeave={() => setShowcasePaused(false)}
            onFocus={() => setShowcasePaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setShowcasePaused(false);
            }}
          >
          <div key={`${showcaseMode}-${showcaseIndex}`} className="grid animate-[carousel-reveal_.45s_ease-out_both] gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {showcaseWindow.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={settings.currency}
                onAdd={addToCart}
                recommendation={
                  showcaseMode === 'new' &&
                  product.newUntil &&
                  Date.parse(product.newUntil) > rankingNow
                    ? `Novedad · ${prestigeLabel(product)}`
                    : prestigeLabel(product)
                }
              />
            ))}
          </div>
          </div>
        </div>
      </section>

      <section
        id="experiencia"
        className="relative isolate overflow-hidden bg-[#0e0d0b] px-5 py-20 text-white sm:px-9 lg:px-14 lg:py-28"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_50%,rgba(161,117,42,.18),transparent_34%),linear-gradient(130deg,#100e0a,#17140f_52%,#0b0a08)]" />
        <div className="mx-auto grid max-w-[1440px] overflow-hidden rounded-[2rem] border border-[#d8b96e]/20 bg-[linear-gradient(115deg,#171611_0%,#15130f_62%,#21190e_100%)] shadow-[0_36px_100px_rgba(0,0,0,.34)] lg:grid-cols-[1.06fr_.94fr]">
          <div className="relative z-10 p-8 sm:p-12 lg:p-16">
            <span className="flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-[var(--brand-accent)]">
              <span className="h-px w-8 bg-[var(--brand-accent)]/70" />
              Asesor personal
            </span>
            <h2 className="mt-6 max-w-2xl font-heading text-4xl font-medium leading-[.94] tracking-[-0.025em] sm:text-6xl">
              Tu próxima firma olfativa está a tres preguntas.
            </h2>
            <p className="mt-6 max-w-xl text-[14px] leading-7 text-[#e5dfd3]/62 sm:text-base">
              Nuestro recomendador utiliza ocasión, estilo y familia aromática
              para encontrar opciones del catálogo. Sin complicaciones: una guía
              clara para empezar.
            </p>
            <Button
              onClick={() => {
                setQuizOpen(true);
                setQuizStep(0);
                setQuizAnswers([]);
              }}
              className="mt-9 h-12 rounded-full bg-[var(--brand-accent)] px-7 text-[10px] font-bold uppercase tracking-[0.1em] text-black shadow-[0_8px_30px_rgba(216,185,110,.13)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Descubrir mi perfume <ArrowUpRight />
            </Button>
          </div>
          <div className="relative min-h-[430px] overflow-hidden border-t border-white/[.06] bg-[radial-gradient(ellipse_at_50%_50%,#4d3b20_0%,#211a10_54%,#14120e_100%)] lg:border-l lg:border-t-0">
            <StoreCarousel
              slides={advisorSlides}
              variant="advisor"
              currency={settings.currency}
            />
          </div>
        </div>
      </section>

      <section id="catalogo" className="bg-[#eee9de] px-5 py-20 sm:px-9 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 flex flex-col justify-between gap-6 border-b border-black/[.1] pb-8 lg:flex-row lg:items-end">
            <div>
            <p className="mb-3 flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.24em] text-[#8a6c29]">
              <span className="h-px w-8 bg-[#b28a3a]" />
              Explora por ti
            </p>
            <h2 className="font-heading text-4xl font-medium sm:text-6xl">
              Toda la colección
            </h2>
            <p className="mt-4 max-w-2xl text-[13px] leading-6 text-black/56 sm:text-sm">
              Perfumes originales, árabes y de diseñador para hombre, mujer y
              unisex. Encuentra tu fragancia en Perfumes El Padrino by Jordy
              Tamayo, desde Babahoyo, Los Ríos, con envíos a todo Ecuador.
            </p>
            </div>
            <p className="shrink-0 font-heading text-2xl italic text-black/48">
              {data.products.filter((product) => product.isActive && product.stock > 0).length}
              <span className="ml-2 font-sans text-[9px] font-semibold not-italic uppercase tracking-[0.16em] text-black/45">fragancias disponibles</span>
            </p>
          </div>
          <div className="sticky top-3 z-20 mb-9 rounded-[1.15rem] border border-[#9c7a39]/18 bg-[#fffefa]/95 p-3 shadow-[0_14px_44px_rgba(33,29,20,.09)] backdrop-blur-xl sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                <button
                  onClick={() => setCategory('all')}
                    className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[.06em] transition ${category === 'all' ? 'bg-[#171611] text-[#e3c87f]' : 'bg-[#171611]/[.045] hover:bg-[#171611]/[.09]'}`}
                >
                  Todos
                </button>
                {data.categories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCategory(item.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[.06em] transition ${category === item.id ? 'bg-[#171611] text-[#e3c87f]' : 'bg-[#171611]/[.045] hover:bg-[#171611]/[.09]'}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-black/[.08] bg-white px-4 lg:w-64">
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
                  className="h-10 rounded-full border border-black/[.1] bg-white px-4 text-[10px] font-semibold uppercase tracking-[.06em] outline-none"
                >
                  <option value="featured">Destacados</option>
                  <option value="price-asc">Menor precio</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="name">Nombre A–Z</option>
                </select>
              </div>
            </div>
          </div>
          <nav
            aria-label="Explorar colecciones de perfumes"
            className="-mt-4 mb-8 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-black/55"
          >
            <span className="font-semibold text-black/70">
              También explora:
            </span>
            {data.categories
              .filter((item) => item.isActive)
              .map((item) => (
                <a
                  key={item.id}
                  href={`/coleccion/${encodeURIComponent(item.slug)}`}
                  className="underline decoration-black/20 underline-offset-4 transition hover:text-[#8a6c29]"
                >
                  Perfumes {item.name}
                </a>
              ))}
          </nav>
          {visibleProducts.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        className="relative overflow-hidden bg-[linear-gradient(112deg,#e7dfd1_0%,#f0ece4_48%,#e2d7c5_100%)] px-5 py-20 sm:px-9 lg:px-14 lg:py-28"
      >
        <div className="pointer-events-none absolute -right-20 -top-28 size-[32rem] rounded-full border border-[#9a7837]/10" />
        <div className="pointer-events-none absolute -right-8 -top-16 size-[27rem] rounded-full border border-[#9a7837]/10" />
        <div className="relative mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.24em] text-[#8a6c29]">
              <span className="h-px w-8 bg-[#b28a3a]" />
              La casa
            </p>
            <h2 className="mt-5 max-w-xl font-heading text-5xl font-medium leading-[.94] tracking-[-0.025em] sm:text-7xl">
              {settings.aboutTitle}
            </h2>
          </div>
          <div>
            <p className="max-w-xl text-[15px] leading-8 text-black/62 sm:text-lg">
              {settings.aboutText}
            </p>
            <a
              href="/nosotros"
                className="group mt-7 inline-flex items-center gap-2 border-b border-[#9c7a39]/55 pb-2 text-[10px] font-semibold uppercase tracking-[.12em] transition-colors hover:border-black"
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
                  className="rounded-[1.1rem] border border-white/70 bg-white/45 p-5 shadow-[0_14px_38px_rgba(64,48,20,.04)] backdrop-blur-sm"
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

      <footer className="relative overflow-hidden bg-[#0c0c0b] px-5 py-16 text-white sm:px-9 lg:px-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_0%,rgba(172,128,48,.12),transparent_34%)]" />
        <div className="relative mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-10 border-b border-white/10 pb-12 lg:flex-row lg:items-end">
            <div>
              <BrandMark settings={settings} />
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/45">
                {settings.tagline} Perfumes originales con asesoría
                personalizada y compra directa desde Babahoyo, Ecuador. Envíos
                nacionales.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                target="_blank"
                rel="noreferrer"
                href={genericWhatsappUrl}
                className="flex h-11 items-center gap-2 rounded-full border border-[#d8b96e]/50 bg-[#d8b96e] px-5 text-[10px] font-bold uppercase tracking-[.1em] text-black transition hover:bg-[#edd495]"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://www.instagram.com/el_padrino28/"
                aria-label="Seguir a Perfumes El Padrino en Instagram"
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

      {!cartOpen && (
        <>
          <ShopAssistant
            products={data.products}
            cart={cart}
            currency={settings.currency}
            whatsapp={genericWhatsappUrl}
            onAdd={addToCart}
            onQuantity={(p, quantity) => {
              setCart((current) =>
                quantity === 0
                  ? current.filter((e) => e.productId !== p.id)
                  : current.some((e) => e.productId === p.id)
                    ? current.map((e) =>
                        e.productId === p.id ? { ...e, quantity } : e,
                      )
                    : [...current, { productId: p.id, quantity }],
              );
            }}
            onCart={() => setCartOpen(true)}
          />
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-12 items-center justify-center rounded-full border border-[#d8b96e]/60 bg-[#171611] text-[#e3c87f] shadow-xl sm:right-5 sm:h-14 sm:w-auto sm:gap-3 sm:px-6"
            aria-label={`Ver carrito, ${cartCount} productos`}
          >
            <ShoppingBag className="size-5" />
            <span className="hidden text-sm font-bold sm:inline">
              {cartCount
                ? `Ver carrito (${cartCount}) · Comprar`
                : 'Carrito de compras'}
            </span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#d8b96e] px-1 text-xs font-bold text-black sm:hidden">
                {cartCount}
              </span>
            )}
          </button>
          <a
            href={genericWhatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 grid size-12 -translate-x-1/2 place-items-center rounded-full bg-[#25D366] text-black shadow-xl sm:hidden"
            aria-label="Escribir a Perfumes El Padrino por WhatsApp"
          >
            <MessageCircle className="size-6" />
          </a>
        </>
      )}

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
              <CheckoutForm
                items={cart}
                onCreated={() => {
                  setCart([]);
                  localStorage.removeItem(cartStorageKey);
                }}
              />
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
