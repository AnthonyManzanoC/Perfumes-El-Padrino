'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles } from 'lucide-react';

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
      return (
        1 +
        (newProduct ? 5 : 0) +
        (item.featured ? 2 : 0) +
        (item.bestseller ? 1 : 0) +
        (recentlyUpdated ? 1 : 0)
      );
    });
    let total = weights.reduce((sum, weight) => sum + weight, 0);
    let pick = Math.random() * total;
    let selected = weights.findIndex((weight) => (pick -= weight) < 0);
    if (
      result.length === 0 &&
      firstId &&
      pool.length > 1 &&
      pool[selected]?.id === firstId
    ) {
      total -= weights[selected];
      pick = Math.random() * total;
      selected = weights.findIndex((weight, index) => {
        if (index === pool.findIndex((item) => item.id === firstId))
          return false;
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
  const hasSlides = slides.length > 0;
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
  const [autoplayPreference, setAutoplayPreference] = useState<boolean | null>(
    null,
  );
  const [desktopAutoplay, setDesktopAutoplay] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [navigationVersion, setNavigationVersion] = useState(0);
  const regionRef = useRef<HTMLElement>(null);
  const slidesRef = useRef(slides);
  const sequenceRef = useRef<string[]>([]);
  const cursorRef = useRef(0);
  const currentIdRef = useRef(slides[0]?.id ?? '');
  const gestureRef = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    const inventory = slidesRef.current;
    const current =
      inventory.find((item) => item.id === currentIdRef.current) ??
      inventory[0];
    // Keep the server-rendered perfume in place; randomize only what comes next.
    sequenceRef.current = current
      ? [
          current.id,
          ...weightedShuffle(
            inventory.filter((item) => item.id !== current.id),
          ).map((item) => item.id),
        ]
      : [];
    cursorRef.current = 0;
    currentIdRef.current = current?.id ?? '';
    setActiveId(current?.id ?? '');
  }, [inventoryKey]); // Preserve the current perfume when live inventory changes.

  const move = useCallback((direction: 1 | -1, manual = true) => {
    const inventory = slidesRef.current;
    if (inventory.length < 2) return;
    if (manual) setAutoplayPreference(false);
    if (direction === -1 && cursorRef.current === 0) {
      const previousCycle = weightedShuffle(
        inventory.filter((item) => item.id !== currentIdRef.current),
      ).map((item) => item.id);
      sequenceRef.current.unshift(...previousCycle);
      cursorRef.current = previousCycle.length;
    }
    if (
      direction === 1 &&
      cursorRef.current === sequenceRef.current.length - 1
    ) {
      // Visit every perfume once per weighted cycle, avoiding a repeated boundary.
      sequenceRef.current.push(
        ...weightedShuffle(inventory, currentIdRef.current).map(
          (item) => item.id,
        ),
      );
    }
    cursorRef.current += direction;
    const next = sequenceRef.current[cursorRef.current];
    if (next) {
      currentIdRef.current = next;
      setActiveId(next);
      setNavigationVersion((value) => value + 1);
    }
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine)',
    );
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMedia = () => {
      setDesktopAutoplay(desktop.matches);
      setReducedMotion(motion.matches);
    };
    const syncVisibility = () =>
      setDocumentVisible(document.visibilityState === 'visible');
    syncMedia();
    syncVisibility();
    desktop.addEventListener('change', syncMedia);
    motion.addEventListener('change', syncMedia);
    document.addEventListener('visibilitychange', syncVisibility);
    const observer = new IntersectionObserver(
      ([entry]) =>
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.6),
      { threshold: [0, 0.6] },
    );
    if (regionRef.current) observer.observe(regionRef.current);
    return () => {
      observer.disconnect();
      desktop.removeEventListener('change', syncMedia);
      motion.removeEventListener('change', syncMedia);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, [hasSlides]);

  const autoplayEnabled =
    !reducedMotion && (autoplayPreference ?? desktopAutoplay);
  const rotating =
    autoplayEnabled && inView && documentVisible && !hovered && !focused;

  useEffect(() => {
    if (slides.length < 2 || !rotating) return;
    const timer = window.setTimeout(() => move(1, false), 9500);
    return () => window.clearTimeout(timer);
  }, [rotating, navigationVersion, inventoryKey, move, slides.length]);

  if (!slides.length) return null;
  const activeIndex = Math.max(
    0,
    slides.findIndex((item) => item.id === activeId),
  );
  const slide = slides[activeIndex] ?? slides[0];

  return (
    // Swipe and focus handlers complement the fully keyboard-accessible buttons below.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={regionRef}
      className={`relative flex h-full min-h-[420px] w-full min-w-0 [touch-action:pan-y_pinch-zoom] flex-col p-3 sm:p-6 ${isHero ? 'lg:min-h-[540px] lg:p-8' : 'lg:min-h-[430px]'}`}
      aria-roledescription="carrusel"
      aria-label={isHero ? 'Perfumes destacados' : 'Selección de fragancias'}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={(event) => {
        if (
          event.pointerType === 'mouse' ||
          (event.target as HTMLElement).closest('a, button')
        )
          return;
        gestureRef.current = {
          x: event.clientX,
          y: event.clientY,
          pointerId: event.pointerId,
        };
      }}
      onPointerUp={(event) => {
        const start = gestureRef.current;
        gestureRef.current = null;
        if (!start || start.pointerId !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.35)
          move(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        gestureRef.current = null;
      }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-[#d8b96e]/25 bg-[#e9e4da] shadow-[0_25px_70px_rgba(0,0,0,.3)] sm:rounded-[1.75rem] lg:shadow-[0_35px_100px_rgba(0,0,0,.42),0_0_0_8px_rgba(255,255,255,.025)]">
        <article
          key={slide.id}
          aria-roledescription="diapositiva"
          aria-label={`${activeIndex + 1} de ${slides.length}: ${slide.brand} ${slide.name}`}
          className="flex min-h-0 flex-1 animate-[carousel-reveal_.55s_ease-out_both] flex-col motion-reduce:animate-none"
        >
          <div className="relative min-h-[180px] flex-1 bg-[radial-gradient(ellipse_at_50%_38%,#fff_0%,#e9e4da_68%,#d7ccba_100%)] sm:min-h-[200px] lg:min-h-[180px]">
            {isHero && (
              <div className="absolute left-4 right-4 top-3 z-[1] flex items-center justify-between gap-2 sm:left-6 sm:right-6 sm:top-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#947133]/25 bg-[#fffefa]/85 px-3 py-2 text-[8px] font-bold uppercase tracking-[.16em] text-[#755a27] shadow-sm backdrop-blur-sm sm:text-[9px]">
                  <Sparkles className="size-3" /> Selección El Padrino
                </span>
              </div>
            )}
            {/* Product images use the existing catalog CDN URLs, including hosts configured in admin. */}
            {/* oxlint-disable-next-line next/no-img-element */}
            <img
              src={slide.image}
              alt={`${slide.brand} ${slide.name}`}
              className={`absolute inset-0 size-full select-none object-contain mix-blend-multiply ${isHero ? 'px-8 pb-4 pt-12 sm:px-10 sm:pb-5 sm:pt-14' : 'p-6 sm:p-8'}`}
              draggable={false}
              fetchPriority={isHero ? 'high' : undefined}
              loading={isHero ? 'eager' : 'lazy'}
            />
          </div>
          <div
            className={`relative z-[1] shrink-0 border-t border-white/10 bg-[#11100d] text-white ${isHero ? 'px-5 py-4 sm:px-8 sm:py-5' : 'px-6 py-5 sm:px-8'}`}
          >
            {isHero ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#e3c87f]">
                  {slide.brand}
                </p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-heading text-xl font-medium leading-tight sm:text-2xl">
                      {slide.name}
                    </p>
                    {typeof slide.price === 'number' && (
                      <p className="mt-1 text-sm text-white/70">
                        {formatPrice(slide.price, currency)}
                      </p>
                    )}
                  </div>
                  {slide.href && (
                    <a
                      href={slide.href}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/30 px-3 text-[11px] font-semibold transition hover:border-[#e3c87f] hover:text-[#e3c87f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e3c87f] sm:px-4 sm:text-xs"
                    >
                      Descubrir
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-[78px] items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#e3c87f]">
                    <Sparkles className="size-3" /> Selección El Padrino
                  </span>
                  <p className="mt-2 line-clamp-2 font-heading text-xl leading-tight text-white sm:text-2xl">
                    {slide.brand} {slide.name}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.16em] text-white/55 sm:text-[10px]">
                    Tu ocasión <span className="px-1.5 text-[#e3c87f]">·</span>{' '}
                    Tu estilo <span className="px-1.5 text-[#e3c87f]">·</span>{' '}
                    Tu match
                  </p>
                </div>
              </div>
            )}
          </div>
        </article>
        {slides.length > 1 && (
          <div className="relative flex shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-[#11100d] px-3 py-2 text-white sm:px-5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(-1)}
                className="grid size-11 place-items-center rounded-full border border-white/20 text-white/90 transition hover:border-[#e3c87f] hover:text-[#e3c87f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c87f]"
                aria-label="Ver perfume anterior"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                className="grid size-11 place-items-center rounded-full border border-white/20 text-white/90 transition hover:border-[#e3c87f] hover:text-[#e3c87f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c87f]"
                aria-label="Ver perfume siguiente"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <span
              className="text-[11px] tabular-nums tracking-[.08em] text-white/65"
              aria-label={`Producto ${activeIndex + 1} de ${slides.length}`}
            >
              {String(activeIndex + 1).padStart(2, '0')}{' '}
              <span className="mx-1 text-white/30">/</span>{' '}
              {String(slides.length).padStart(2, '0')}
            </span>
            {!reducedMotion && (
              <button
                type="button"
                onClick={(event) => {
                  setAutoplayPreference(!autoplayEnabled);
                  setNavigationVersion((value) => value + 1);
                  if (event.detail > 0) event.currentTarget.blur();
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-[10px] font-medium text-[#e3c87f] transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c87f]"
                aria-label={
                  autoplayEnabled
                    ? 'Pausar cambio automático de perfumes'
                    : 'Activar cambio automático de perfumes'
                }
                aria-pressed={autoplayEnabled}
              >
                {autoplayEnabled ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
                <span>{autoplayEnabled ? 'Pausar' : 'Reproducir'}</span>
              </button>
            )}
          </div>
        )}
      </div>
      <span
        className="sr-only"
        aria-live={autoplayEnabled ? 'off' : 'polite'}
        aria-atomic="true"
      >
        {slide.brand} {slide.name}
      </span>
    </section>
  );
}
