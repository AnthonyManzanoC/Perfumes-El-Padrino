'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export type StoreCarouselSlide = {
  id: string;
  image: string;
  brand: string;
  name: string;
  price?: number;
  href?: string;
  newUntil?: string | null;
  featured?: boolean;
  bestseller?: boolean;
  updatedAt?: string;
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

function weightedShuffle(slides: StoreCarouselSlide[], firstId?: string) {
  const pool = [...slides];
  const result: StoreCarouselSlide[] = [];
  while (pool.length) {
    const now = Date.now();
    const weights = pool.map((item) => {
      const newProduct = item.newUntil && Date.parse(item.newUntil) > now;
      const recentlyUpdated =
        item.updatedAt && now - Date.parse(item.updatedAt) < 14 * 86400000;
      return 1 + (newProduct ? 5 : 0) + (item.featured ? 2 : 0) +
        (item.bestseller ? 1 : 0) + (recentlyUpdated ? 1 : 0);
    });
    let total = weights.reduce((sum, weight) => sum + weight, 0);
    let pick = Math.random() * total;
    let selected = weights.findIndex((weight) => (pick -= weight) < 0);
    if (result.length === 0 && firstId && pool.length > 1 && pool[selected]?.id === firstId) {
      total -= weights[selected];
      pick = Math.random() * total;
      selected = weights.findIndex((weight, index) => {
        if (index === pool.findIndex((item) => item.id === firstId)) return false;
        return (pick -= weight) < 0;
      });
    }
    result.push(pool.splice(Math.max(0, selected), 1)[0]);
  }
  return result;
}

export function StoreCarousel({
  slides,
  variant,
  currency = 'USD',
}: StoreCarouselProps) {
  const isHero = variant === 'hero';
  const inventoryKey = useMemo(
    () =>
      JSON.stringify(
        slides.map((slide) => [
          slide.id,
          slide.image,
          slide.newUntil,
          slide.featured,
          slide.bestseller,
          slide.updatedAt,
        ]),
      ),
    [slides],
  );
  const [activeId, setActiveId] = useState(slides[0]?.id ?? '');
  const [paused, setPaused] = useState(false);
  const sequenceRef = useRef<StoreCarouselSlide[]>([]);
  const cursorRef = useRef(0);
  const currentIdRef = useRef(slides[0]?.id ?? '');

  useEffect(() => {
    const first = slides[0];
    const sequence = weightedShuffle(slides, first?.id);
    sequenceRef.current = sequence;
    cursorRef.current = 0;
    const initial = sequence[0] ?? first;
    if (initial) {
      currentIdRef.current = initial.id;
      setActiveId(initial.id);
      cursorRef.current = 1;
    }
  }, [inventoryKey]); // Refresh and reshuffle when the live inventory changes.

  const move = (direction: 1 | -1) => {
    if (!slides.length) return;
    if (direction === -1) {
      const currentIndex = slides.findIndex((item) => item.id === currentIdRef.current);
      const previous = slides[(currentIndex - 1 + slides.length) % slides.length];
      currentIdRef.current = previous.id;
      setActiveId(previous.id);
      return;
    }
    let sequence = sequenceRef.current;
    if (cursorRef.current >= sequence.length) {
      sequence = weightedShuffle(slides, currentIdRef.current);
      sequenceRef.current = sequence;
      cursorRef.current = 0;
    }
    const next = sequence[cursorRef.current++];
    if (next) {
      currentIdRef.current = next.id;
      setActiveId(next.id);
    }
  };

  useEffect(() => {
    if (
      slides.length < 2 ||
      paused ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;
    const timer = window.setInterval(() => move(1), 6500);
    return () => window.clearInterval(timer);
  }, [paused, inventoryKey]);

  if (!slides.length) return null;
  const activeIndex = Math.max(0, slides.findIndex((item) => item.id === activeId));
  const slide = slides[activeIndex] ?? slides[0];

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
      <div className={`absolute overflow-hidden rounded-[2rem] border border-[#d8b96e]/25 shadow-[0_35px_100px_rgba(0,0,0,.42),0_0_0_8px_rgba(255,255,255,.025)] ${isHero ? 'inset-4 bg-[#e9e4da] sm:inset-8 lg:inset-y-10 lg:left-8 lg:right-10' : 'inset-5 rounded-[1.75rem] bg-[#e9e4da] sm:inset-8'}`}>
        <div key={slide.id} className="absolute inset-0 flex animate-[carousel-reveal_.55s_ease-out_both] flex-col">
          <div className="relative min-h-0 flex-1 bg-[radial-gradient(ellipse_at_50%_38%,#fff_0%,#e9e4da_68%,#d7ccba_100%)]">
            {isHero && (
              <div className="absolute left-5 right-5 top-5 z-[1] flex items-center justify-between sm:left-7 sm:right-7 sm:top-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#947133]/25 bg-[#fffefa]/75 px-3 py-2 text-[8px] font-bold uppercase tracking-[.18em] text-[#755a27] shadow-sm backdrop-blur-sm sm:text-[9px]">
                  <Sparkles className="size-3" /> Selección El Padrino
                </span>
                <span className="font-heading text-sm italic text-black/45">{String(activeIndex + 1).padStart(2, '0')} <span className="font-sans text-[9px] not-italic">/ {String(slides.length).padStart(2, '0')}</span></span>
              </div>
            )}
            <img
              src={slide.image}
              alt={`${slide.brand} ${slide.name}`}
              className={`size-full object-contain mix-blend-multiply transition-transform duration-700 hover:scale-[1.025] ${isHero ? 'p-5 sm:p-8' : 'p-7 sm:p-10'}`}
              fetchPriority={isHero ? 'high' : undefined}
            />
          </div>
          <div className={`relative z-[1] shrink-0 border-t border-white/10 bg-[#11100d] text-white ${isHero ? 'px-5 py-4 sm:px-8 sm:py-5' : 'px-6 py-5 sm:px-8'}`}>
            {isHero ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#e3c87f]">{slide.brand}</p>
                <div className="mt-1 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-heading text-xl font-medium leading-tight sm:text-2xl">{slide.name}</p>
                    {typeof slide.price === 'number' && <p className="mt-1 text-sm text-white/70">{formatPrice(slide.price, currency)}</p>}
                  </div>
                  {slide.href && <a href={slide.href} className="shrink-0 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold transition hover:border-[#e3c87f] hover:text-[#e3c87f]">Descubrir</a>}
                </div>
              </>
            ) : (
              <div className="flex min-h-[94px] items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#e3c87f]">
                    <Sparkles className="size-3" /> Selección El Padrino
                  </span>
                  <p className="mt-2 truncate font-heading text-xl text-white sm:text-2xl">{slide.brand} {slide.name}</p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.16em] text-white/55 sm:text-[10px]">Tu ocasión <span className="px-1.5 text-[#e3c87f]">·</span> Tu estilo <span className="px-1.5 text-[#e3c87f]">·</span> Tu match</p>
                </div>
                <span className="hidden shrink-0 rounded-full border border-white/15 px-3 py-2 text-xs text-white/65 sm:inline">{activeIndex + 1} / {slides.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => move(-1)} className={`absolute ${isHero ? 'left-7 lg:left-10' : 'left-8'} top-[42%] z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-[#171611]/65 text-white shadow-lg backdrop-blur transition hover:bg-[#171611]`} aria-label="Ver perfume anterior"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => move(1)} className={`absolute ${isHero ? 'right-7 lg:right-12' : 'right-8'} top-[42%] z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-[#171611]/65 text-white shadow-lg backdrop-blur transition hover:bg-[#171611]`} aria-label="Ver perfume siguiente"><ChevronRight className="size-5" /></button>
          <div className={`absolute ${isHero ? 'bottom-5' : 'bottom-2'} left-1/2 z-10 flex max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-[#11100d]/85 px-3 py-2 backdrop-blur`} aria-label={`Producto ${activeIndex + 1} de ${slides.length}`}>
            <span className="size-1.5 rounded-full bg-white/50" />
            <span className="h-1.5 w-7 rounded-full bg-[#e3c87f]" />
            <span className="size-1.5 rounded-full bg-white/50" />
            <span className="ml-1 text-[9px] tabular-nums text-white/75">{activeIndex + 1} / {slides.length}</span>
          </div>
        </>
      )}
      <span className="sr-only" aria-live="off">{slide.brand} {slide.name}</span>
    </div>
  );
}
