'use client';

import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { CartEntry } from '@/lib/store-types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function CheckoutForm({
  items,
  onCreated,
}: {
  items: CartEntry[];
  onCreated: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const credentials = useRef<{ key: string; token: string } | null>(null);
  useEffect(() => {
    apiFetch<{ checkoutEnabled: boolean }>('/api/checkout/settings')
      .then((s) => setEnabled(s.checkoutEnabled))
      .catch(() =>
        setError(
          'No pudimos consultar la disponibilidad de compras. Vuelve a abrir el carrito.',
        ),
      );
  }, []);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const customer = Object.fromEntries(form.entries());
    const fingerprint = JSON.stringify({ customer, items });
    try {
      // Preserve an attempt across network failures and reloads. A changed cart/form gets a new key.
      const saved = sessionStorage.getItem('padrino-checkout-attempt');
      const previous = saved ? JSON.parse(saved) : null;
      if (previous?.fingerprint === fingerprint)
        credentials.current = previous.credentials;
      else
        credentials.current = {
          key: crypto.randomUUID(),
          token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
            b.toString(16).padStart(2, '0'),
          ).join(''),
        };
      const access = credentials.current!;
      sessionStorage.setItem(
        'padrino-checkout-attempt',
        JSON.stringify({ fingerprint, credentials: access }),
      );
      const result = await apiFetch<{ orderNumber: string }>(
        '/api/checkout/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            ...customer,
            items,
            checkoutKey: access.key,
            accessToken: access.token,
          }),
        },
      );
      localStorage.setItem(`padrino-order-${result.orderNumber}`, access.token);
      sessionStorage.removeItem('padrino-checkout-attempt');
      onCreated();
      window.location.assign(
        `/pedido/${result.orderNumber}#token=${access.token}`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos registrar tu compra.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="rounded-2xl bg-[#171611] p-4 text-white">
        <p className="text-sm font-semibold text-[#e3c87f]">
          Tu compra, aquí mismo
        </p>
        <p className="mt-2 text-sm leading-6 text-white/75">
          1. Datos de envío · 2. Transferencia · 3. Comprobante
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
          <Mail className="size-4 shrink-0" /> Te avisamos por correo en cada
          paso.
        </p>
      </div>
      <label
        htmlFor="checkout-customerName"
        className="grid gap-1.5 text-sm font-medium"
      >
        Nombre completo
        <Input
          required
          minLength={2}
          maxLength={140}
          id="checkout-customerName"
          name="customerName"
          autoComplete="name"
          className="h-11"
        />
      </label>
      <label
        htmlFor="checkout-customerEmail"
        className="grid gap-1.5 text-sm font-medium"
      >
        Correo para recibir el pedido
        <Input
          required
          type="email"
          maxLength={180}
          id="checkout-customerEmail"
          name="customerEmail"
          autoComplete="email"
          className="h-11"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label
          htmlFor="checkout-customerPhone"
          className="grid gap-1.5 text-sm font-medium"
        >
          Teléfono
          <Input
            required
            type="tel"
            minLength={7}
            maxLength={40}
            id="checkout-customerPhone"
            name="customerPhone"
            autoComplete="tel"
            className="h-11"
          />
        </label>
        <label
          htmlFor="checkout-city"
          className="grid gap-1.5 text-sm font-medium"
        >
          Ciudad
          <Input
            required
            minLength={2}
            maxLength={120}
            id="checkout-city"
            name="city"
            autoComplete="address-level2"
            className="h-11"
          />
        </label>
      </div>
      <label
        htmlFor="checkout-shippingAddress"
        className="grid gap-1.5 text-sm font-medium"
      >
        Dirección completa de entrega
        <Textarea
          required
          minLength={8}
          maxLength={500}
          id="checkout-shippingAddress"
          name="shippingAddress"
          autoComplete="street-address"
          placeholder="Calle, número, sector y referencia"
        />
      </label>
      <label
        htmlFor="checkout-notes"
        className="grid gap-1.5 text-sm font-medium"
      >
        Indicaciones adicionales (opcional)
        <Textarea id="checkout-notes" name="notes" maxLength={1000} />
      </label>
      {enabled === false && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Las compras por transferencia se habilitarán cuando la tienda confirme
          sus datos bancarios.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy || enabled !== true}
        className="h-12 rounded-full bg-[#171611] font-bold text-[#e3c87f] hover:bg-[#393124]"
      >
        {busy ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}{' '}
        {busy
          ? 'Registrando tu pedido…'
          : 'Continuar al pago por transferencia'}
      </Button>
      <p className="flex items-start gap-2 text-sm leading-5 text-black/60">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" /> Verás los datos
        bancarios y podrás subir el comprobante en el siguiente paso. Tu pago
        será verificado por la tienda.
      </p>
    </form>
  );
}
