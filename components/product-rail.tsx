'use client';

import {
  Children,
  isValidElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';

export function ProductRail({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const items = Children.toArray(children);
  const [viewportRef, carousel] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 'auto',
    containScroll: 'trimSnaps',
  });
  const regionRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const [pages, setPages] = useState(1);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [desktopMotion, setDesktopMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visibleSlides, setVisibleSlides] = useState<number[]>([0, 1, 2, 3]);

  useEffect(() => {
    if (!carousel) return;
    const sync = () => {
      setPosition(carousel.selectedScrollSnap());
      setPages(carousel.scrollSnapList().length);
      setCanGoBack(carousel.canScrollPrev());
      setCanGoForward(carousel.canScrollNext());
    };
    const pauseForDrag = () => setUserPaused(true);
    const syncVisible = () => setVisibleSlides(carousel.slidesInView());
    sync();
    syncVisible();
    carousel
      .on('select', sync)
      .on('reInit', sync)
      .on('pointerDown', pauseForDrag)
      .on('slidesInView', syncVisible);
    return () => {
      carousel
        .off('select', sync)
        .off('reInit', sync)
        .off('pointerDown', pauseForDrag)
        .off('slidesInView', syncVisible);
    };
  }, [carousel]);

  useEffect(() => {
    const screen = window.matchMedia(
      '(min-width: 1024px) and (hover: hover) and (pointer: fine)',
    );
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setDesktopMotion(screen.matches && !motion.matches);
    sync();
    screen.addEventListener('change', sync);
    motion.addEventListener('change', sync);
    const visibility = () =>
      setDocumentVisible(document.visibilityState === 'visible');
    visibility();
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(
      ([entry]) =>
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.4),
      { threshold: [0, 0.4] },
    );
    if (regionRef.current) observer.observe(regionRef.current);
    return () => {
      screen.removeEventListener('change', sync);
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', visibility);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (
      !carousel ||
      pages < 2 ||
      !desktopMotion ||
      !inView ||
      !documentVisible ||
      userPaused ||
      engaged ||
      focused
    )
      return;
    const timer = window.setTimeout(() => {
      if (carousel.canScrollNext()) carousel.scrollNext();
      else carousel.scrollTo(0);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [
    carousel,
    pages,
    position,
    desktopMotion,
    inView,
    documentVisible,
    userPaused,
    engaged,
    focused,
  ]);

  const move = (direction: -1 | 1) => {
    setUserPaused(true);
    if (direction === 1) carousel?.scrollNext();
    else carousel?.scrollPrev();
  };

  return (
    <section
      ref={regionRef}
      aria-roledescription="carrusel"
      aria-label={label}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setEngaged(true);
      }}
      onPointerLeave={() => setEngaged(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] text-[#756951]">
          <span className="h-px w-5 bg-[#ab8743]/60" />
          <span className="lg:hidden">Desliza y descubre</span>
          <span className="hidden lg:inline">La selección de nuestra casa</span>
        </p>
        <div className="flex items-center gap-1.5">
          {pages > 1 && (
            <span
              className="mr-2 text-[10px] tabular-nums text-black/50"
              aria-live="off"
            >
              {String(position + 1).padStart(2, '0')}{' '}
              <span className="text-black/25">/</span>{' '}
              {String(pages).padStart(2, '0')}
            </span>
          )}
          {desktopMotion && pages > 1 && (
            <button
              type="button"
              onClick={() => setUserPaused(!userPaused)}
              aria-label={
                userPaused
                  ? 'Activar recorrido automático'
                  : 'Pausar recorrido automático'
              }
              className="grid size-11 place-items-center rounded-full border border-[#b49a64]/30 text-[#715827] transition hover:bg-white"
            >
              {userPaused ? (
                <Play className="size-3.5" />
              ) : (
                <Pause className="size-3.5" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={!canGoBack}
            aria-label="Ver recomendaciones anteriores"
            className="grid size-11 place-items-center rounded-full border border-[#b49a64]/30 text-[#29251d] transition hover:bg-white disabled:opacity-30"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={!canGoForward}
            aria-label="Ver más recomendaciones"
            className="grid size-11 place-items-center rounded-full bg-[#171611] text-[#e3c87f] transition hover:bg-[#715827] disabled:opacity-30"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="-mx-5 overflow-hidden px-5 pb-3 sm:mx-0 sm:px-0"
      >
        <div className="-ml-4 flex touch-pan-y items-stretch sm:-ml-5">
          {items.map((item, index) => (
            <div
              key={isValidElement(item) ? item.key : index}
              inert={!visibleSlides.includes(index)}
              className="flex min-w-0 flex-[0_0_86%] pl-4 min-[480px]:basis-[70%] sm:basis-1/2 sm:pl-5 lg:basis-1/3 xl:basis-1/4 [&>article]:w-full"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      {pages > 1 && (
        <div
          className="mt-5 h-px overflow-hidden bg-[#bca778]/25"
          aria-hidden="true"
        >
          <div
            className="h-full bg-[#9c7a39] transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${((position + 1) / pages) * 100}%` }}
          />
        </div>
      )}
    </section>
  );
}
