'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export type StoreCarouselSlide = {
  image: string;
  brand: string;
  name: string;
  price?: number;
  href?: string;
};

type StoreCarouselProps = {
  slides: StoreCarouselSlide[];
  variant: 'hero' | 'advisor';
  currency?: string;
};

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(
    value,
  );
}

export function StoreCarousel({
  slides,
  variant,
  currency = 'USD',
}: StoreCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const isHero = variant === 'hero';

  useEffect(() => {
    if (
      slides.length < 2 ||
      paused ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!slides.length) return null;

  const previous = () =>
    setActive((current) => (current - 1 + slides.length) % slides.length);
  const next = () => setActive((current) => (current + 1) % slides.length);
  const slide = slides[active];

  return (
    <div
      className={`relative h-full w-full ${isHero ? 'min-h-[400px] lg:min-h-[540px]' : 'min-h-[430px]'}`}
      role="region"
      aria-roledescription="carrusel"
      aria-label={isHero ? 'Perfumes destacados' : 'Selección de fragancias'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {slides.map((item, index) => (
          <div
            key={`${item.brand}-${item.name}`}
            className={`absolute inset-0 transition-opacity duration-700 ${index === active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            aria-hidden={index !== active}
          >
            {isHero ? (
              <div className="absolute inset-4 overflow-hidden rounded-[2rem] border border-white/15 bg-[#e9e4da] shadow-[0_35px_100px_rgba(0,0,0,.4)] sm:inset-8 lg:inset-y-10 lg:left-8 lg:right-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#fff_0%,#e9e4da_68%,#d7ccba_100%)]" />
                <img
                  src={item.image}
                  alt={`${item.brand} ${item.name}`}
                  className="absolute inset-0 size-full object-contain p-5 mix-blend-multiply sm:p-8"
                  fetchPriority={index === 0 ? 'high' : undefined}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#11100d] via-[#11100d]/90 to-transparent px-5 pb-5 pt-20 text-white sm:px-8 sm:pb-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#e3c87f]">
                    {item.brand}
                  </p>
                  <div className="mt-1 flex items-end justify-between gap-4">
                    <div>
                      <p className="font-heading text-xl font-medium leading-tight sm:text-2xl">
                        {item.name}
                      </p>
                      {typeof item.price === 'number' && (
                        <p className="mt-1 text-sm text-white/70">
                          {formatPrice(item.price, currency)}
                        </p>
                      )}
                    </div>
                    {item.href && (
                      <a
                        href={item.href}
                        tabIndex={index === active ? 0 : -1}
                        className="shrink-0 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold transition hover:border-[#e3c87f] hover:text-[#e3c87f]"
                      >
                        Descubrir
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#604828_0%,#302416_48%,#17130d_100%)]">
                <div className="absolute inset-5 overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#e9e4da] shadow-2xl sm:inset-8">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#fff_0%,#e9e4da_68%,#d7ccba_100%)]" />
                  <img
                    src={item.image}
                    alt={`${item.brand} ${item.name}`}
                    className="absolute inset-0 size-full object-contain p-7 mix-blend-multiply sm:p-10"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-6 pb-20 pt-24 sm:px-8">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#e3c87f]/40 bg-black/35 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.2em] text-[#e3c87f] backdrop-blur">
                      <Sparkles className="size-3" /> Selección El Padrino
                    </span>
                    <p className="mt-3 font-heading text-xl text-white sm:text-2xl">
                      {item.brand} {item.name}
                    </p>
                    <p className="mt-2 text-[9px] font-semibold uppercase tracking-[.16em] text-white/65 sm:text-[10px]">
                      Tu ocasión <span className="px-1.5 text-[#e3c87f]">·</span>
                      Tu estilo <span className="px-1.5 text-[#e3c87f]">·</span>
                      Tu match
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={previous}
            className={`absolute left-7 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur transition hover:bg-black/70 ${isHero ? 'lg:left-10' : 'left-8'}`}
            aria-label="Ver perfume anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className={`absolute right-7 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur transition hover:bg-black/70 ${isHero ? 'lg:right-12' : 'right-8'}`}
            aria-label="Ver perfume siguiente"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className={`absolute ${isHero ? 'bottom-5' : 'top-5'} left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 backdrop-blur`}>
            {slides.map((item, index) => (
              <button
                key={`${item.brand}-${item.name}-dot`}
                type="button"
                onClick={() => setActive(index)}
                className={`h-1.5 rounded-full transition-all ${index === active ? 'w-7 bg-[#e3c87f]' : 'w-1.5 bg-white/55 hover:bg-white'}`}
                aria-label={`Ver perfume ${index + 1} de ${slides.length}`}
                aria-current={index === active}
              />
            ))}
          </div>
        </>
      )}
      <span className="sr-only" aria-live="off">
        {slide.brand} {slide.name}
      </span>
    </div>
  );
}
