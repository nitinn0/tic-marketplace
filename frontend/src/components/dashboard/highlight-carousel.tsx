"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

export type CarouselSlide = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  image: string;
};

const INTERVAL_MS = 4500;

export function HighlightCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [hovered, setHovered] = useState(false);
  const paused = held || hovered;
  const count = slides.length;
  const safeIndex = count === 0 ? 0 : index % count;

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;
  const slide = slides[safeIndex];

  function go(next: number) {
    setIndex((next + count) % count);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Marketplace highlights"
      className="relative overflow-hidden rounded-3xl shadow-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative min-h-[22rem]">
        {slides.map((item, slideIndex) => (
          <article
            key={item.id}
            aria-hidden={slideIndex !== safeIndex}
            className={`absolute inset-0 text-white transition-opacity duration-700 ${
              slideIndex === safeIndex ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/55 to-slate-950/10" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/50 to-transparent" />
            <div className="relative flex min-h-[22rem] flex-col items-start justify-center px-8 py-8 pb-16 sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">{item.kicker}</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">{item.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">{item.body}</p>
            <Link
              href={item.href}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90"
            >
              {item.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/40 p-1 backdrop-blur-sm">
        <button
          type="button"
          aria-label={held ? "Play highlights" : "Pause highlights"}
          onClick={() => setHeld((current) => !current)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40"
        >
          {held ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label="Previous highlight"
          onClick={() => go(safeIndex - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next highlight"
          onClick={() => go(safeIndex + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-5 left-8 flex gap-1.5" role="tablist" aria-label="Highlight slides">
        {slides.map((item, dot) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={dot === safeIndex}
            aria-label={`Show ${item.title}`}
            onClick={() => setIndex(dot)}
            className={`h-1.5 rounded-full transition-all ${dot === safeIndex ? "w-6 bg-white" : "w-2 bg-white/50"}`}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {slide.title}. {slide.body}
      </p>
    </section>
  );
}
