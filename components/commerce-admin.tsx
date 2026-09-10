'use client';

// Effects synchronize browser-only storage, file previews and server polling.
/* oxlint-disable react/react-compiler */
import Image from 'next/image';

import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import {
  Download,
  LoaderCircle,
  Mail,
  RefreshCw,
  Save,
  Eye,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { AdminOrder } from '@/lib/store-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Commerce = {
  checkoutEnabled: boolean;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  identification: string;
  paymentInstructions: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword?: string;
  hasPassword: boolean;
  senderEmail: string;
  senderName: string;
  adminEmail: string;
  storeUrl: string;
  emailFooter: string;
};
type Delivery = {
  id: string;
  recipient: string;
  subject: string;
  attempts: number;
  lastError?: string;
  sentAt?: string;
  nextAttemptAt: string;
};

export function CommerceAdmin({ token }: { token: string }) {
  const [settings, setSettings] = useState<Commerce | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setDeliveries(
        await apiFetch<Delivery[]>('/api/admin/commerce/emails', {}, token),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos cargar los envíos.',
      );
    }
  }, [token]);
  useEffect(() => {
    apiFetch<Commerce>('/api/admin/commerce', {}, token)
      .then(setSettings)
      .catch((caught) => setError(caught.message));
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [token, refresh]);
  async function save(event: SubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setSettings(
        await apiFetch<Commerce>(
          '/api/admin/commerce',
          { method: 'PUT', body: JSON.stringify(settings) },
          token,
        ),
      );
      setNotice('Configuración guardada.');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo guardar.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch<{ message: string }>(
        '/api/admin/commerce/test-email',
        { method: 'POST' },
        token,
      );
      setNotice(result.message);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo enviar la prueba.',
      );
    } finally {
      setBusy(false);
      void refresh();
    }
  }
  function field(key: keyof Commerce, label: string, type = 'text') {
    return (
      <label
        htmlFor={`commerce-${key}`}
        key={key}
        className="grid gap-2 text-sm font-medium"
      >
        {label}
        <Input
          id={`commerce-${key}`}
          type={type}
          value={String(settings?.[key] ?? '')}
          autoComplete={key === 'smtpPassword' ? 'new-password' : undefined}
          onChange={(e) =>
            setSettings(
              (s) =>
                s && {
                  ...s,
                  [key]:
                    key === 'smtpPort'
                      ? Number(e.target.value)
                      : e.target.value,
                },
            )
          }
          className="h-11"
        />
      </label>
    );
  }
  return (
    <div className="grid gap-6">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <output className="rounded-xl bg-green-50 p-4 text-green-800">
          {notice}
        </output>
      )}
      {!settings ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <form onSubmit={save} className="grid gap-6">
          <section className="rounded-3xl bg-white p-6 sm:p-8">
            <h2 className="font-heading text-3xl">Transferencias y compras</h2>
            <p className="mt-3 text-sm leading-6 text-black/65">
              Reemplaza los datos de ejemplo por la cuenta real de la tienda
              antes de activar las compras.
            </p>
            <label className="my-6 flex items-center gap-3 font-medium">
              <input
                type="checkbox"
                checked={settings.checkoutEnabled}
                onChange={(e) =>
                  setSettings(
                    (s) => s && { ...s, checkoutEnabled: e.target.checked },
                  )
                }
                className="size-5 accent-black"
              />{' '}
              Habilitar compras por transferencia
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              {field('bankName', 'Banco')}
              {field('accountType', 'Tipo de cuenta')}
              {field('accountNumber', 'Número de cuenta')}
              {field('accountHolder', 'Titular')}
              {field('identification', 'Cédula / RUC')}
              {field('storeUrl', 'URL pública de la tienda', 'url')}
              <label
                htmlFor="commerce-paymentInstructions"
                className="grid gap-2 text-sm font-medium sm:col-span-2"
              >
                Instrucciones para transferir
                <Textarea
                  id="commerce-paymentInstructions"
                  value={settings.paymentInstructions}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      paymentInstructions: e.target.value,
                    })
                  }
                />
              </label>
            </div>
          </section>
          <section className="rounded-3xl bg-white p-6 sm:p-8">
            <h2 className="font-heading text-3xl">Correo de la tienda</h2>
            <p className="my-4 text-sm leading-6 text-black/65">
              Los clientes reciben cada cambio de estado con el PDF del pedido.
              El administrador recibe su aviso por separado.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {field('smtpHost', 'Servidor SMTP')}
              {field('smtpPort', 'Puerto seguro (587 o 465)', 'number')}
              {field('smtpUsername', 'Usuario SMTP')}
              {field(
                'smtpPassword',
                settings.hasPassword
                  ? 'Nueva contraseña (vacío conserva la actual)'
                  : 'Contraseña de aplicación',
                'password',
              )}
              {field('senderEmail', 'Correo remitente', 'email')}
              {field('senderName', 'Nombre del remitente')}
              {field('adminEmail', 'Correo del administrador', 'email')}
              <div className="flex items-center text-sm text-green-800">
                {settings.hasPassword
                  ? 'Contraseña guardada y cifrada'
                  : 'Contraseña pendiente de configurar'}
              </div>
              <label
                htmlFor="commerce-emailFooter"
                className="grid gap-2 text-sm font-medium sm:col-span-2"
              >
                Firma de los correos
                <Textarea
                  id="commerce-emailFooter"
                  value={settings.emailFooter}
                  onChange={(e) =>
                    setSettings({ ...settings, emailFooter: e.target.value })
                  }
                />
              </label>
            </div>
            <p className="mt-5 text-sm leading-6 text-black/60">
              Guarda los cambios y envía una prueba. Gmail utiliza una
              contraseña de aplicación. El servidor debe permitir conexiones
              SMTP salientes.
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={busy}
              type="submit"
              className="h-12 rounded-full px-6"
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Save />}{' '}
              Guardar configuración
            </Button>
            <Button
              disabled={busy}
              type="button"
              variant="outline"
              className="h-12 rounded-full px-6"
              onClick={() => void test()}
            >
              <Mail /> Enviar prueba al administrador
            </Button>
          </div>
        </form>
      )}
      <section className="rounded-3xl bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-3xl">Registro de correos</h2>
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCw /> Actualizar
          </Button>
        </div>
        <p className="mt-3 text-sm text-black/65">
          Los fallos se reintentan automáticamente. “Enviado” indica que el
          servidor de correo aceptó el mensaje.
        </p>
        <div className="mt-5 divide-y divide-black/10">
          {deliveries.map((d) => (
            <div key={d.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="break-words font-medium">{d.subject}</p>
                <p className="mt-1 break-all text-sm text-black/65">
                  {d.recipient}
                </p>
                <p className="mt-2 text-sm">
                  {d.sentAt
                    ? `Enviado · ${new Date(d.sentAt).toLocaleString('es-EC')}`
                    : `Pendiente · ${d.attempts} intentos · Próximo: ${new Date(d.nextAttemptAt).toLocaleString('es-EC')}`}
                </p>
                {d.lastError && (
                  <p className="mt-2 text-sm text-red-700">{d.lastError}</p>
                )}
              </div>
              {!d.sentAt && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await apiFetch(
                        `/api/admin/commerce/emails/${d.id}/retry`,
                        { method: 'POST' },
                        token,
                      );
                      await refresh();
                    } catch (caught) {
                      setError(
                        caught instanceof Error
                          ? caught.message
                          : 'No se pudo reintentar.',
                      );
                    }
                  }}
                >
                  Reintentar
                </Button>
              )}
            </div>
          ))}
          {deliveries.length === 0 && (
            <p className="py-6 text-black/60">
              Todavía no hay correos registrados.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

const transitions: Record<string, string[]> = {
  'Pendiente de pago': ['Cancelado'],
  'En verificación': ['Pagado', 'Pago rechazado', 'Cancelado'],
  'Pago rechazado': ['Cancelado'],
  Pagado: ['Preparando envío', 'Cancelado'],
  'Preparando envío': ['Enviado', 'Cancelado'],
  Enviado: ['Entregado'],
  Pendiente: ['Pagado', 'Cancelado'],
  Contactado: ['Pagado', 'Cancelado'],
  Confirmado: ['Preparando envío', 'Cancelado'],
};

export function OrderActions({
  order,
  token,
  onChanged,
}: {
  order: AdminOrder;
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [proofs, setProofs] = useState<{ id: string; createdAt: string }[]>([]);
  const [history, setHistory] = useState<
    { status: string; message: string; createdAt: string }[]
  >([]);
  const [details, setDetails] = useState(false);
  const [preview, setPreview] = useState('');
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function loadDetails() {
    try {
      const [p, h] = await Promise.all([
        apiFetch<typeof proofs>(
          `/api/admin/commerce/orders/${order.id}/proofs`,
          {},
          token,
        ),
        apiFetch<typeof history>(
          `/api/admin/commerce/orders/${order.id}/history`,
          {},
          token,
        ),
      ]);
      setProofs(p);
      setHistory(h);
      setDetails(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar.');
    }
  }
  async function blob(path: string, download = false) {
    try {
      const response = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error('No se pudo abrir el archivo. Revisa tu sesión.');
      const url = URL.createObjectURL(await response.blob());
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${order.orderNumber}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else setPreview(url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo abrir el archivo.',
      );
    }
  }
  async function change(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(
        `/api/admin/orders/${order.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: next,
            bankVerified: form.get('bankVerified') === 'on',
            carrier: form.get('carrier'),
            trackingNumber: form.get('trackingNumber'),
            trackingUrl: form.get('trackingUrl'),
            message: form.get('message'),
          }),
        },
        token,
      );
      setNext('');
      await onChanged();
      if (details) await loadDetails();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo actualizar.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-5 border-t border-black/10 pt-5">
      <div className="flex flex-wrap gap-3">
        <span className="rounded-full bg-[#171611] px-4 py-2 text-sm font-semibold text-[#e3c87f]">
          {order.status}
        </span>
        <Button variant="outline" onClick={() => void loadDetails()}>
          <Eye /> Comprobantes e historial
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            void blob(`/api/admin/commerce/orders/${order.id}/receipt`, true)
          }
        >
          <Download /> PDF
        </Button>
      </div>
      <p className="mt-4 break-words text-sm leading-6">
        <b>Correo:</b> {order.customerEmail || 'Pedido anterior sin correo'}
        <br />
        <b>Dirección:</b> {order.shippingAddress || 'Sin registrar'} ·{' '}
        {order.city}
      </p>
      {order.carrier && (
        <p className="mt-2 text-sm">
          {order.carrier} · Guía: {order.trackingNumber}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {!!transitions[order.status]?.length && (
        <form
          onSubmit={change}
          className="mt-5 grid gap-4 rounded-2xl bg-[#f7f4ee] p-4"
        >
          <label className="grid gap-2 text-sm font-medium">
            Actualizar pedido
            <select
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="h-11 rounded-xl border border-black/15 bg-white px-3"
            >
              <option value="">Selecciona una acción</option>
              {transitions[order.status].map((s) => (
                <option key={s} value={s}>
                  {s === 'Pagado' ? 'Aprobar pago verificado' : s}
                </option>
              ))}
            </select>
          </label>
          {next === 'Pagado' && (
            <label className="flex items-start gap-3 text-sm leading-6">
              <input
                required
                type="checkbox"
                name="bankVerified"
                className="mt-1 size-5 shrink-0 accent-black"
              />{' '}
              Verifiqué en el banco que ingresó el importe de este pedido. La
              captura por sí sola no confirma el pago.
            </label>
          )}
          {next === 'Enviado' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                htmlFor={`carrier-${order.id}`}
                className="grid gap-2 text-sm"
              >
                Transportadora
                <Input
                  id={`carrier-${order.id}`}
                  name="carrier"
                  required
                  maxLength={100}
                />
              </label>
              <label
                htmlFor={`trackingNumber-${order.id}`}
                className="grid gap-2 text-sm"
              >
                Número de guía
                <Input
                  id={`trackingNumber-${order.id}`}
                  name="trackingNumber"
                  required
                  maxLength={120}
                />
              </label>
              <label
                htmlFor={`trackingUrl-${order.id}`}
                className="grid gap-2 text-sm sm:col-span-2"
              >
                Enlace de seguimiento (opcional)
                <Input
                  id={`trackingUrl-${order.id}`}
                  name="trackingUrl"
                  type="url"
                  placeholder="https://"
                  maxLength={500}
                />
              </label>
            </div>
          )}
          {next && (
            <>
              <label className="grid gap-2 text-sm">
                {next === 'Pago rechazado'
                  ? 'Motivo para corregir el comprobante'
                  : 'Mensaje para el cliente (opcional)'}
                <Textarea
                  name="message"
                  required={next === 'Pago rechazado'}
                  maxLength={600}
                />
              </label>
              {next === 'Cancelado' && order.inventoryCommitted && (
                <p className="text-sm text-amber-900">
                  Se repondrá el stock. Si hubo un pago, su devolución debe
                  coordinarse con el cliente.
                </p>
              )}
              <Button disabled={busy} className="w-fit rounded-full">
                {busy && <LoaderCircle className="animate-spin" />} Guardar y
                notificar por correo
              </Button>
            </>
          )}
        </form>
      )}
      {details && (
        <div className="mt-5 grid gap-4">
          <div className="flex flex-wrap gap-2">
            {proofs.map((p, i) => (
              <Button
                key={p.id}
                variant="outline"
                onClick={() => void blob(`/api/admin/commerce/proofs/${p.id}`)}
              >
                Ver comprobante {proofs.length - i} ·{' '}
                {new Date(p.createdAt).toLocaleDateString('es-EC')}
              </Button>
            ))}
            {!proofs.length && (
              <p className="text-sm text-black/60">
                No se han subido comprobantes.
              </p>
            )}
          </div>
          {history.map((h, i) => (
            <div
              key={`${h.createdAt}-${i}`}
              className="border-l-2 border-[#d8b96e] pl-4 text-sm"
            >
              <p className="font-semibold">
                {h.status} · {new Date(h.createdAt).toLocaleString('es-EC')}
              </p>
              <p className="mt-1 whitespace-pre-line leading-6 text-black/65">
                {h.message}
              </p>
            </div>
          ))}
        </div>
      )}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview('');
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comprobante de {order.orderNumber}</DialogTitle>
            <DialogDescription>
              Verifica el ingreso en tu banco antes de aprobar el pago.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <Image
              unoptimized
              width={800}
              height={1000}
              src={preview}
              alt="Comprobante de transferencia enviado por el cliente"
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
