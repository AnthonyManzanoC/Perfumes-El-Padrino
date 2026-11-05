'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Settings = {
  enabled: boolean;
  primary: string;
  secondary: string;
  configured: boolean;
  quickLinksReady: boolean;
  backupConfigured: boolean;
  activity: Array<{
    id: string;
    recipient: string | null;
    createdAt: string;
    finishedAt: string | null;
    result: string | null;
  }>;
};

const endpoint = '/api/admin/commerce/whatsapp';

export function WhatsAppAdmin({ token }: { token: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    apiFetch<Settings>(endpoint, {}, token).then(
      (value) => {
        if (active) setSettings(value);
      },
      (error: Error) => {
        if (active) setStatus(error.message);
      },
    );
    return () => {
      active = false;
    };
  }, [token]);

  async function run(action: 'save' | 'test' | 'refresh') {
    if (!settings || busy) return;
    setBusy(true);
    setStatus('');
    try {
      if (action === 'test') {
        const reply = await apiFetch<{ message: string }>(
          endpoint + '/test',
          { method: 'POST' },
          token,
        );
        setStatus(reply.message);
      } else if (action === 'save') {
        const { enabled, primary, secondary } = settings;
        setSettings(
          await apiFetch<Settings>(
            endpoint,
            {
              method: 'PUT',
              body: JSON.stringify({ enabled, primary, secondary }),
            },
            token,
          ),
        );
        setStatus('Destinatarios guardados.');
      } else {
        const current = await apiFetch<Settings>(endpoint, {}, token);
        setSettings(
          (previous) => previous && { ...previous, activity: current.activity },
        );
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'No se pudo completar la operación.',
      );
    } finally {
      setBusy(false);
    }
  }

  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void run('save');
  }

  return (
    <section className="rounded-3xl bg-white p-6 sm:p-8">
      <h2 className="font-heading text-3xl">Avisos por WhatsApp</h2>
      <p className="my-3 text-sm text-black/65">
        Recibe avisos de pedidos, comprobantes, despachos, entregas y
        cancelaciones. La prueba se envía al número principal guardado.
      </p>
      {settings && (
        <>
          <form className="grid gap-4" onSubmit={save}>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) =>
                  setSettings({ ...settings, enabled: event.target.checked })
                }
              />
              Activar avisos automáticos
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label htmlFor="whatsapp-primary" className="grid gap-2 text-sm">
                Número principal
                <Input
                  id="whatsapp-primary"
                  type="tel"
                  maxLength={40}
                  required={settings.enabled}
                  value={settings.primary}
                  onChange={(event) =>
                    setSettings({ ...settings, primary: event.target.value })
                  }
                />
              </label>
              <label
                htmlFor="whatsapp-secondary"
                className="grid gap-2 text-sm"
              >
                Número adicional (opcional)
                <Input
                  id="whatsapp-secondary"
                  type="tel"
                  maxLength={40}
                  value={settings.secondary}
                  onChange={(event) =>
                    setSettings({ ...settings, secondary: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>
                Guardar avisos
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !settings.configured}
                onClick={() => void run('test')}
              >
                Enviar prueba al número guardado
              </Button>
            </div>
          </form>
          <p className="my-4 text-sm text-black/65">
            GREEN-API{' '}
            {settings.configured ? 'configurada' : 'pendiente de configurar'} ·
            Enlaces {settings.quickLinksReady ? 'activos' : 'pendientes'} ·
            Respaldo {settings.backupConfigured ? 'configurado' : 'pendiente'}
          </p>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <h3 className="font-medium">Actividad reciente</h3>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void run('refresh')}
            >
              Actualizar
            </Button>
          </div>
          <ul className="mt-3 divide-y text-sm">
            {settings.activity.map((job) => (
              <li className="py-2" key={job.id}>
                {new Date(job.createdAt).toLocaleString('es-EC')} ·{' '}
                {job.recipient ? `WhatsApp ${job.recipient}` : 'Respaldo'} ·{' '}
                {job.result ?? 'Pendiente'}
              </li>
            ))}
            {settings.activity.length === 0 && (
              <li className="py-2 text-black/60">Aún no hay actividad.</li>
            )}
          </ul>
        </>
      )}
      <output className="mt-3 block text-sm">{status}</output>
    </section>
  );
}
