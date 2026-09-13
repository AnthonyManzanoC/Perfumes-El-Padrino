'use client';
/* oxlint-disable react/react-compiler */
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { MessageCircle, Volume2 } from 'lucide-react';
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
  const [answer, setAnswer] = useState(
    'Soy tu guía de El Padrino. Puedo buscar perfumes, comparar aromas y ayudarte con la compra. Mis sugerencias usan las notas del catálogo; no soy una IA.',
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
    props.onCart();
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir guía de perfumes"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 flex h-12 items-center gap-2 rounded-full border border-[#d8b96e]/60 bg-[#171611] px-4 text-[#e3c87f] shadow-xl sm:bottom-24 sm:left-auto sm:right-5"
      >
        <MessageCircle className="size-5" />
        <span className="text-xs font-semibold">Tu guía</span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) window.speechSynthesis?.cancel();
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto bg-[#f7f4ee] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl">
              Tu guía de El Padrino
            </DialogTitle>
            <DialogDescription>
              Perfumes, aromas y ayuda para comprar · by Jordy Tamayo
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-[#171611] p-4 text-sm leading-6 text-[#f4f0e7]">
            <p aria-live="polite">{answer}</p>
            <button
              type="button"
              onClick={() => {
                if ('speechSynthesis' in window) {
                  speechSynthesis.cancel();
                  const speech = new SpeechSynthesisUtterance(answer);
                  speech.lang = 'es-EC';
                  speechSynthesis.speak(speech);
                }
              }}
              className="mt-3 flex items-center gap-2 text-[#e3c87f]"
            >
              <Volume2 className="size-4" />
              Escuchar respuesta
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries({
              comprar: 'Cómo comprar',
              pago: 'Transferencia',
              pedido: 'Volver a mi pedido',
              envio: 'Envíos',
            }).map(([key, label]) => (
              <button
                type="button"
                key={key}
                className="rounded-full border border-black/15 px-3 py-2 text-xs"
                onClick={() => {
                  setAnswer(helpText[key as keyof typeof helpText]);
                  setResults([]);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={find} className="grid gap-3">
            <label className="grid gap-1 text-sm">
              Busca por nombre, marca o nota
              <input
                maxLength={120}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej.: Yara, vainilla, Dior…"
                className="rounded-xl border bg-white p-3"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                Para quién
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-xl border bg-white p-2"
                >
                  <option value="">Todos</option>
                  <option value="dama">Dama</option>
                  <option value="caballero">Caballero</option>
                  <option value="unisex">Unisex</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Aroma
                <select
                  value={scent}
                  onChange={(e) => setScent(e.target.value)}
                  className="rounded-xl border bg-white p-2"
                >
                  <option value="">Cualquiera</option>
                  {['dulce', 'fresco', 'floral', 'amaderado'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Presupuesto máximo ({props.currency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Sin límite"
                className="rounded-xl border bg-white p-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-[#171611] p-3 text-[#e3c87f]"
            >
              Encontrar mi perfume
            </button>
          </form>
          <div className="grid gap-3">
            {results.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-black/10 bg-white p-4"
              >
                <Link
                  href={`/perfumes/${p.slug}`}
                  className="font-heading text-xl underline"
                >
                  {p.brand} · {p.name}
                </Link>
                <p className="my-2 text-sm">{p.notesCsv}</p>
                <div className="flex items-center justify-between gap-3">
                  <strong>
                    {new Intl.NumberFormat('es-EC', {
                      style: 'currency',
                      currency: props.currency,
                    }).format(p.price)}
                  </strong>
                  <button
                    type="button"
                    className="rounded-full border px-3 py-2 text-sm"
                    onClick={() => {
                      const current = props.products.find(
                        (item) => item.id === p.id,
                      );
                      if (current && current.stock > 0) {
                        props.onAdd(current);
                        setAnswer(
                          `${p.name} añadido a tu selección. Abre el carrito para revisar cantidades y comprar.`,
                        );
                      } else
                        setAnswer(
                          'Ese perfume acaba de agotarse. Vuelve a buscar opciones.',
                        );
                    }}
                  >
                    Añadir al carrito
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            onClick={showCart}
            className="rounded-full bg-[#d8b96e] p-3 font-semibold"
          >
            Ver mi carrito y continuar
          </button>
          <a
            href={props.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="text-center text-sm underline"
          >
            Hablar con Jordy por WhatsApp
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
