'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(true);
  const [message, setMessage] = useState('');
  const pathname = usePathname();
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const sync = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    sync();
    standalone.addEventListener('change', sync);
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', done);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
        setMessage('Puedes seguir comprando desde el navegador.');
      });
    }
    return () => {
      standalone.removeEventListener('change', sync);
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch { setMessage('Abre el menú de tu navegador y busca «Instalar aplicación» o «Añadir a pantalla de inicio».'); }
  }
  if (installed || pathname.startsWith('/admin') || pathname.startsWith('/pedido/')) return null;
  return (
    <section className="border-t border-white/10 bg-[#11100d] px-6 py-8 text-center text-[#f4f0e7]">
      <p className="font-heading text-2xl text-[#e3c87f]">El Padrino, siempre contigo.</p>
      <p className="mt-2 text-sm">Instala la tienda en tu celular · by Jordy Tamayo</p>
      {prompt ? <button type="button" onClick={() => void install()} className="mt-4 rounded-full bg-[#e3c87f] px-6 py-3 font-semibold text-[#11100d]">Instalar El Padrino</button>
        : <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/70">En iPhone: abre Safari, pulsa Compartir y «Añadir a pantalla de inicio». En Android: busca «Instalar aplicación» en el menú del navegador.</p>}
      {message && <output className="mt-3 block text-sm">{message}</output>}
    </section>
  );
}

