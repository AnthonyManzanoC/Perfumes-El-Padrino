import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';

import type { StorefrontData } from '@/lib/store-types';
import { getBackendUrl } from '@/lib/backend-url.mjs';

const apiUrl = getBackendUrl();
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nosotros | Perfumes El Padrino',
  description:
    'Conoce la historia y la forma de acompañarte de Perfumes El Padrino.',
};

async function getStore() {
  const response = await fetch(`${apiUrl}/api/storefront`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('No se pudo cargar la tienda.');
  return (await response.json()) as StorefrontData;
}

export default async function AboutPage() {
  const { settings } = await getStore();
  const theme = {
    '--brand-primary': settings.primaryColor,
    '--brand-accent': settings.accentColor,
    '--brand-background': settings.backgroundColor,
  } as CSSProperties;
  const whatsappUrl = `https://wa.me/${settings.whatsAppNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vengo de la web de ${settings.storeName} y quiero asesoría para elegir mi perfume.`)}`;

  return (
    <main
      style={theme}
      className="min-h-screen bg-[var(--brand-background)] text-[#171611]"
    >
      <header className="border-b border-white/10 bg-[var(--brand-primary)] text-white">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-9 lg:px-14">
          <a href="/" className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={`Logo de ${settings.storeName}`}
                className="size-10 rounded-full border border-white/15 object-cover"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-full border border-white/15 font-heading text-xl text-[var(--brand-accent)]">
                P
              </span>
            )}
            <span className="font-heading text-lg font-semibold tracking-[.12em]">
              {settings.storeName.toUpperCase()}
              <span className="block font-heading text-xs font-normal italic leading-4 tracking-normal opacity-80">by Jordy Tamayo</span>
            </span>
          </a>
          <a
            href="/#catalogo"
            className="rounded-full bg-[var(--brand-accent)] px-5 py-3 text-xs font-bold text-black"
          >
            Ver perfumes
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[var(--brand-primary)] px-5 py-20 text-white sm:px-9 lg:px-14 lg:py-28">
        <div className="absolute -right-36 -top-36 size-[34rem] rounded-full border border-[var(--brand-accent)]/15" />
        <div className="absolute -right-12 -top-12 size-[20rem] rounded-full border border-[var(--brand-accent)]/20" />
        <div className="relative mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.24em] text-[var(--brand-accent)]">
              La casa El Padrino
            </p>
            <h1 className="mt-6 max-w-3xl font-heading text-6xl font-semibold leading-[.88] sm:text-8xl">
              {settings.aboutTitle}
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/58">
              {settings.aboutText}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="/#catalogo"
                className="rounded-full bg-[var(--brand-accent)] px-7 py-3.5 text-sm font-bold text-black"
              >
                Explorar la colección
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-bold"
              >
                <MessageCircle className="size-4" /> Hablar con nosotros
              </a>
            </div>
          </div>
          <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
            <img
              src={settings.heroImageUrl}
              alt={`Selección de ${settings.storeName}`}
              className="absolute inset-0 h-full w-full object-cover opacity-75"
            />
            <div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] border border-white/10 bg-black/65 p-6 backdrop-blur-lg">
              <Sparkles className="size-5 text-[var(--brand-accent)]" />
              <p className="mt-4 font-heading text-3xl">{settings.tagline}</p>
              <p className="mt-2 text-xs text-white/48">{settings.address}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-9 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[#8a6c29]">
              Nuestra manera de acompañarte
            </p>
            <h2 className="mt-4 font-heading text-5xl font-semibold leading-none sm:text-7xl">
              Elegir un perfume también es elegir cómo quieres ser recordado.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              [
                ShieldCheck,
                'Selección cuidada',
                'Cada producto publicado forma parte del catálogo administrado por la tienda.',
              ],
              [
                MessageCircle,
                'Asesoría humana',
                'La compra continúa por WhatsApp para resolver dudas y confirmar cada detalle contigo.',
              ],
              [PackageCheck, 'Pedido acompañado', settings.deliveryText],
            ].map(([Icon, title, description], index) => (
              <article
                key={String(title)}
                className="rounded-[1.7rem] border border-black/8 bg-white p-7 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-6 text-[#8a6c29]" />
                  <span className="font-heading text-3xl text-black/15">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 font-heading text-3xl font-semibold">
                  {String(title)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-black/48">
                  {String(description)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#e8dfcf] px-5 py-20 sm:px-9 lg:px-14">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#8a6c29]">
              Estamos cerca
            </p>
            <h2 className="mt-3 font-heading text-5xl font-semibold">
              Cuéntanos qué aroma buscas.
            </h2>
            <p className="mt-4 flex items-center gap-2 text-sm text-black/50">
              <Truck className="size-4" /> {settings.address}
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-3 rounded-full bg-[#25D366] px-8 py-4 text-sm font-bold text-black"
          >
            <MessageCircle className="size-5" /> Recibir asesoría por WhatsApp
          </a>
        </div>
      </section>

      <footer className="bg-[var(--brand-primary)] px-5 py-9 text-white sm:px-9 lg:px-14">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <a
            href="/"
            className="flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="size-4" /> Volver a la tienda
          </a>
          <p className="font-heading text-xl text-[var(--brand-accent)]">
            {settings.storeName}
          </p>
        </div>
      </footer>
    </main>
  );
}
