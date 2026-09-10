'use client';

// Effects synchronize browser-only storage, file previews and server polling.
/* oxlint-disable react/react-compiler */
import Image from 'next/image';
import Link from 'next/link';

import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  LoaderCircle,
  Mail,
  PackageCheck,
  Upload,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Order = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  city: string;
  status: string;
  subtotal: number;
  shippingTotal: number;
  total: number;
  currency: string;
  bankSnapshot: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  paidAt?: string;
  expiresAt?: string;
  items: { productName: string; quantity: number; unitPrice: number }[];
  events: { status: string; message: string; createdAt: string }[];
};

export function OrderTracking({ number }: { number: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const access =
      new URLSearchParams(location.hash.slice(1)).get('token') ||
      localStorage.getItem(`padrino-order-${number}`) ||
      '';
    if (access) {
      setToken(access);
      localStorage.setItem(`padrino-order-${number}`, access);
      history.replaceState(null, '', location.pathname);
    } else
      setError(
        'Abre el enlace privado que recibiste por correo o utiliza el dispositivo donde hiciste tu pedido.',
      );
  }, [number]);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setOrder(
        await apiFetch<Order>(`/api/checkout/orders/${number}`, {
          headers: { 'X-Order-Token': token },
          cache: 'no-store',
        }),
      );
      setError('');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo actualizar el pedido.',
      );
    }
  }, [number, token]);
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [refresh]);
  async function upload(event: SubmitEvent) {
    event.preventDefault();
    if (!file || busy) return;
    if (file.size > 2_000_000) {
      setUploadError('La imagen debe pesar como máximo 2 MB. Selecciona una imagen más pequeña.');
      return;
    }
    setBusy(true);
    setUploadError('');
    setNotice('');
    try {
      const body = new FormData();
      body.set('file', file);
      const result = await apiFetch<{ message: string }>(
        `/api/checkout/orders/${number}/proof`,
        { method: 'POST', headers: { 'X-Order-Token': token }, body },
      );
      setNotice(result.message);
      setFile(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await refresh();
    } catch (caught) {
      setUploadError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos subir el comprobante.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function receipt() {
    setBusy(true);
    try {
      const response = await fetch(`/api/checkout/orders/${number}/receipt`, {
        headers: { 'X-Order-Token': token },
      });
      if (!response.ok) throw new Error('No pudimos descargar el PDF.');
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${number}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Error de descarga.');
    } finally {
      setBusy(false);
    }
  }
  const money = (value: number) =>
    new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: order?.currency || 'USD',
    }).format(value);
  return (
    <main className="min-h-screen bg-[#f4f0e7] text-[#171611]">
      <header className="bg-[#11100d] px-6 py-6 text-[#e3c87f]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-heading text-xl tracking-widest">
            PERFUMES EL PADRINO
          </Link>
          <Link className="flex items-center gap-2 text-sm" href="/">
            <ArrowLeft className="size-4" /> Volver a la tienda
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#80601f]">
          Tu compra, paso a paso
        </p>
        <h1 className="mt-3 font-heading text-4xl sm:text-6xl">
          Pedido {number}
        </h1>
        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-red-50 p-4 text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <output className="mt-6 block rounded-xl bg-green-50 p-4 text-green-800">
            {notice}
          </output>
        )}
        {!order && !error && <LoaderCircle className="mt-10 animate-spin" />}
        {order && (
          <div className="mt-9 grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
            <div className="grid gap-6">
              <section className="rounded-3xl bg-[#171611] p-6 text-white sm:p-8">
                <PackageCheck className="size-7 text-[#e3c87f]" />
                <h2 className="mt-4 font-heading text-3xl text-[#e3c87f]">
                  {order.status}
                </h2>
                <p className="mt-3 whitespace-pre-line text-base leading-7 text-white/85">
                  {order.events.at(-1)?.message}
                </p>
                <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-white/70">
                  <Mail className="mt-1 size-4 shrink-0" /> Las actualizaciones
                  y el PDF se envían a {order.customerEmail}.
                </p>
                <div className="mt-5 rounded-2xl border border-[#e3c87f]/30 p-4 text-sm leading-6">
                  <p className="font-semibold text-[#e3c87f]">¿Vas a salir para hacer la transferencia?</p>
                  <p className="mt-2 text-white/85">
                    Puedes cerrar esta página. Para regresar, abre el correo de tu pedido en{' '}
                    <strong>{order.customerEmail}</strong> y pulsa «Ver mi pedido y subir comprobante».
                    El enlace también funciona desde otro dispositivo.
                  </p>
                  <p className="mt-2 text-white/70">
                    Busca el número {order.orderNumber}. Si aún no ves el correo, espera unos minutos y revisa Spam o Promociones.
                    Conserva ese correo y no compartas tu enlace privado.
                  </p>
                </div>
              </section>
              {['Pendiente de pago', 'Pago rechazado'].includes(
                order.status,
              ) && (
                <section className="rounded-3xl bg-white p-6 sm:p-8">
                  <h2 className="font-heading text-3xl">
                    Realiza tu transferencia
                  </h2>
                  <p className="mt-4 font-heading text-4xl">
                    {money(order.total)}
                  </p>
                  <p className="mt-4 whitespace-pre-line rounded-2xl bg-[#f7f4ee] p-5 text-base leading-8">
                    {order.bankSnapshot}
                  </p>
                  <p className="mt-4 text-sm leading-6">
                    Referencia: <b>{order.orderNumber}</b>. Transfiere el
                    importe exacto y adjunta una imagen legible.
                  </p>
                  {order.expiresAt && (
                    <p className="mt-2 text-sm text-black/65">
                      Envía el comprobante antes del{' '}
                      {new Date(order.expiresAt).toLocaleString('es-EC')}.
                      Después se libera la reserva.
                    </p>
                  )}
                  <form onSubmit={upload} className="mt-6 grid gap-4">
                    <label className="grid cursor-pointer gap-3 rounded-2xl border border-dashed border-[#b69955] bg-[#faf8f2] p-5">
                      <span className="flex items-center gap-2 font-medium">
                        <Upload className="size-5" /> Comprobante de
                        transferencia
                      </span>
                      <span className="text-sm text-black/65">
                        JPG, PNG o WebP · Hasta 2 MB
                      </span>
                      <input
                        required
                        disabled={busy}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          setFile(e.target.files?.[0] || null);
                          setUploadError('');
                        }}
                        className="w-full min-w-0 text-sm"
                      />
                    </label>
                    {preview && (
                      <Image
                        unoptimized
                        width={800}
                        height={1000}
                        src={preview}
                        alt="Vista previa del comprobante"
                        className="max-h-72 w-full rounded-xl object-contain"
                      />
                    )}
                    <Button
                      type="submit"
                      disabled={busy || !file}
                      className="h-auto min-h-12 whitespace-normal rounded-full bg-[#171611] px-4 py-3 text-[#e3c87f]"
                    >
                      {busy ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Check />
                      )}{' '}
                      {busy ? 'Enviando comprobante…' : 'Enviar comprobante para verificación'}
                    </Button>
                    {uploadError && (
                      <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
                        {uploadError}
                      </p>
                    )}
                    <p className="text-sm leading-6 text-black/65">
                      Al enviarlo, tu pedido pasará a «En verificación». Te avisaremos por correo cuando la tienda confirme el pago.
                    </p>
                  </form>
                </section>
              )}
              {order.carrier && (
                <section className="rounded-3xl bg-white p-6">
                  <h2 className="font-heading text-3xl">Tu envío</h2>
                  <p className="mt-4">
                    {order.carrier} · Guía <b>{order.trackingNumber}</b>
                  </p>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block underline"
                    >
                      Consultar en la transportadora
                    </a>
                  )}
                </section>
              )}
              <section className="rounded-3xl bg-white p-6 sm:p-8">
                <h2 className="font-heading text-3xl">Historial del pedido</h2>
                <ol className="mt-6 grid gap-6">
                  {order.events.map((event, index) => (
                    <li
                      key={`${event.createdAt}-${index}`}
                      className="border-l-2 border-[#d8b96e] pl-5"
                    >
                      <p className="text-sm text-black/55">
                        {new Date(event.createdAt).toLocaleString('es-EC')}
                      </p>
                      <p className="mt-1 font-semibold">{event.status}</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-black/70">
                        {event.message}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            <aside className="rounded-3xl bg-white p-6 sm:p-8 lg:sticky lg:top-6">
              <h2 className="font-heading text-3xl">Tu selección</h2>
              <div className="mt-5 divide-y divide-black/10">
                {order.items.map((item) => (
                  <div
                    key={item.productName}
                    className="flex justify-between gap-5 py-4"
                  >
                    <span>
                      {item.quantity} × {item.productName}
                    </span>
                    <strong className="shrink-0">
                      {money(item.quantity * item.unitPrice)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 border-t border-black/10 pt-5">
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{money(order.subtotal)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Envío</span>
                  <span>
                    {order.shippingTotal === 0
                      ? 'Gratis'
                      : money(order.shippingTotal)}
                  </span>
                </p>
                <p className="flex justify-between font-heading text-3xl">
                  <span>Total</span>
                  <strong>{money(order.total)}</strong>
                </p>
              </div>
              <div className="mt-7 border-t border-black/10 pt-6">
                <h3 className="font-semibold">Entregar a</h3>
                <p className="mt-2 leading-7">
                  {order.customerName}
                  <br />
                  {order.shippingAddress}
                  <br />
                  {order.city}
                </p>
              </div>
              <Button
                onClick={() => void receipt()}
                disabled={busy}
                variant="outline"
                className="mt-6 h-auto min-h-12 w-full whitespace-normal rounded-full"
              >
                <Download />{' '}
                {order.paidAt
                  ? 'Descargar recibo de compra'
                  : 'Descargar resumen del pedido'}
              </Button>
              <p className="mt-4 text-sm leading-6 text-black/60">
                {order.paidAt
                  ? 'Recibo de compra. No sustituye una factura tributaria.'
                  : 'El resumen no acredita el pago. La tienda verificará la transferencia en su banco.'}
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
