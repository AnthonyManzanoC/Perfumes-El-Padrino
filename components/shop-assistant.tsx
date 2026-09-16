'use client';
/* oxlint-disable react/react-compiler */
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NewProductBadge } from '@/components/new-product-badge';
import {
  MessageCircle,
  Volume2,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Sparkles,
  X,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { recommend, helpText, normalize } from '@/lib/shop-assistant';
import type { Product, CartEntry } from '@/lib/store-types';

type Props = {
  products: Product[];
  cart: CartEntry[];
  currency: string;
  whatsapp: string;
  onAdd: (p: Product) => void;
  onQuantity: (p: Product, quantity: number) => void;
  onCart: () => void;
};
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: object;
  execute: (args: Record<string, unknown>) => Promise<string>;
};
type Context = {
  registerTool: (tool: Tool, options: { signal: AbortSignal }) => Promise<void>;
};
export function ShopAssistant(props: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('');
  const [scent, setScent] = useState('');
  const [budget, setBudget] = useState('');
  const [request, setRequest] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [answer, setAnswer] = useState(
    'Hola, ¿qué aroma tienes en mente? Dime una marca, un perfume o una nota que te guste. También puedo ayudarte con tu compra.',
  );
  const [results, setResults] = useState<Product[]>([]);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context) return;
    const controller = new AbortController();
    const result = (value: unknown) => JSON.stringify(value);
    const properties = {
      query: {
        type: 'string',
        description: 'Nombre, marca o notas del perfume.',
      },
      budget: {
        type: 'number',
        minimum: 0,
        description: 'Precio máximo en la moneda de la tienda.',
      },
    };
    const tools: Tool[] = [
      {
        name: 'padrino_search_perfumes',
        description:
          'Busca perfumes disponibles por nombre, marca, aroma y presupuesto en el catálogo público.',
        inputSchema: { type: 'object', properties },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (a) =>
          result(
            recommend(latest.current.products, {
              query: typeof a.query === 'string' ? a.query.slice(0, 120) : '',
              budget:
                typeof a.budget === 'number' && a.budget >= 0
                  ? a.budget
                  : undefined,
            }).map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              price: p.price,
              currency: latest.current.currency,
              notes: p.notesCsv,
              url: `/perfumes/${p.slug}`,
            })),
          ),
      },
      {
        name: 'padrino_read_cart',
        description:
          'Consulta la selección del carrito local. El precio final se verifica al crear el pedido.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () =>
          result(
            latest.current.cart.map((e) => ({
              ...e,
              name: latest.current.products.find((p) => p.id === e.productId)
                ?.name,
            })),
          ),
      },
      {
        name: 'padrino_set_cart_quantity',
        description:
          'Cambia la cantidad de un perfume en el carrito local, sin crear pedidos ni pagar. Cero quita el perfume.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'ID del catálogo.' },
            quantity: {
              type: 'integer',
              minimum: 0,
              maximum: 20,
              description: 'Cantidad total deseada.',
            },
          },
          required: ['productId', 'quantity'],
        },
        execute: async (a) => {
          const p = latest.current.products.find((p) => p.id === a.productId);
          if (
            !p ||
            !Number.isInteger(a.quantity) ||
            (a.quantity as number) < 0 ||
            (a.quantity as number) > Math.min(20, p.stock)
          )
            throw new Error('Perfume o cantidad no disponible.');
          latest.current.onQuantity(p, a.quantity as number);
          return result({
            message:
              'Carrito actualizado. Revisa tu selección antes de comprar.',
          });
        },
      },
      {
        name: 'padrino_open_checkout',
        description:
          'Abre el carrito para que el cliente revise y complete personalmente su compra.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          setOpen(false);
          latest.current.onCart();
          return 'Carrito abierto.';
        },
      },
      {
        name: 'padrino_purchase_help',
        description:
          'Explica pago por transferencia, envío y regreso al pedido mediante correo. No consulta datos privados.',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              enum: Object.keys(helpText),
              description: 'Tema de ayuda.',
            },
          },
          required: ['topic'],
        },
        annotations: { readOnlyHint: true },
        execute: async (a) =>
          helpText[a.topic as keyof typeof helpText] || helpText.comprar,
      },
    ];
    for (const tool of tools)
      void context
        .registerTool(tool, { signal: controller.signal })
        .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  function find(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setRequest(
      [
        query.trim(),
        gender,
        scent,
        budget ? `Hasta ${budget} ${props.currency}` : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'Quiero descubrir un perfume',
    );
    const text = normalize(query);
    const topic = /pedido|comprobante|regresar|volver/.test(text)
      ? 'pedido'
      : /pago|transfer|banco/.test(text)
        ? 'pago'
        : /envio|entrega/.test(text)
          ? 'envio'
          : /como compr|como pedir/.test(text)
            ? 'comprar'
            : null;
    if (topic) {
      setAnswer(helpText[topic]);
      setResults([]);
      return;
    }
    const found = recommend(props.products, {
      query,
      gender,
      scent,
      budget: budget ? Number(budget) : undefined,
    });
    setResults(found);
    setAnswer(
      found.length
        ? 'Estas opciones disponibles coinciden con tu búsqueda. Abre un perfume para ver sus notas y detalles.'
        : 'No encontré coincidencias con esos filtros. Prueba otra marca, amplía el presupuesto o quita el filtro de aroma.',
    );
  }
  const showCart = () => {
    setOpen(false);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    props.onCart();
  };
  const cartCount = props.cart.reduce(
    (total, entry) => total + entry.quantity,
    0,
  );
  const filterCount = [gender, scent, budget].filter(Boolean).length;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir guía de perfumes"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 grid size-12 place-items-center rounded-full border border-[#d8b96e]/60 bg-[#171611] text-[#e3c87f] shadow-xl sm:bottom-24 sm:left-auto sm:right-5 sm:flex sm:h-12 sm:w-auto sm:gap-2 sm:px-4"
      >
        <MessageCircle className="size-5" />
        <span className="hidden text-xs font-semibold sm:inline">Tu guía</span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            window.speechSynthesis?.cancel();
            setSpeaking(false);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-[1.75rem] border border-[#d8b96e]/20 bg-[#f7f4ee] p-0 font-sans shadow-2xl sm:max-w-[480px]"
        >
          <DialogHeader className="relative shrink-0 bg-[#171611] px-5 py-5 text-white">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#e3c87f]">
              <Sparkles className="size-3.5" /> Tu asesor de fragancias
            </div>
            <DialogTitle className="pr-9 font-heading text-3xl leading-tight text-[#faf7ef]">
              Encuentra tu esencia
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              El Padrino · by Jordy Tamayo
            </DialogDescription>
            <button
              type="button"
              aria-label="Cerrar guía"
              onClick={() => {
                setOpen(false);
                window.speechSynthesis?.cancel();
                setSpeaking(false);
              }}
              className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#e3c87f]"
            >
              <X className="size-5" />
            </button>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
            {request && (
              <div className="mb-4 ml-10 rounded-2xl rounded-br-md bg-[#e9dfc8] px-4 py-3 text-sm leading-6 text-[#30291b]">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#78653b]">
                  Tu búsqueda
                </p>
                {request}
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full bg-[#171611] font-heading text-lg text-[#e3c87f]"
                aria-hidden="true"
              >
                P
              </span>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-black/5 bg-white p-4 shadow-sm">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#8a6c29]">
                  Guía El Padrino
                </p>
                <p
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-sm leading-6 text-[#454239]"
                >
                  {answer}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!('speechSynthesis' in window)) return;
                    speechSynthesis.cancel();
                    if (speaking) {
                      setSpeaking(false);
                      return;
                    }
                    const speech = new SpeechSynthesisUtterance(answer);
                    speech.lang = 'es-EC';
                    speech.onend = () => setSpeaking(false);
                    speech.onerror = () => setSpeaking(false);
                    setSpeaking(true);
                    speechSynthesis.speak(speech);
                  }}
                  aria-pressed={speaking}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-[#806420] transition hover:bg-[#f7f4ee] focus-visible:outline-2 focus-visible:outline-[#8a6c29]"
                >
                  <Volume2 className="size-3.5" />{' '}
                  {speaking ? 'Detener audio' : 'Escuchar'}
                </button>
              </div>
            </div>

            <div
              className="mt-4 flex flex-wrap gap-2"
              aria-label="Ayuda rápida"
            >
              {Object.entries({
                comprar: 'Cómo comprar',
                pago: 'Pagos',
                pedido: 'Mi pedido',
                envio: 'Envíos',
              }).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className="min-h-11 rounded-full border border-[#ded7c9] bg-white/70 px-3 text-xs font-medium text-[#5c5547] transition hover:border-[#b9984c] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#8a6c29]"
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setSpeaking(false);
                    setRequest(label);
                    setAnswer(helpText[key as keyof typeof helpText]);
                    setResults([]);
                  }}
                >
                  {label}
                  <ArrowUpRight className="ml-1 inline size-3" />
                </button>
              ))}
            </div>

            <form onSubmit={find} className="mt-5 grid gap-3">
              <label
                htmlFor="guide-query"
                className="text-xs font-semibold text-[#5c5547]"
              >
                ¿Qué perfume buscas?
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-[#d9d1c2] bg-white p-1.5 pl-3 focus-within:border-[#a48438] focus-within:ring-2 focus-within:ring-[#d8b96e]/20">
                <Search className="size-4 shrink-0 text-[#8a806b]" />
                <input
                  id="guide-query"
                  maxLength={120}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Yara, vainilla, Dior…"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-[#171611] outline-none placeholder:text-[#a09a8d]"
                />
                <button
                  type="submit"
                  aria-label="Buscar perfumes"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#171611] text-[#e3c87f] transition hover:bg-[#393021] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6c29]"
                >
                  <ArrowUpRight className="size-5" />
                </button>
              </div>
              <details className="rounded-2xl border border-[#e5ded0] bg-[#f0ece3]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-xs font-semibold text-[#5c5547]">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="size-3.5" /> Personaliza tu
                    búsqueda
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px]">
                    {filterCount ? `${filterCount} filtros` : 'Opcional'}
                  </span>
                </summary>
                <div className="grid gap-3 border-t border-[#e5ded0] p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-xs text-[#5c5547]">
                      Para quién
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="min-h-11 w-full min-w-0 rounded-xl border border-[#ded7c9] bg-white px-2 text-base text-[#171611]"
                      >
                        <option value="">Todos</option>
                        <option value="dama">Mujer</option>
                        <option value="caballero">Hombre</option>
                        <option value="unisex">Unisex</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs text-[#5c5547]">
                      Aroma
                      <select
                        value={scent}
                        onChange={(e) => setScent(e.target.value)}
                        className="min-h-11 w-full min-w-0 rounded-xl border border-[#ded7c9] bg-white px-2 text-base text-[#171611]"
                      >
                        <option value="">Cualquiera</option>
                        {['dulce', 'fresco', 'floral', 'amaderado'].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-xs text-[#5c5547]">
                    Presupuesto máximo ({props.currency})
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="Sin límite"
                      className="min-h-11 rounded-xl border border-[#ded7c9] bg-white px-3 text-base text-[#171611]"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGender('');
                        setScent('');
                        setBudget('');
                      }}
                      className="min-h-11 px-2 text-xs font-medium text-[#74664a] underline underline-offset-4"
                    >
                      Limpiar filtros
                    </button>
                    <button
                      type="submit"
                      className="min-h-11 rounded-full bg-[#171611] px-4 text-xs font-semibold text-[#e3c87f]"
                    >
                      Ver recomendaciones
                    </button>
                  </div>
                </div>
              </details>
            </form>

            {results.length > 0 && (
              <p className="mb-3 mt-5 text-[10px] font-bold uppercase tracking-[.15em] text-[#8a6c29]">
                Tu selección · {results.length} opciones
              </p>
            )}
            <div className="grid gap-2.5">
              {results.map((p) => (
                <article
                  key={p.id}
                  className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm"
                >
                  <Link
                    href={`/perfumes/${p.slug}`}
                    className="shrink-0 self-start rounded-xl bg-[#f7f4ee]"
                  >
                    <Image
                      unoptimized
                      src={p.imageUrl}
                      alt={`${p.brand} ${p.name}`}
                      width={72}
                      height={88}
                      className="h-[88px] w-[72px] rounded-xl object-contain p-1"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex">
                      <NewProductBadge until={p.newUntil} />
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#8a6c29]">
                      {p.brand}
                    </p>
                    <Link
                      href={`/perfumes/${p.slug}`}
                      className="mt-0.5 block text-sm font-semibold leading-5 text-[#27241e] hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#827968]">
                      {p.notesCsv}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-[#171611]">
                        {new Intl.NumberFormat('es-EC', {
                          style: 'currency',
                          currency: props.currency,
                        }).format(p.price)}
                      </strong>
                      <button
                        type="button"
                        aria-label={`Añadir ${p.name} al carrito`}
                        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[#f1e7ce] px-3 text-xs font-semibold text-[#51401b] transition hover:bg-[#e5cf96]"
                        onClick={() => {
                          const current = props.products.find(
                            (item) => item.id === p.id,
                          );
                          if (current && current.stock > 0) {
                            props.onAdd(current);
                            setAnswer(
                              `${p.name} añadido a tu selección. Puedes seguir explorando o revisar tu carrito.`,
                            );
                          } else
                            setAnswer(
                              'Ese perfume acaba de agotarse. Vuelve a buscar opciones.',
                            );
                        }}
                      >
                        <Plus className="size-3.5" /> Añadir
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-[#e5ded0] bg-[#faf8f3] px-4 pb-4 pt-3 sm:px-5">
            <button
              type="button"
              onClick={showCart}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#d8b96e] px-4 py-3 text-sm font-semibold text-[#282111] transition hover:bg-[#cda958] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6c29]"
            >
              <ShoppingBag className="size-4" />{' '}
              {cartCount ? `Ver mi carrito (${cartCount})` : 'Ver mi carrito'}{' '}
              <ArrowUpRight className="ml-auto size-4" />
            </button>
            <a
              href={props.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex min-h-11 items-center justify-center gap-2 text-xs text-[#6b6456] transition hover:text-[#171611]"
            >
              <MessageCircle className="size-3.5" /> ¿Prefieres hablar con
              Jordy?{' '}
              <span className="font-semibold underline underline-offset-2">
                WhatsApp
              </span>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
