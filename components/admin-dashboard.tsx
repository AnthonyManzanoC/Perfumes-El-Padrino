'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  type LucideIcon,
  Mail as MailIcon,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Package,
  Palette,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  ShoppingBag,
  Store,
  Tags,
  Trash2,
  Truck,
  Upload,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CommerceAdmin, OrderActions } from '@/components/commerce-admin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api';
import type {
  AdminOrder,
  AdminSummary,
  Category,
  Product,
  SiteSettings,
} from '@/lib/store-types';

type View = 'overview' | 'products' | 'orders' | 'categories' | 'design' | 'commerce';
type ProductDraft = {
  id?: string;
  name: string;
  brand: string;
  description: string;
  gender: string;
  sizeMl: string;
  price: string;
  compareAtPrice: string;
  freeShipping: boolean;
  shippingFee: string;
  stock: string;
  originalStock?: number;
  imageUrl: string;
  imageUrls: string[];
  notesCsv: string;
  categoryId: string;
  featured: boolean;
  bestseller: boolean;
  isActive: boolean;
  sortOrder: string;
};

const emptyProduct: ProductDraft = {
  name: '',
  brand: '',
  description: '',
  gender: 'Unisex',
  sizeMl: '100',
  price: '',
  compareAtPrice: '',
  freeShipping: true,
  shippingFee: '',
  stock: '1',
  imageUrl: '',
  imageUrls: [],
  notesCsv: '',
  categoryId: '',
  featured: false,
  bestseller: false,
  isActive: true,
  sortOrder: '0',
};

function money(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(
    value,
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold text-black/65">{label}</span>
      {children}
      {hint && (
        <span className="text-[10px] leading-4 text-black/38">{hint}</span>
      )}
    </label>
  );
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 2_000_000)
      return reject(new Error('La imagen debe pesar menos de 2 MB.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

export function AdminDashboard() {
  const [token, setToken] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [view, setView] = useState<View>('overview');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [productDialog, setProductDialog] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('el-padrino-admin-token') ?? '';
    setToken(stored);
    setCheckingSession(false);
  }, []);

  const logout = async () => {
    try {
      if (token) await apiFetch('/api/admin/logout', { method: 'POST' }, token);
    } catch {}
    sessionStorage.removeItem('el-padrino-admin-token');
    setToken('');
    setSummary(null);
  };

  const handleApiError = (caught: unknown) => {
    if (caught instanceof ApiError && caught.status === 401) {
      void logout();
      return;
    }
    setError(
      caught instanceof Error ? caught.message : 'Ocurrió un error inesperado.',
    );
  };

  const loadAdmin = async (activeToken = token) => {
    if (!activeToken) return;
    setLoading(true);
    setError('');
    try {
      const [
        nextSummary,
        nextSettings,
        nextProducts,
        nextCategories,
        nextOrders,
      ] = await Promise.all([
        apiFetch<AdminSummary>('/api/admin/summary', {}, activeToken),
        apiFetch<SiteSettings>('/api/admin/settings', {}, activeToken),
        apiFetch<Product[]>('/api/admin/products', {}, activeToken),
        apiFetch<Category[]>('/api/admin/categories', {}, activeToken),
        apiFetch<AdminOrder[]>('/api/admin/orders', {}, activeToken),
      ]);
      setSummary(nextSummary);
      setSettings(nextSettings);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setOrders(nextOrders);
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadAdmin(token);
  }, [token]);
  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try { setOrders(await apiFetch<AdminOrder[]>('/api/admin/orders', {}, token)); }
      catch { /* The normal refresh reports session errors. */ }
    }, 15000);
    return () => clearInterval(timer);
  }, [token]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiFetch<{ token: string }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      sessionStorage.setItem('el-padrino-admin-token', result.token);
      setToken(result.token);
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    try {
      const saved = await apiFetch<SiteSettings>(
        '/api/admin/settings',
        { method: 'PUT', body: JSON.stringify(settings) },
        token,
      );
      setSettings(saved);
      setNotice('Los cambios ya están publicados en la tienda.');
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SiteSettings, value: string) =>
    setSettings((current) =>
      current ? { ...current, [key]: value } : current,
    );

  const editProduct = (product?: Product) => {
    setProductDraft(
      product
        ? {
            id: product.id,
            name: product.name,
            brand: product.brand,
            description: product.description ?? '',
            gender: product.gender,
            sizeMl: product.sizeMl?.toString() ?? '',
            price: product.price.toString(),
            compareAtPrice: product.compareAtPrice?.toString() ?? '',
            freeShipping: product.freeShipping,
            shippingFee: product.shippingFee?.toString() ?? '',
            stock: product.stock.toString(),
            originalStock: product.stock,
            imageUrl: product.imageUrl,
            imageUrls: product.images?.length
              ? product.images.map((image) => image.url)
              : [product.imageUrl],
            notesCsv: product.notesCsv ?? '',
            categoryId: product.categoryId ?? '',
            featured: product.featured,
            bestseller: product.bestseller,
            isActive: product.isActive,
            sortOrder: product.sortOrder.toString(),
          }
        : { ...emptyProduct },
    );
    setProductDialog(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: productDraft.name,
      brand: productDraft.brand,
      description: productDraft.description || null,
      gender: productDraft.gender,
      sizeMl: productDraft.sizeMl ? Number(productDraft.sizeMl) : null,
      price: Number(productDraft.price),
      compareAtPrice: productDraft.compareAtPrice
        ? Number(productDraft.compareAtPrice)
        : null,
      freeShipping: productDraft.freeShipping,
      shippingFee: productDraft.freeShipping
        ? null
        : Number(productDraft.shippingFee),
      stock: Number(productDraft.stock),
      originalStock: productDraft.originalStock,
      imageUrl: productDraft.imageUrl,
      images: productDraft.imageUrls.map((url) => ({
        url,
        altText: productDraft.name,
      })),
      notesCsv: productDraft.notesCsv || null,
      categoryId: productDraft.categoryId || null,
      featured: productDraft.featured,
      bestseller: productDraft.bestseller,
      isActive: productDraft.isActive,
      sortOrder: Number(productDraft.sortOrder),
    };
    try {
      await apiFetch(
        productDraft.id
          ? `/api/admin/products/${productDraft.id}`
          : '/api/admin/products',
        {
          method: productDraft.id ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );
      setProductDialog(false);
      setNotice(productDraft.id ? 'Producto actualizado.' : 'Producto creado.');
      await loadAdmin();
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (product: Product) => {
    if (!confirm(`¿Ocultar “${product.name}” de la tienda?`)) return;
    try {
      await apiFetch(
        `/api/admin/products/${product.id}`,
        { method: 'DELETE' },
        token,
      );
      setNotice('Producto ocultado.');
      await loadAdmin();
    } catch (caught) {
      handleApiError(caught);
    }
  };

  const createCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await apiFetch(
        '/api/admin/categories',
        {
          method: 'POST',
          body: JSON.stringify({
            name: form.get('name'),
            description: form.get('description'),
            sortOrder: categories.length + 1,
            isActive: true,
          }),
        },
        token,
      );
      event.currentTarget.reset();
      setNotice('Categoría creada.');
      await loadAdmin();
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (item: Category) => {
    try {
      await apiFetch(
        `/api/admin/categories/${item.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: item.name,
            description: item.description,
            sortOrder: item.sortOrder,
            isActive: !item.isActive,
          }),
        },
        token,
      );
      await loadAdmin();
    } catch (caught) {
      handleApiError(caught);
    }
  };


  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products.filter(
      (product) =>
        !term ||
        `${product.name} ${product.brand} ${product.categoryName ?? ''}`
          .toLowerCase()
          .includes(term),
    );
  }, [productSearch, products]);

  const handleProductImages = async (files?: FileList | null) => {
    if (!files?.length) return;
    try {
      const imageUrls = await Promise.all(
        Array.from(files)
          .slice(0, 8)
          .map((file) => readImage(file)),
      );
      setProductDraft((draft) => {
        const next = [...draft.imageUrls, ...imageUrls].slice(0, 8);
        return { ...draft, imageUrl: next[0] ?? '', imageUrls: next };
      });
    } catch (caught) {
      handleApiError(caught);
    }
  };

  if (checkingSession)
    return (
      <main className="grid min-h-screen place-items-center bg-[#11100d]">
        <LoaderCircle className="size-6 animate-spin text-[#d8b96e]" />
      </main>
    );

  if (!token)
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#11100d] px-5 text-white">
        <div className="absolute inset-0 opacity-25 [background:radial-gradient(circle_at_75%_25%,#9a6e20,transparent_34%),radial-gradient(circle_at_20%_80%,#6e4d1e,transparent_35%)]" />
        <a
          href="/"
          className="absolute left-5 top-5 flex items-center gap-2 text-xs text-white/55 hover:text-white sm:left-8 sm:top-8"
        >
          <ArrowLeft className="size-4" /> Volver a la tienda
        </a>
        <form
          onSubmit={login}
          className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[.055] p-7 shadow-2xl backdrop-blur-xl sm:p-10"
        >
          <div className="mb-8">
            <span className="grid size-14 place-items-center rounded-full border border-[#d8b96e]/35 bg-black/30 font-heading text-2xl text-[#d8b96e]">
              P
            </span>
            <p className="mt-7 text-[10px] font-bold uppercase tracking-[.22em] text-[#d8b96e]">
              Backstage El Padrino
            </p>
            <h1 className="mt-2 font-heading text-4xl font-semibold">
              Administra tu vitrina
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/45">
              Productos, pedidos y toda la identidad de la tienda en un solo
              lugar.
            </p>
          </div>
          <div className="grid gap-4">
            <Field label="Correo">
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@elpadrino.ec"
                className="h-12 border-white/12 bg-white/5 px-4 text-white placeholder:text-white/25"
              />
            </Field>
            <Field label="Contraseña">
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="h-12 border-white/12 bg-white/5 px-4 text-white placeholder:text-white/25"
              />
            </Field>
            {error && (
              <p className="rounded-xl bg-red-500/12 px-4 py-3 text-xs text-red-200">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="mt-2 h-12 rounded-full bg-[#d8b96e] font-bold text-black hover:bg-[#ead18e]"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LockKeyhole />
              )}{' '}
              Entrar al administrador
            </Button>
          </div>
        </form>
      </main>
    );

  const navItems: Array<{
    id: View;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'categories', label: 'Categorías', icon: Tags },
    { id: 'commerce', label: 'Compras y correo', icon: MailIcon },
    { id: 'design', label: 'Diseño y datos', icon: Palette },
  ];

  return (
    <main className="min-h-screen bg-[#f3f0e9] text-[#181713] lg:grid lg:grid-cols-[255px_1fr]">
      <aside className="border-b border-black/8 bg-[#11100d] p-4 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:p-6">
        <div className="flex items-center justify-between lg:block">
          <a href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full border border-[#d8b96e]/35 font-heading text-xl text-[#d8b96e]">
              P
            </span>
            <span className="font-heading tracking-[.12em]">EL PADRINO</span>
          </a>
          <Button
            onClick={() => void logout()}
            variant="ghost"
            size="icon"
            className="text-white/45 hover:bg-white/8 hover:text-white lg:hidden"
          >
            <LogOut />
          </Button>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-10 lg:grid lg:overflow-visible lg:pb-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm transition lg:w-full ${view === item.id ? 'bg-[#d8b96e] font-bold text-black' : 'text-white/55 hover:bg-white/6 hover:text-white'}`}
            >
              <item.icon className="size-4" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-6 left-6 right-6 hidden lg:block">
          <a
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-xs text-white/55 hover:bg-white/5 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Eye className="size-4" /> Ver tienda
            </span>
            <ExternalLink className="size-3" />
          </a>
          <button
            onClick={() => void logout()}
            className="mt-2 flex w-full items-center gap-2 px-4 py-3 text-xs text-white/35 hover:text-white"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <section className="min-w-0 p-4 sm:p-7 lg:p-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8a6c29]">
              Panel administrativo
            </p>
            <h1 className="mt-1 font-heading text-4xl font-semibold">
              {navItems.find((item) => item.id === view)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              className="hidden h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-xs font-semibold sm:flex"
            >
              <Eye className="size-4" /> Ver tienda
            </a>
            <button
              onClick={() => void loadAdmin()}
              className="grid size-10 place-items-center rounded-full border border-black/10 bg-white"
              aria-label="Actualizar datos"
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Settings2 className="size-4" />
              )}
            </button>
          </div>
        </header>
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {view === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  [Package, 'Productos activos', summary?.activeProducts ?? 0],
                  [AlertTriangle, 'Stock bajo', summary?.lowStockProducts ?? 0],
                  [
                    MessageCircle,
                    'Pedidos por atender',
                    summary?.pendingOrders ?? 0,
                  ],
                  [
                    CircleDollarSign,
                    'Potencial del mes',
                    money(
                      summary?.monthPotentialRevenue ?? 0,
                      settings?.currency,
                    ),
                  ],
                ] as Array<[LucideIcon, string, string | number]>
              ).map(([Icon, label, value]) => (
                <article
                  key={String(label)}
                  className="rounded-[1.5rem] border border-black/7 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#f0e6cf] text-[#8a6c29]">
                      <Icon className="size-5" />
                    </span>
                    <ChevronRight className="size-4 text-black/20" />
                  </div>
                  <p className="mt-8 text-3xl font-bold tracking-tight">
                    {String(value)}
                  </p>
                  <p className="mt-1 text-xs text-black/42">{String(label)}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
              <article className="rounded-[1.5rem] border border-black/7 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-semibold">
                      Pedidos recientes
                    </h2>
                    <p className="mt-1 text-xs text-black/42">
                      Conversaciones creadas desde la web
                    </p>
                  </div>
                  <Button
                    onClick={() => setView('orders')}
                    variant="outline"
                    className="rounded-full"
                  >
                    Ver todos
                  </Button>
                </div>
                <div className="mt-5 divide-y divide-black/7">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {order.customerName}
                        </p>
                        <p className="mt-1 text-xs text-black/40">
                          {order.orderNumber} ·{' '}
                          {new Date(order.createdAt).toLocaleDateString(
                            'es-EC',
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {money(order.total, settings?.currency)}
                        </p>
                        <span className="text-[10px] text-[#8a6c29]">
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!orders.length && (
                    <p className="py-12 text-center text-sm text-black/40">
                      Aún no hay pedidos. La tienda está lista para recibirlos.
                    </p>
                  )}
                </div>
              </article>
              <article className="rounded-[1.5rem] bg-[#171611] p-7 text-white">
                <span className="grid size-11 place-items-center rounded-full bg-[#d8b96e] text-black">
                  <Store className="size-5" />
                </span>
                <h2 className="mt-7 font-heading text-3xl font-semibold">
                  Tu vitrina está en vivo.
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/45">
                  Cada cambio guardado en diseño o productos aparece en la
                  tienda al recargar.
                </p>
                <Button
                  onClick={() => setView('design')}
                  className="mt-7 h-11 rounded-full bg-white px-5 text-black"
                >
                  Personalizar ahora <ArrowLeft className="rotate-180" />
                </Button>
              </article>
            </div>
          </div>
        )}

        {view === 'products' && (
          <div>
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
              <label className="flex h-11 items-center gap-2 rounded-full border border-black/8 bg-white px-4 sm:w-80">
                <Search className="size-4 text-black/35" />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Buscar producto…"
                />
              </label>
              <Button
                onClick={() => editProduct()}
                className="h-11 rounded-full bg-black px-5 text-white"
              >
                <Plus /> Nuevo producto
              </Button>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-black/7 bg-white">
              <div className="hidden grid-cols-[minmax(260px,1fr)_130px_90px_110px_100px] gap-3 border-b border-black/7 px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-black/35 md:grid">
                <span>Producto</span>
                <span>Categoría</span>
                <span>Precio</span>
                <span>Stock</span>
                <span></span>
              </div>
              <div className="divide-y divide-black/7">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="grid gap-4 p-4 md:grid-cols-[minmax(260px,1fr)_130px_90px_110px_100px] md:items-center md:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        className="size-14 rounded-xl bg-[#eee8dc] object-cover"
                        src={product.imageUrl}
                        alt=""
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {product.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-black/38">
                          {product.brand} ·{' '}
                          {product.sizeMl
                            ? `${product.sizeMl} ml`
                            : 'Sin tamaño'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-black/50">
                      {product.categoryName ?? 'Sin categoría'}
                    </span>
                    <div>
                      <span className="text-sm font-semibold">
                        {money(product.price, settings?.currency)}
                      </span>
                      <span
                        className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${product.freeShipping ? 'text-green-700' : 'text-[#8a6c29]'}`}
                      >
                        <Truck className="size-3" />
                        {product.freeShipping
                          ? 'Envío gratis'
                          : `+ ${money(product.shippingFee ?? 0, settings?.currency)}`}
                      </span>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold ${product.stock <= 3 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
                    >
                      {product.stock} unidades
                    </span>
                    <div className="flex justify-end gap-1">
                      <Button
                        onClick={() => editProduct(product)}
                        size="icon"
                        variant="ghost"
                        aria-label={`Editar ${product.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        onClick={() => void removeProduct(product)}
                        size="icon"
                        variant="ghost"
                        className="text-red-700"
                        aria-label={`Ocultar ${product.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'orders' && (
          <div className="grid gap-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-[1.5rem] border border-black/7 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-2xl font-semibold">
                        {order.customerName}
                      </h2>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold">
                        {order.orderNumber}
                      </span>
                      {order.inventoryCommitted && (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-[10px] font-bold text-green-700">
                          Stock descontado
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-black/45">
                      {order.customerPhone}
                      {order.city ? ` · ${order.city}` : ''} ·{' '}
                      {new Date(order.createdAt).toLocaleString('es-EC')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="text-lg">
                      {money(order.total, settings?.currency)}
                    </strong>
                  </div>
                </div>
                <div className="mt-5 grid gap-2 rounded-xl bg-[#f7f4ed] p-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-3 text-xs"
                    >
                      <span>
                        {item.quantity}× {item.productName}
                      </span>
                      <span className="font-semibold">
                        {money(
                          item.unitPrice * item.quantity,
                          settings?.currency,
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between border-t border-black/8 pt-3 text-xs text-black/55">
                    <span>Subtotal</span>
                    <span>{money(order.subtotal, settings?.currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Envío</span>
                    <span
                      className={
                        order.shippingTotal === 0 ? 'text-green-700' : ''
                      }
                    >
                      {order.shippingTotal === 0
                        ? 'Gratis'
                        : money(order.shippingTotal, settings?.currency)}
                    </span>
                  </div>
                </div>
                <OrderActions order={order} token={token} onChanged={() => loadAdmin()} />
                {order.notes && (
                  <p className="mt-4 text-xs text-black/50">
                    <b>Notas:</b> {order.notes}
                  </p>
                )}
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-green-700"
                >
                  <MessageCircle className="size-4" /> Abrir conversación
                </a>
              </article>
            ))}
            {!orders.length && (
              <div className="rounded-[1.5rem] bg-white py-20 text-center">
                <ShoppingBag className="mx-auto size-7 text-black/20" />
                <h2 className="mt-4 font-heading text-3xl">
                  Aún no hay pedidos
                </h2>
                <p className="mt-2 text-sm text-black/42">
                  Los nuevos pedidos aparecerán aquí automáticamente.
                </p>
              </div>
            )}
          </div>
        )}

        {view === 'categories' && (
          <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
            <form
              onSubmit={createCategory}
              className="h-fit rounded-[1.5rem] border border-black/7 bg-white p-6"
            >
              <h2 className="font-heading text-2xl font-semibold">
                Nueva categoría
              </h2>
              <p className="mt-1 text-xs text-black/42">
                Agrupa el catálogo para navegar mejor.
              </p>
              <div className="mt-6 grid gap-4">
                <Field label="Nombre">
                  <Input
                    name="name"
                    required
                    minLength={2}
                    className="h-11"
                    placeholder="Ej. Nicho"
                  />
                </Field>
                <Field label="Descripción">
                  <Textarea name="description" placeholder="Una frase breve" />
                </Field>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-full"
                >
                  <Plus /> Crear categoría
                </Button>
              </div>
            </form>
            <div className="overflow-hidden rounded-[1.5rem] border border-black/7 bg-white">
              <div className="border-b border-black/7 px-6 py-5">
                <h2 className="font-heading text-2xl font-semibold">
                  Categorías actuales
                </h2>
              </div>
              <div className="divide-y divide-black/7">
                {categories.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-6 py-5"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="mt-1 text-xs text-black/40">
                        {item.description || 'Sin descripción'} ·{' '}
                        {
                          products.filter(
                            (product) => product.categoryId === item.id,
                          ).length
                        }{' '}
                        productos
                      </p>
                    </div>
                    <button
                      onClick={() => void toggleCategory(item)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${item.isActive ? 'bg-green-50 text-green-700' : 'bg-black/5 text-black/40'}`}
                    >
                      {item.isActive ? 'Visible' : 'Oculta'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'commerce' && <CommerceAdmin token={token} />}

        {view === 'design' && settings && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-[1.5rem] bg-[#171611] p-5 text-white sm:p-6">
              <div>
                <h2 className="font-heading text-2xl font-semibold">
                  Identidad de la tienda
                </h2>
                <p className="mt-1 text-xs text-white/40">
                  Todo lo que guardes aquí se refleja en la vitrina.
                </p>
              </div>
              <Button
                disabled={saving}
                onClick={() => void saveSettings()}
                className="h-11 rounded-full bg-[#d8b96e] px-5 font-bold text-black"
              >
                {saving ? <LoaderCircle className="animate-spin" /> : <Save />}{' '}
                Guardar cambios
              </Button>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <article className="rounded-[1.5rem] border border-black/7 bg-white p-6">
                <h3 className="font-heading text-2xl font-semibold">
                  Marca y contacto
                </h3>
                <div className="mt-6 grid gap-4">
                  <Field label="Nombre de la tienda">
                    <Input
                      className="h-11"
                      value={settings.storeName}
                      onChange={(event) =>
                        updateSetting('storeName', event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Frase de marca">
                    <Input
                      className="h-11"
                      value={settings.tagline}
                      onChange={(event) =>
                        updateSetting('tagline', event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Anuncio superior">
                    <Input
                      className="h-11"
                      value={settings.announcement}
                      onChange={(event) =>
                        updateSetting('announcement', event.target.value)
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="WhatsApp">
                      <Input
                        className="h-11"
                        value={settings.whatsAppNumber}
                        onChange={(event) =>
                          updateSetting('whatsAppNumber', event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Instagram">
                      <Input
                        className="h-11"
                        value={settings.instagramUrl}
                        onChange={(event) =>
                          updateSetting('instagramUrl', event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Ubicación / cobertura">
                    <Input
                      className="h-11"
                      value={settings.address}
                      onChange={(event) =>
                        updateSetting('address', event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Texto de envíos">
                    <Input
                      className="h-11"
                      value={settings.deliveryText}
                      onChange={(event) =>
                        updateSetting('deliveryText', event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Mensaje inicial de WhatsApp">
                    <Textarea
                      value={settings.whatsAppGreeting}
                      onChange={(event) =>
                        updateSetting('whatsAppGreeting', event.target.value)
                      }
                    />
                  </Field>
                </div>
              </article>
              <article className="rounded-[1.5rem] border border-black/7 bg-white p-6">
                <h3 className="font-heading text-2xl font-semibold">
                  Portada y relato
                </h3>
                <div className="mt-6 grid gap-4">
                  <Field label="Etiqueta de portada">
                    <Input
                      className="h-11"
                      value={settings.heroEyebrow}
                      onChange={(event) =>
                        updateSetting('heroEyebrow', event.target.value)
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Título">
                      <Input
                        className="h-11"
                        value={settings.heroTitle}
                        onChange={(event) =>
                          updateSetting('heroTitle', event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Título dorado">
                      <Input
                        className="h-11"
                        value={settings.heroAccent}
                        onChange={(event) =>
                          updateSetting('heroAccent', event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Descripción de portada">
                    <Textarea
                      value={settings.heroDescription}
                      onChange={(event) =>
                        updateSetting('heroDescription', event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Título de historia">
                    <Input
                      className="h-11"
                      value={settings.aboutTitle}
                      onChange={(event) =>
                        updateSetting('aboutTitle', event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Historia de la marca">
                    <Textarea
                      className="min-h-28"
                      value={settings.aboutText}
                      onChange={(event) =>
                        updateSetting('aboutText', event.target.value)
                      }
                    />
                  </Field>
                </div>
              </article>
              <article className="rounded-[1.5rem] border border-black/7 bg-white p-6">
                <h3 className="font-heading text-2xl font-semibold">
                  Imágenes
                </h3>
                <div className="mt-6 grid gap-5">
                  <Field
                    label="Logo"
                    hint="Puedes pegar una URL o subir JPG/PNG/WebP de hasta 2 MB."
                  >
                    <div className="flex items-center gap-3">
                      {settings.logoUrl ? (
                        <img
                          className="size-16 rounded-xl bg-black object-cover"
                          src={settings.logoUrl}
                          alt="Logo actual"
                        />
                      ) : (
                        <span className="grid size-16 place-items-center rounded-xl bg-black font-heading text-2xl text-[#d8b96e]">
                          P
                        </span>
                      )}
                      <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-black/10 px-4 text-xs font-bold">
                        <Upload className="size-4" /> Subir logo
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            try {
                              updateSetting('logoUrl', await readImage(file));
                            } catch (caught) {
                              handleApiError(caught);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <Input
                      value={settings.logoUrl ?? ''}
                      onChange={(event) =>
                        updateSetting('logoUrl', event.target.value)
                      }
                      placeholder="https://…"
                    />
                  </Field>
                  <Field
                    label="Imagen principal"
                    hint="Recomendado: imagen horizontal oscura, mínimo 1600 px."
                  >
                    <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-black">
                      <img
                        className="h-full w-full object-cover opacity-70"
                        src={settings.heroImageUrl}
                        alt="Portada actual"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={settings.heroImageUrl}
                        onChange={(event) =>
                          updateSetting('heroImageUrl', event.target.value)
                        }
                        placeholder="https://…"
                      />
                      <label className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-black text-white">
                        <ImagePlus className="size-4" />
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            try {
                              updateSetting(
                                'heroImageUrl',
                                await readImage(file),
                              );
                            } catch (caught) {
                              handleApiError(caught);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </Field>
                </div>
              </article>
              <article className="rounded-[1.5rem] border border-black/7 bg-white p-6">
                <h3 className="font-heading text-2xl font-semibold">Colores</h3>
                <p className="mt-1 text-xs text-black/42">
                  Controla la atmósfera completa sin tocar código.
                </p>
                <div className="mt-6 grid gap-4">
                  {(
                    [
                      ['primaryColor', 'Color principal'],
                      ['accentColor', 'Color de acento'],
                      ['backgroundColor', 'Fondo de catálogo'],
                    ] as Array<
                      [
                        'primaryColor' | 'accentColor' | 'backgroundColor',
                        string,
                      ]
                    >
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          value={settings[key]}
                          onChange={(event) =>
                            updateSetting(key, event.target.value)
                          }
                          className="h-11 w-14 cursor-pointer rounded-lg border border-black/8 bg-white p-1"
                        />
                        <Input
                          className="h-11 font-mono"
                          value={settings[key]}
                          onChange={(event) =>
                            updateSetting(key, event.target.value)
                          }
                        />
                      </div>
                    </Field>
                  ))}
                </div>
                <div
                  className="mt-7 overflow-hidden rounded-2xl"
                  style={{ background: settings.backgroundColor }}
                >
                  <div
                    className="p-5 text-white"
                    style={{ background: settings.primaryColor }}
                  >
                    <p className="font-heading text-2xl">Vista previa</p>
                    <p className="mt-1 text-xs opacity-60">
                      {settings.tagline}
                    </p>
                    <span
                      className="mt-5 inline-flex rounded-full px-4 py-2 text-xs font-bold text-black"
                      style={{ background: settings.accentColor }}
                    >
                      Comprar ahora
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        )}
      </section>

      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        {/* Previous compact draft retained temporarily during formatting.
        <DialogContent className="max-h-[94vh] overflow-y-auto rounded-[1.5rem] p-0 sm:max-w-3xl"><form onSubmit={saveProduct}><div className="border-b border-black/8 p-6"><DialogHeader><DialogTitle className="font-heading text-3xl font-semibold">{productDraft.id ? 'Editar producto' : 'Nuevo producto'}</DialogTitle><DialogDescription>Actualiza catálogo, precio, imagen e inventario.</DialogDescription></DialogHeader></div><div className="grid gap-5 p-6 sm:grid-cols-2"><Field label="Nombre"><Input required minLength={2} className="h-11" value={productDraft.name} onChange={event => setProductDraft(draft => ({...draft,name:event.target.value}))} /></Field><Field label="Marca"><Input required minLength={2} className="h-11" value={productDraft.brand} onChange={event => setProductDraft(draft => ({...draft,brand:event.target.value}))} /></Field><Field label="Categoría"><select className="h-11 rounded-lg border border-black/12 bg-white px-3 text-sm outline-none" value={productDraft.categoryId} onChange={event => setProductDraft(draft => ({...draft,categoryId:event.target.value}))}><option value="">Sin categoría</option>{categories.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Público"><select className="h-11 rounded-lg border border-black/12 bg-white px-3 text-sm outline-none" value={productDraft.gender} onChange={event => setProductDraft(draft => ({...draft,gender:event.target.value}))}><option>Dama</option><option>Caballero</option><option>Unisex</option></select></Field><div className="grid grid-cols-2 gap-3"><Field label="Precio"><Input required min={0.01} step="0.01" type="number" className="h-11" value={productDraft.price} onChange={event => setProductDraft(draft => ({...draft,price:event.target.value}))} /></Field><Field label="Precio anterior"><Input min={0.01} step="0.01" type="number" className="h-11" value={productDraft.compareAtPrice} onChange={event => setProductDraft(draft => ({...draft,compareAtPrice:event.target.value}))} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Tamaño (ml)"><Input min={1} type="number" className="h-11" value={productDraft.sizeMl} onChange={event => setProductDraft(draft => ({...draft,sizeMl:event.target.value}))} /></Field><Field label="Stock"><Input required min={0} type="number" className="h-11" value={productDraft.stock} onChange={event => setProductDraft(draft => ({...draft,stock:event.target.value}))} /></Field></div><div className="sm:col-span-2"><Field label="Descripción"><Textarea className="min-h-24" value={productDraft.description} onChange={event => setProductDraft(draft => ({...draft,description:event.target.value}))} /></Field></div><Field label="Notas separadas por coma"><Input className="h-11" placeholder="ámbar, vainilla, madera" value={productDraft.notesCsv} onChange={event => setProductDraft(draft => ({...draft,notesCsv:event.target.value}))} /></Field><Field label="Orden"><Input min={0} type="number" className="h-11" value={productDraft.sortOrder} onChange={event => setProductDraft(draft => ({...draft,sortOrder:event.target.value}))} /></Field><div className="sm:col-span-2"><Field label="Imagen del producto" hint="Pega una URL o sube una imagen de hasta 2 MB."><div className="flex gap-3">{productDraft.imageUrl && <img className="size-20 rounded-xl bg-[#eee8dc] object-cover" src={productDraft.imageUrl} alt="Vista previa" />}<div className="grid flex-1 gap-2"><Input required className="h-11" value={productDraft.imageUrl} onChange={event => setProductDraft(draft => ({...draft,imageUrl:event.target.value}))} placeholder="https://…" /><label className="flex h-10 w-fit cursor-pointer items-center gap-2 rounded-full border border-black/10 px-4 text-xs font-bold"><Upload className="size-4" /> Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async event => { const file=event.target.files?.[0]; if(!file)return; try{setProductDraft(draft => ({...draft,imageUrl:await readImage(file)}));}catch(caught){handleApiError(caught);} }} /></label></div></div></Field></div><div className="flex flex-wrap gap-5 sm:col-span-2">{([['featured','Destacado'],['bestseller','Más vendido'],['isActive','Visible en tienda']] as Array<[keyof ProductDraft,string]>).map(([key,label]) => <label key={key} className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={Boolean(productDraft[key])} onChange={event => setProductDraft(draft => ({...draft,[key]:event.target.checked}))} className="size-4 accent-black" /> {label}</label>)}</div></div><div className="flex justify-end gap-3 border-t border-black/8 bg-[#f7f4ed] p-5"><Button type="button" variant="outline" onClick={() => setProductDialog(false)} className="rounded-full">Cancelar</Button><Button disabled={saving} type="submit" className="rounded-full px-6">{saving ? <LoaderCircle className="animate-spin" /> : <Save />} Guardar producto</Button></div></form></DialogContent>
        */}
        <DialogContent className="max-h-[94vh] overflow-y-auto rounded-[1.5rem] p-0 sm:max-w-3xl">
          <form onSubmit={saveProduct}>
            <div className="border-b border-black/8 p-6">
              <DialogHeader>
                <DialogTitle className="font-heading text-3xl font-semibold">
                  {productDraft.id ? 'Editar producto' : 'Nuevo producto'}
                </DialogTitle>
                <DialogDescription>
                  Actualiza catálogo, precio, imagen e inventario.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <Field label="Nombre">
                <Input
                  required
                  minLength={2}
                  className="h-11"
                  value={productDraft.name}
                  onChange={(event) =>
                    setProductDraft((draft) => ({
                      ...draft,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Marca">
                <Input
                  required
                  minLength={2}
                  className="h-11"
                  value={productDraft.brand}
                  onChange={(event) =>
                    setProductDraft((draft) => ({
                      ...draft,
                      brand: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Categoría">
                <select
                  className="h-11 rounded-lg border border-black/12 bg-white px-3 text-sm outline-none"
                  value={productDraft.categoryId}
                  onChange={(event) =>
                    setProductDraft((draft) => ({
                      ...draft,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sin categoría</option>
                  {categories
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Público">
                <select
                  className="h-11 rounded-lg border border-black/12 bg-white px-3 text-sm outline-none"
                  value={productDraft.gender}
                  onChange={(event) =>
                    setProductDraft((draft) => ({
                      ...draft,
                      gender: event.target.value,
                    }))
                  }
                >
                  <option>Dama</option>
                  <option>Caballero</option>
                  <option>Unisex</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio de venta">
                  <Input
                    required
                    min={0.01}
                    step="0.01"
                    type="number"
                    className="h-11"
                    value={productDraft.price}
                    onChange={(event) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        price: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field
                  label="Precio anterior (oferta)"
                  hint="Déjalo vacío para precio normal; si lo completas debe ser mayor al precio de venta."
                >
                  <Input
                    min={0.01}
                    step="0.01"
                    type="number"
                    className="h-11"
                    value={productDraft.compareAtPrice}
                    onChange={(event) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        compareAtPrice: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tamaño (ml)">
                  <Input
                    min={1}
                    type="number"
                    className="h-11"
                    value={productDraft.sizeMl}
                    onChange={(event) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        sizeMl: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Stock">
                  <Input
                    required
                    min={0}
                    type="number"
                    className="h-11"
                    value={productDraft.stock}
                    onChange={(event) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        stock: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-4 rounded-2xl border border-black/8 bg-[#f7f4ed] p-4 sm:col-span-2 sm:grid-cols-[1fr_220px] sm:items-end">
                <Field
                  label="Tipo de envío"
                  hint="Esta información aparecerá en el catálogo, el detalle y el pedido de WhatsApp."
                >
                  <select
                    className="h-11 rounded-lg border border-black/12 bg-white px-3 text-sm outline-none"
                    value={productDraft.freeShipping ? 'free' : 'paid'}
                    onChange={(event) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        freeShipping: event.target.value === 'free',
                      }))
                    }
                  >
                    <option value="free">Envío gratis</option>
                    <option value="paid">Envío con costo</option>
                  </select>
                </Field>
                <Field
                  label="Costo de envío"
                  hint={
                    productDraft.freeShipping
                      ? 'No se sumará ningún valor.'
                      : 'Se sumará una vez por perfume distinto.'
                  }
                >
                  <Input
                    required={!productDraft.freeShipping}
                    disabled={productDraft.freeShipping}
                    min={0.01}
                    step="0.01"
                    type="number"
                    className="h-11 disabled:bg-black/5"
                    placeholder="Ej. 5.00"
                    value={productDraft.shippingFee}
                    onChange={(event) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        shippingFee: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Descripción">
                  <Textarea
                    className="min-h-24"
                    value={productDraft.description}
                    onChange={(event) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        description: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <Field label="Notas separadas por coma">
                <Input
                  className="h-11"
                  placeholder="ámbar, vainilla, madera"
                  value={productDraft.notesCsv}
                  onChange={(event) =>
                    setProductDraft((draft) => ({
                      ...draft,
                      notesCsv: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Orden">
                <Input
                  min={0}
                  type="number"
                  className="h-11"
                  value={productDraft.sortOrder}
                  onChange={(event) =>
                    setProductDraft((draft) => ({
                      ...draft,
                      sortOrder: event.target.value,
                    }))
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Galería del producto"
                  hint="La primera foto es la portada. Puedes cargar hasta 8 imágenes de 2 MB cada una."
                >
                  <div className="grid gap-3">
                    {productDraft.imageUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                        {productDraft.imageUrls.map((url, index) => (
                          <div
                            key={`${url.slice(0, 40)}-${index}`}
                            className="group relative aspect-square overflow-hidden rounded-xl bg-[#eee8dc]"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setProductDraft((draft) => {
                                  const next = [
                                    url,
                                    ...draft.imageUrls.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    ),
                                  ];
                                  return {
                                    ...draft,
                                    imageUrl: next[0],
                                    imageUrls: next,
                                  };
                                })
                              }
                              className="h-full w-full"
                              aria-label={`Usar foto ${index + 1} como portada`}
                            >
                              <img
                                className="h-full w-full object-cover"
                                src={url}
                                alt={`Foto ${index + 1}`}
                              />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded-full bg-black/75 px-2 py-1 text-[8px] font-bold text-white">
                              {index === 0 ? 'PORTADA' : index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setProductDraft((draft) => {
                                  const next = draft.imageUrls.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  );
                                  return {
                                    ...draft,
                                    imageUrl: next[0] ?? '',
                                    imageUrls: next,
                                  };
                                })
                              }
                              className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white text-red-700 shadow"
                              aria-label={`Eliminar foto ${index + 1}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        required
                        className="h-11"
                        value={productDraft.imageUrl}
                        onChange={(event) =>
                          setProductDraft((draft) => {
                            const value = event.target.value;
                            const next = draft.imageUrls.length
                              ? [value, ...draft.imageUrls.slice(1)]
                              : value
                                ? [value]
                                : [];
                            return {
                              ...draft,
                              imageUrl: value,
                              imageUrls: next,
                            };
                          })
                        }
                        placeholder="URL de la foto de portada"
                      />
                      <label className="flex h-10 w-fit cursor-pointer items-center gap-2 rounded-full border border-black/10 px-4 text-xs font-bold">
                        <Upload className="size-4" /> Subir fotos
                        <input
                          type="file"
                          multiple
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) =>
                            void handleProductImages(event.target.files)
                          }
                        />
                      </label>
                    </div>
                  </div>
                </Field>
              </div>
              <div className="flex flex-wrap gap-5 sm:col-span-2">
                {(
                  [
                    ['featured', 'Destacado'],
                    ['bestseller', 'Más vendido'],
                    ['isActive', 'Visible en tienda'],
                  ] as Array<[keyof ProductDraft, string]>
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-xs font-semibold"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(productDraft[key])}
                      onChange={(event) =>
                        setProductDraft((draft) => ({
                          ...draft,
                          [key]: event.target.checked,
                        }))
                      }
                      className="size-4 accent-black"
                    />{' '}
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-black/8 bg-[#f7f4ed] p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductDialog(false)}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button
                disabled={saving}
                type="submit"
                className="rounded-full px-6"
              >
                {saving ? <LoaderCircle className="animate-spin" /> : <Save />}{' '}
                Guardar producto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {notice && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold text-white shadow-2xl"
        >
          <Check className="size-4 text-[#d8b96e]" /> {notice}
        </div>
      )}
    </main>
  );
}
