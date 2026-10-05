import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { identityKeywords } from '@/lib/seo';
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
  title: 'Perfumes El Padrino · Nuestra casa en Babahoyo',
  alternates: { canonical: '/nosotros' },
  description:
    'Conoce Perfumes El Padrino by Jordy Tamayo, perfumería en Babahoyo, Los Ríos, Ecuador, con asesoría y envíos nacionales.',
  keywords: [
    ...identityKeywords,
    'perfumería Babahoyo',
    'perfumes Babahoyo',
    'perfumes originales Ecuador',
  ],
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
          <a href="/" className="group flex items-center gap-3">
            <img
              src={settings.logoUrl || '/brand/el-padrino-mark.svg'}
              alt={`Emblema de ${settings.storeName}`}
              className="size-11 rounded-full border border-white/15 object-cover shadow-[0_0_25px_rgba(216,185,110,.12)] transition group-hover:border-[var(--brand-accent)]/60"
            />
            <span className="font-heading text-base font-semibold tracking-[.14em] sm:text-lg">
              {settings.storeName.toUpperCase()}
              <span className="block font-heading text-xs font-normal italic leading-4 tracking-normal opacity-80">
                by Jordy Tamayo
              </span>
            </span>
          </a>
          <a
            href="/#catalogo"
            className="group flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-black shadow-[0_8px_28px_rgba(216,185,110,.13)] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            Ver perfumes <Sparkles className="size-3.5" />
          </a>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[var(--brand-primary)] px-5 py-20 text-white sm:px-9 lg:px-14 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_48%,rgba(192,151,72,.17),transparent_34%),linear-gradient(118deg,#0c0b09_0%,#18150f_52%,#0a0908_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.09] [background-image:linear-gradient(rgba(255,255,255,.11)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.11)_1px,transparent_1px)] [background-size:88px_88px] [mask-image:linear-gradient(90deg,transparent,black)]" />
        <div className="absolute -right-36 -top-36 size-[34rem] rounded-full border border-[var(--brand-accent)]/15" />
        <div className="absolute -right-12 -top-12 size-[20rem] rounded-full border border-[var(--brand-accent)]/20" />
        <div className="relative mx-auto grid max-w-[1540px] gap-14 lg:grid-cols-[1fr_.96fr] lg:items-center lg:gap-16">
          <div>
            <p className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[.26em] text-[var(--brand-accent)]">
              <span className="h-px w-9 bg-[var(--brand-accent)]/75" />
              La casa El Padrino
            </p>
            <h1 className="mt-7 max-w-3xl font-heading text-[clamp(3.7rem,7.2vw,7.5rem)] font-medium leading-[.83] tracking-[-.045em] [text-shadow:0_5px_32px_rgba(0,0,0,.2)]">
              {settings.aboutTitle}
            </h1>
            <p className="mt-8 max-w-2xl text-[15px] leading-8 text-[#e8e1d5]/68 sm:text-lg">
              {settings.aboutText}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="/#catalogo"
                className="rounded-full bg-[var(--brand-accent)] px-7 py-3.5 text-[10px] font-bold uppercase tracking-[.1em] text-black shadow-[0_8px_28px_rgba(216,185,110,.13)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                Explorar la colección
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/[.035] px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[.1em] text-white transition hover:border-[var(--brand-accent)]/45 hover:bg-white/[.07]"
              >
                <MessageCircle className="size-4" /> Hablar con nosotros
              </a>
            </div>
          </div>
          <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] border border-[var(--brand-accent)]/25 bg-[#1b1812] shadow-[0_36px_100px_rgba(0,0,0,.36)] sm:min-h-[540px]">
            <img
              src={settings.heroImageUrl || '/og.png'}
              alt={`Selección de ${settings.storeName}`}
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c0a]/95 via-[#0d0c0a]/10 to-[#0d0c0a]/15" />
            <span className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-[8px] font-bold uppercase tracking-[.22em] text-white/85 backdrop-blur-md">
              <Sparkles className="size-3 text-[var(--brand-accent)]" /> Perfumería · Babahoyo, Ecuador
            </span>
            <div className="absolute bottom-7 left-6 right-6 border-l border-[var(--brand-accent)]/75 pl-5 sm:bottom-9 sm:left-9 sm:right-9 sm:pl-7">
              <p className="text-[8px] font-bold uppercase tracking-[.24em] text-[var(--brand-accent)]">Una firma que permanece</p>
              <p className="mt-2 font-heading text-3xl text-white sm:text-4xl">{settings.tagline}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[.12em] text-white/55">{settings.address}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(125deg,#f7f4ed_0%,#eee9df_100%)] px-5 py-20 sm:px-9 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-2xl">
            <p className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[.24em] text-[#8a6c29]">
              <span className="h-px w-8 bg-[#b28a3a]" />
              Nuestra manera de acompañarte
            </p>
            <h2 className="mt-5 font-heading text-5xl font-medium leading-[.94] tracking-[-.025em] sm:text-7xl">
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
                className="group rounded-[1.4rem] border border-[#211d14]/[.08] bg-[#fffefa]/75 p-7 shadow-[0_12px_36px_rgba(40,32,16,.035)] transition duration-500 hover:-translate-y-1 hover:border-[#b28a3a]/35 hover:bg-white hover:shadow-[0_26px_65px_rgba(40,32,16,.09)]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full border border-[#9c7a39]/20 bg-[#f3eee4] transition group-hover:bg-[#171611] group-hover:text-[#e3c87f]">
                    <Icon className="size-5 text-[#8a6c29] transition group-hover:text-[#e3c87f]" />
                  </span>
                  <span className="font-heading text-3xl text-black/15">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 font-heading text-3xl font-medium">
                  {String(title)}
                </h3>
                <p className="mt-3 text-[13px] leading-6 text-black/55">
                  {String(description)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#e8dfcf] px-5 py-16 sm:px-9 lg:px-14 lg:py-20">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 rounded-[1.8rem] border border-[#9c7a39]/20 bg-[linear-gradient(120deg,rgba(255,255,255,.43),rgba(255,255,255,.14))] p-7 shadow-[0_20px_60px_rgba(64,48,20,.06)] sm:p-10 lg:flex-row lg:items-center lg:p-12">
          <div>
            <p className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[.24em] text-[#8a6c29]">
              <span className="h-px w-8 bg-[#b28a3a]" />
              Estamos cerca
            </p>
            <h2 className="mt-4 max-w-2xl font-heading text-4xl font-medium leading-[.98] sm:text-5xl">
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
            className="flex w-fit items-center gap-3 rounded-full bg-[#171611] px-8 py-4 text-[10px] font-bold uppercase tracking-[.1em] text-[#e3c87f] shadow-[0_12px_32px_rgba(30,25,14,.18)] transition hover:-translate-y-0.5 hover:bg-[#2a2519]"
          >
            <MessageCircle className="size-5" /> Recibir asesoría por WhatsApp
          </a>
        </div>
      </section>

      <footer className="bg-[var(--brand-primary)] px-5 py-9 text-white sm:px-9 lg:px-14">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <a
            href="/"
            className="group flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.12em] text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-1" /> Volver a la tienda
          </a>
          <a href="/" className="flex items-center gap-3">
            <img src={settings.logoUrl || '/brand/el-padrino-mark.svg'} alt="" className="size-9 rounded-full border border-white/15 object-cover" />
            <span className="font-heading text-sm tracking-[.12em] text-white/85">{settings.storeName}<span className="block text-[10px] italic tracking-normal text-white/45">by Jordy Tamayo</span></span>
          </a>
        </div>
      </footer>
    </main>
  );
}
