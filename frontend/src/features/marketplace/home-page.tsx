"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  EyeOff,
  FileText,
  FlaskConical,
  Leaf,
  MapPin,
  Quote,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProviderCard, SearchBar, ServiceCard } from "@/components/site";
import { api } from "@/lib/api";
import { EMPTY_HOME, type MarketplaceCategory, type MarketplaceHome } from "@/features/marketplace/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Palette: Terracotta + Deep Teal (dark hero, cream body)            */
/*   teal #0F4C5C / #1B7F8C · terracotta #E36F47 (CTA) · cream #FBF6F0  */
/*   ink #12303A · muted #5A6A6F · dark band #0B3440                  */
/* Motion/3D utilities live in home-motion.css (paste into globals.css) */
/* ------------------------------------------------------------------ */

const CORAL_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E36F47] px-5 py-3 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2A98B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]";

const CAT_ICON: Record<string, LucideIcon> = {
  testing: FlaskConical,
  inspection: ScanSearch,
  certification: ShieldCheck,
  esg: Leaf,
  "experts-consulting": Users,
  consulting: Users,
  professional: Users,
};

const CATEGORY_LOOK: Record<string, { surface: string; icon: string; glow: string; bar: string }> = {
  testing: {
    surface: "from-[#F4EBDD] via-white to-white",
    icon: "bg-gradient-to-br from-[#166B78] to-[#0B3B47] text-white",
    glow: "bg-[#3E9AA6]/30",
    bar: "bg-[#166B78]",
  },
  inspection: {
    surface: "from-[#E8F4F5] via-white to-white",
    icon: "bg-gradient-to-br from-[#2A93A1] to-[#14646F] text-white",
    glow: "bg-[#4AA7B3]/30",
    bar: "bg-[#17707C]",
  },
  certification: {
    surface: "from-[#FDEEE6] via-white to-white",
    icon: "bg-gradient-to-br from-[#E36F47] to-[#D35A33] text-[#12303A]",
    glow: "bg-[#F2A98B]/40",
    bar: "bg-[#E36F47]",
  },
  "experts-consulting": {
    surface: "from-[#FBF3E0] via-white to-white",
    icon: "bg-gradient-to-br from-[#C9922B] to-[#8F6414] text-white",
    glow: "bg-[#E5C376]/30",
    bar: "bg-[#C9922B]",
  },
};
CATEGORY_LOOK.consulting = CATEGORY_LOOK["experts-consulting"];

const DEFAULT_LOOK = CATEGORY_LOOK.testing;

function keysFor(category: MarketplaceCategory) {
  return [category.slug, category.categoryType].map((k) => String(k ?? "").toLowerCase());
}

function iconFor(category: MarketplaceCategory) {
  for (const key of keysFor(category)) if (CAT_ICON[key]) return CAT_ICON[key];
  return Sparkles;
}

function lookFor(category: MarketplaceCategory) {
  for (const key of keysFor(category)) if (CATEGORY_LOOK[key]) return CATEGORY_LOOK[key];
  return DEFAULT_LOOK;
}

const REVIEWS = [
  {
    id: "scope",
    text: "One RFQ went to matched labs. We compared scope and exclusions instead of chasing email threads.",
    author: "Quality lead, manufacturing",
  },
  {
    id: "mask",
    text: "Providers quoted on location, sites and headcount. Our company name stayed hidden until we were ready.",
    author: "EHS manager, chemicals",
  },
  {
    id: "quotes",
    text: "Quotes came back from more than one provider, so the shortlist was based on fit as well as price.",
    author: "Sustainability manager",
  },
];

const STEPS = [
  {
    i: ScanSearch,
    t: "Search services",
    d: "Browse labs, inspectors, certification bodies and ESG specialists. No account needed.",
  },
  {
    i: FileText,
    t: "Create an RFQ",
    d: "Describe the service, location, number of sites, headcount and timeline.",
  },
  {
    i: EyeOff,
    t: "We match and mask",
    d: "Matched providers see location, sites and headcount — not your company name.",
  },
  {
    i: Sparkles,
    t: "Compare quotes",
    d: "Quotes come back from multiple providers so you can shortlist on price and scope.",
  },
];

const STANDARDS = ["NABL", "ISO/IEC 17025", "ISO 9001", "ISO 14001", "BIS", "IAF"];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

type RevealVariant = "up" | "left" | "right" | "scale" | "blur" | "tilt";

function Reveal({
  children,
  delay = 0,
  className,
  variant = "up",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ "--d": `${delay}ms` } as CSSProperties}
      className={cn("reveal", variant !== "up" && `reveal-${variant}`, shown && "is-visible", className)}
    >
      {children}
    </div>
  );
}

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setN(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 1200;
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-2xl", className)} />;
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#17707C]">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-2xl font-bold tracking-tight text-[#12303A] md:text-4xl">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-[#5A6A6F] md:text-base">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#0F4C5C] transition hover:text-[#082C35]"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/* 3D floater: outer layer = mouse parallax, inner layer = CSS float/tilt */
function Floater({
  children,
  depth = 30,
  delay = 0,
  duration = 7,
  className,
}: {
  children: ReactNode;
  depth?: number;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("parallax-layer pointer-events-none absolute z-20", className)}
      style={{
        transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px + var(--hp, 0) * ${depth * -2}px), 0)`,
      }}
    >
      <div
        className="float-3d"
        style={{ "--delay": `${delay}s`, "--dur": `${duration}s` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

function IconCube({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  return (
    <div
      className={cn(
        "relative flex h-14 w-14 items-center justify-center rounded-2xl text-white ring-1 ring-white/50 sm:h-16 sm:w-16",
        "shadow-[0_24px_40px_-14px_rgba(15,76,92,0.55),inset_0_-6px_12px_rgba(0,0,0,0.12)]",
        tone,
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/40 to-transparent" />
      <Icon className="relative h-7 w-7 drop-shadow-[0_3px_4px_rgba(0,0,0,0.25)] sm:h-8 sm:w-8" aria-hidden />
    </div>
  );
}

function TextChip({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <div
      className={cn(
        "relative rounded-xl px-3.5 py-2 text-xs font-extrabold tracking-wide ring-1 ring-white/60 sm:text-sm",
        "shadow-[0_20px_32px_-14px_rgba(18,48,58,0.45)]",
        tone,
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/50 to-transparent" />
      <span className="relative">{children}</span>
    </div>
  );
}

/* Illustrative RFQ -> quotes preview shown in the hero */
function RfqPreview() {
  const quotes = [
    { name: "Provider A", match: 96, tag: "Best fit" },
    { name: "Provider B", match: 88, tag: "" },
    { name: "Provider C", match: 81, tag: "" },
  ];
  return (
    <div className="relative rounded-3xl border border-[#EADFCF] bg-white/90 p-5 shadow-[0_40px_80px_-30px_rgba(15,76,92,0.45)] backdrop-blur-md sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#F2A98B]" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <span className="rounded-full bg-[#F4EBDD] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[#0F4C5C]">
          Illustrative preview
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7B80]">Your RFQ</p>
        <p className="mt-1 font-display text-lg font-bold text-[#12303A]">Water &amp; effluent testing</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5A6A6F]">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FBF6F0] px-2.5 py-1">
            <MapPin className="h-3 w-3 text-[#17707C]" aria-hidden /> Location
          </span>
          <span className="rounded-lg bg-[#FBF6F0] px-2.5 py-1">3 sites</span>
          <span className="rounded-lg bg-[#FBF6F0] px-2.5 py-1">120 staff</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FDEEE6] px-2.5 py-1 font-medium text-[#A8431F]">
            <EyeOff className="h-3 w-3" aria-hidden /> Company hidden
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {quotes.map((q, idx) => (
          <div
            key={q.name}
            className="quote-in flex items-center gap-3 rounded-2xl border border-[#EADFCF]/80 bg-white p-3"
            style={{ "--d": `${600 + idx * 350}ms` } as CSSProperties}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#166B78] to-[#17707C] text-xs font-bold text-white">
              {q.name.slice(-1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-[#12303A]">{q.name}</p>
                {q.tag ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" aria-hidden /> {q.tag}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F4EBDD]">
                <div
                  className="bar-fill h-full rounded-full bg-gradient-to-r from-[#166B78] to-[#2A93A1]"
                  style={{ width: `${q.match}%`, "--d": `${900 + idx * 350}ms` } as CSSProperties}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-[#6B7B80]">{q.match}% match</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition duration-300",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <Link href="/rfq/new" tabIndex={show ? 0 : -1} className={cn(CORAL_BTN, "shadow-2xl")}>
        Request Quote <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Scroll experience                                                   */
/* ------------------------------------------------------------------ */

function useRafScroll(handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    let raf = 0;
    const run = () => {
      raf = 0;
      ref.current();
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    ref.current();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/* Thin gradient bar showing how far down the page you are */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useRafScroll(() => {
    const el = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    const p = max > 0 ? el.scrollTop / max : 0;
    if (ref.current) ref.current.style.transform = `scaleX(${p.toFixed(4)})`;
  });
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1">
      <div ref={ref} className="h-full origin-left bg-gradient-to-r from-[#166B78] via-[#2A93A1] to-[#E36F47]" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

/* Big type band that slides sideways as you scroll past it */
const MARQUEE_WORDS = ["Testing", "Inspection", "Certification", "ESG", "Consulting"];

function ScrollMarquee() {
  const ref = useRef<HTMLDivElement>(null);
  useRafScroll(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
    el.style.setProperty("--mp", p.toFixed(4));
  });

  const row = (outlined: boolean) => {
    const words = outlined ? [...MARQUEE_WORDS].reverse() : MARQUEE_WORDS;
    return Array.from({ length: 3 }).flatMap((_, rep) =>
      words.map((word) => (
        <span key={`${rep}-${word}`} className="flex items-center gap-8 pr-8">
          <span className={outlined ? "stroke-text" : "bg-gradient-to-r from-[#F2A98B] to-[#E36F47] bg-clip-text text-transparent"}>
            {word}
          </span>
          <Sparkles className="h-6 w-6 text-[#E36F47] md:h-8 md:w-8" aria-hidden />
        </span>
      )),
    );
  };

  return (
    <div ref={ref} aria-hidden className="overflow-hidden bg-[#0B3440] py-8 md:py-12">
      <div className="marquee-row marquee-a font-display text-5xl font-extrabold tracking-tight md:text-7xl">{row(false)}</div>
      <div className="marquee-row marquee-b mt-2 font-display text-5xl font-extrabold tracking-tight md:text-7xl">{row(true)}</div>
    </div>
  );
}

/* Pinned "How it works": the section sticks while the steps advance with scroll */
const STEP_TONES = [
  "from-[#1B7F8C] to-[#0B3B47]",
  "from-[#2A93A1] to-[#14646F]",
  "from-[#D9A93F] to-[#8F6414]",
  "from-[#E36F47] to-[#D35A33]",
];

function ScrollStory({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useRafScroll(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
    el.style.setProperty("--sp", p.toFixed(4));
    const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
    setActive((prev) => (prev === idx ? prev : idx));
  });

  return (
    <div
      ref={ref}
      className={cn("relative", reduced ? "hidden" : "hidden lg:block")}
      style={{ height: `${STEPS.length * 90 + 30}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden bg-gradient-to-br from-[#FBF6F0] via-white to-[#FDEEE6]/60">
        <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#7CC0C8]/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-[#F2A98B]/25 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl grid-cols-[0.95fr_1.05fr] items-center gap-16 px-6 pt-10">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#17707C]">How it works</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-[#12303A]">How sourcing works</h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-[#5A6A6F]">
              Search, send one RFQ, and compare quotes. Providers never see who you are until you engage.
            </p>

            <ol className="relative mt-10 space-y-3">
              <span aria-hidden className="absolute bottom-6 left-[31px] top-6 w-0.5 bg-[#EADFCF]" />
              <span
                aria-hidden
                className="absolute bottom-6 left-[31px] top-6 w-0.5 origin-top bg-gradient-to-b from-[#166B78] to-[#E36F47]"
                style={{ transform: "scaleY(var(--sp, 0))" }}
              />
              {STEPS.map(({ i: Icon, t, d }, index) => (
                <li
                  key={t}
                  className={cn(
                    "relative flex gap-4 rounded-2xl p-3 transition duration-500",
                    active === index ? "scale-[1.02] bg-white shadow-[0_20px_40px_-24px_rgba(15,76,92,0.5)]" : "opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white transition duration-500",
                      active >= index ? "bg-gradient-to-br from-[#166B78] to-[#17707C] shadow-md" : "bg-[#D9C8B0]",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-[#12303A]">
                      {t}
                      <Icon className="h-4 w-4 text-[#E36F47]" aria-hidden />
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#5A6A6F]">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Stage: a cube that turns as you scroll, step text crossfades */}
          <div aria-hidden className="relative h-[28rem] [perspective:1200px]">
            <div className="absolute inset-0 rounded-[2rem] border border-[#EADFCF] bg-white/80 shadow-[0_50px_100px_-40px_rgba(15,76,92,0.5)] backdrop-blur" />
            <span className="absolute right-8 top-2 font-display text-[9rem] font-extrabold leading-none text-[#F4EBDD]">
              {String(active + 1).padStart(2, "0")}
            </span>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
              <div
                className="relative h-36 w-36 [transform-style:preserve-3d]"
                style={{ transform: "rotateX(12deg) rotateY(calc(var(--sp, 0) * 540deg - 30deg))" }}
              >
                {STEPS.map(({ i: Icon, t }, index) => (
                  <div
                    key={t}
                    className={cn(
                      "absolute inset-0 flex items-center justify-center rounded-[2rem] bg-gradient-to-br text-white ring-1 ring-white/50 transition duration-500",
                      "shadow-[0_40px_60px_-20px_rgba(15,76,92,0.55),inset_0_-10px_20px_rgba(0,0,0,0.12)]",
                      STEP_TONES[index],
                      active === index ? "scale-100 opacity-100" : "scale-75 opacity-0",
                    )}
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/40 to-transparent" />
                    <Icon className="relative h-16 w-16 drop-shadow-[0_4px_6px_rgba(0,0,0,0.25)]" />
                  </div>
                ))}
              </div>

              <div className="relative mt-12 h-24 w-full max-w-sm">
                {STEPS.map(({ t, d }, index) => (
                  <div
                    key={t}
                    className={cn(
                      "absolute inset-0 transition duration-500",
                      active === index ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
                    )}
                  >
                    <p className="font-display text-xl font-bold text-[#12303A]">{t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#5A6A6F]">{d}</p>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                {STEPS.map(({ t }, index) => (
                  <span
                    key={t}
                    className={cn("h-1.5 rounded-full transition-all duration-500", active === index ? "w-8 bg-[#E36F47]" : "w-1.5 bg-[#D9C8B0]")}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [home, setHome] = useState<MarketplaceHome>(EMPTY_HOME);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MarketplaceHome>("/marketplace/home")
      .then((data) => {
        if (!cancelled) setHome(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Catalog is unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const verified = home.counts.verifiedProviders;
  const popularLinks = home.popular.slice(0, 5);
  const featuredProviders = home.providers.filter((provider) => provider.verified).slice(0, 6);

  const reduced = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  useRafScroll(() => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.min(Math.max(-r.top / Math.max(r.height, 1), 0), 1);
    el.style.setProperty("--hp", p.toFixed(4));
  });

  const onHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty("--my", ((e.clientY - rect.top) / rect.height - 0.5).toFixed(3));
  };
  const onHeroLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--mx", "0");
    e.currentTarget.style.setProperty("--my", "0");
  };

  return (
    <>
      <ScrollProgress />

      {/* HERO */}
      <section
        ref={heroRef}
        onMouseMove={onHeroMove}
        onMouseLeave={onHeroLeave}
        className="relative overflow-hidden border-b border-white/10 bg-[#0B3440]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.55),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.30),_transparent_45%),linear-gradient(180deg,#0B3440_0%,#072630_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <div className="hero-copy text-center lg:text-left">
            <p className="auth-rise inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-white/70 shadow-sm backdrop-blur sm:text-sm lg:justify-start">
              <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                <BadgeCheck className="h-4 w-4 text-emerald-400" aria-hidden />
                {verified} verified {verified === 1 ? "provider" : "providers"}
              </span>
              <span className="text-white/30">·</span>
              <span>
                {home.counts.services} {home.counts.services === 1 ? "service" : "services"}
              </span>
              <span className="text-white/30">·</span>
              <span>No sign-up to browse</span>
            </p>

            <h1 className="auth-rise mt-6 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl md:leading-[1.05]">
              Find the right testing, certification or{" "}
              <span className="bg-gradient-to-r from-[#FFD7B8] via-[#F2A98B] to-[#E36F47] bg-clip-text text-transparent">
                ESG partner.
              </span>
            </h1>
            <p className="auth-rise mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75 md:text-lg lg:mx-0">
              Search accredited labs, inspectors, certification bodies and sustainability experts. Send one RFQ,
              receive comparable quotes, decide with the match in front of you.
            </p>

            <div className="auth-rise mt-8 max-w-2xl lg:max-w-xl">
              <SearchBar large />
            </div>

            {popularLinks.length > 0 ? (
              <div className="auth-rise mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                <span className="self-center text-xs font-medium text-white/55">Popular:</span>
                {popularLinks.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/85 transition hover:-translate-y-0.5 hover:border-[#F2A98B] hover:text-white"
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {error}
              </p>
            ) : null}
          </div>

          {/* Right: RFQ preview with 3D floaters */}
          <div className="hero-visual relative mx-auto w-full max-w-md [perspective:1100px] lg:max-w-none">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-[#1B7F8C]/40 via-[#7CC0C8]/20 to-[#E36F47]/35 blur-3xl"
            />
            <RfqPreview />

            <Floater depth={46} duration={7} className="-left-3 -top-6 sm:-left-8">
              <IconCube icon={FlaskConical} tone="bg-gradient-to-br from-[#1B7F8C] to-[#0B3B47]" />
            </Floater>
            <Floater depth={-38} delay={1.2} duration={8} className="-right-2 -top-8 sm:-right-8">
              <IconCube icon={ShieldCheck} tone="bg-gradient-to-br from-[#E36F47] to-[#D35A33] !text-[#12303A]" />
            </Floater>
            <Floater depth={30} delay={0.6} duration={9} className="-left-4 bottom-16 hidden sm:block sm:-left-12">
              <IconCube icon={Leaf} tone="bg-gradient-to-br from-[#D9A93F] to-[#8F6414]" />
            </Floater>
            <Floater depth={-52} delay={2} duration={7.5} className="-bottom-5 -right-2 sm:-right-10">
              <TextChip tone="bg-gradient-to-br from-[#D3EAEC] to-white text-[#0F4C5C]">ISO 17025</TextChip>
            </Floater>
            <Floater depth={24} delay={1.6} duration={8.5} className="-bottom-6 left-10 hidden sm:block">
              <TextChip tone="bg-gradient-to-br from-[#FBDCCB] to-white text-[#A8431F]">NABL</TextChip>
            </Floater>
            <Floater depth={-26} delay={0.3} duration={10} className="right-6 top-1/2 hidden xl:block">
              <TextChip tone="bg-gradient-to-br from-emerald-100 to-white text-emerald-800">ESG</TextChip>
            </Floater>
          </div>
        </div>
      </section>

      {/* TRUST STRIP + STATS */}
      <section aria-label="Platform at a glance" className="border-b border-[#EADFCF] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { label: "Verified providers", value: verified, suffix: "" },
              { label: "Services listed", value: home.counts.services, suffix: "" },
              { label: "Service categories", value: home.categories.length, suffix: "" },
              { label: "Providers per RFQ", value: 5, suffix: "" },
            ].map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <dd className="font-display text-3xl font-extrabold tracking-tight text-[#0F4C5C] md:text-4xl">
                  {loading ? <span className="skeleton inline-block h-8 w-14 rounded-lg align-middle" /> : <Counter value={stat.value} suffix={stat.suffix} />}
                </dd>
                <dt className="mt-1 text-xs font-medium text-[#6B7B80] md:text-sm">{stat.label}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-[#F4EBDD] pt-6 md:justify-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7B80]">Built around standards like</span>
            {STANDARDS.map((standard) => (
              <span
                key={standard}
                className="rounded-full border border-[#EADFCF] bg-[#FBF6F0] px-3 py-1 text-xs font-semibold text-[#0B3B47]"
              >
                {standard}
              </span>
            ))}
          </div>
        </div>
      </section>

      <ScrollMarquee />

      {/* CATEGORIES + POPULAR */}
      <section className="relative overflow-hidden bg-[#FBF6F0]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(27,127,140,0.08),_transparent_45%),radial-gradient(ellipse_at_bottom_left,_rgba(227,111,71,0.08),_transparent_40%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <Reveal variant="blur">
            <SectionHeading
              eyebrow="Categories"
              title="Browse by category"
              description="Start with the kind of work you need, then narrow into the exact service."
              action={{ href: "/services", label: "All services" }}
            />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-60" />)
              : home.categories.map((category, index) => {
                  const Icon = iconFor(category);
                  const look = lookFor(category);
                  return (
                    <Reveal key={category.id} delay={index * 80} variant="tilt">
                      <Link
                        href={`/services?category=${category.slug}`}
                        className={cn(
                          "tilt-card group relative flex min-h-[15.5rem] flex-col overflow-hidden rounded-2xl border border-[#EADFCF] bg-gradient-to-b p-5 shadow-[0_12px_32px_-20px_rgba(18,48,58,0.45)]",
                          look.surface,
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]",
                        )}
                      >
                        <span aria-hidden className={cn("pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl", look.glow)} />
                        <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", look.bar)} />
                        <span className={cn("relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition duration-300 group-hover:-translate-y-1 group-hover:rotate-6", look.icon)}>
                          <Icon className="h-6 w-6" aria-hidden />
                        </span>
                        <h3 className="relative mt-5 font-display text-xl font-bold tracking-tight text-[#12303A]">{category.name}</h3>
                        <p className="relative mt-2 flex-1 text-sm leading-relaxed text-[#5A6A6F]">{category.tagline}</p>
                        <div className="relative mt-5 flex items-center justify-between gap-2 border-t border-[#EADFCF]/70 pt-3">
                          <span className="rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#082C35] shadow-sm">
                            {category.serviceCount} {category.serviceCount === 1 ? "service" : "services"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#14646F] opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                            Browse
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
          </div>

          <div className="mt-20 md:mt-24">
            <Reveal variant="blur">
              <SectionHeading
                eyebrow="Popular"
                title="Popular services"
                description="Frequently requested scopes buyers send to matched providers."
              />
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)
                : home.popular.map((service, index) => (
                    <Reveal key={service.slug} delay={index * 70} variant="scale">
                      <ServiceCard s={service} />
                    </Reveal>
                  ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS: pinned scroll story (lg+), grid fallback */}
      <section className="mt-20 md:mt-28">
        <ScrollStory reduced={reduced} />
        <div className={cn("mx-auto max-w-7xl px-4 sm:px-6", reduced ? "" : "lg:hidden")}>
          <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EADFCF] bg-gradient-to-br from-[#FBF6F0] via-white to-[#FDEEE6]/60 p-6 sm:p-8 md:p-12">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#7CC0C8]/20 blur-3xl" />
            <SectionHeading
              eyebrow="How it works"
              title="How sourcing works"
              description="Search, send one RFQ, and compare quotes. Providers never see who you are until you engage."
            />
            <ol className="relative mt-10 grid gap-4 md:grid-cols-4">
              {STEPS.map(({ i: Icon, t, d }, index) => (
                <li
                  key={t}
                  className="tilt-card relative rounded-2xl border border-white bg-white/85 p-5 shadow-[0_14px_34px_-24px_rgba(18,48,58,0.45)] backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#166B78] to-[#17707C] text-sm font-bold text-white shadow-md">
                      {index + 1}
                    </span>
                    <Icon className="h-5 w-5 text-[#E36F47]" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold text-[#12303A]">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5A6A6F]">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
        </div>
      </section>

      {/* FEATURED PROVIDERS */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 md:mt-28">
        <Reveal variant="blur">
          <SectionHeading
            eyebrow="Providers"
            title="Featured verified providers"
            description="Public profiles that opted in and passed platform verification."
            action={{ href: "/providers", label: "All providers" }}
          />
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52" />)
            : featuredProviders.map((provider, index) => (
                <Reveal key={provider.id} delay={index * 80}>
                  <ProviderCard p={provider} />
                </Reveal>
              ))}
        </div>
        {!loading && featuredProviders.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[#D9C8B0] bg-[#FBF6F0] px-4 py-8 text-center text-sm text-[#6B7B80]">
            Verified providers will appear here as profiles are approved.
          </p>
        ) : null}
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 md:mt-28">
        <Reveal variant="blur">
          <SectionHeading
            eyebrow="Buyers say"
            title="Trusted by quality, EHS and sustainability teams"
            description="What buyers notice once RFQs replace scattered email threads."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {REVIEWS.map((review, index) => (
            <Reveal key={review.id} delay={index * 90} variant={index === 0 ? "left" : index === 2 ? "right" : "up"}>
              <figure className="tilt-card relative h-full overflow-hidden rounded-2xl border border-[#EADFCF] bg-white p-6">
                <Quote className="h-6 w-6 text-[#F2A98B]" aria-hidden />
                <blockquote className="mt-4 text-sm leading-relaxed text-[#3E5258]">&ldquo;{review.text}&rdquo;</blockquote>
                <figcaption className="mt-5 border-t border-[#F4EBDD] pt-4 text-xs font-semibold text-[#0B3B47]">
                  {review.author}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        {home.industries.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {home.industries.map((industry) => (
              <span
                key={industry}
                className="rounded-full border border-[#EADFCF] bg-[#FBF6F0] px-3 py-1 text-xs font-medium text-[#0B3B47]"
              >
                {industry}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* DUAL CTA */}
      <section className="mx-auto mt-20 max-w-7xl px-4 pb-28 sm:px-6 md:mt-28 md:pb-32">
        <Reveal variant="scale">
          <div className="relative grid overflow-hidden rounded-[1.75rem] bg-[#0B3440] text-slate-50 md:grid-cols-2">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.45),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.28),_transparent_50%)]"
            />
            <div className="relative p-8 md:p-12">
              <h2 className="font-display text-3xl font-bold tracking-tight">Need a quote this week?</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
                Post one RFQ and hear back from up to 5 matched providers — usually within 48 hours.
              </p>
              <Link href="/rfq/new" className={cn(CORAL_BTN, "mt-7")}>
                Request Quote <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="relative border-t border-white/10 p-8 md:border-l md:border-t-0 md:p-12">
              <h2 className="font-display text-3xl font-bold tracking-tight">Are you a lab, auditor or consultant?</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
                List your accreditations and receive qualified RFQs from buyers across India.
              </p>
              <Button asChild variant="secondary" size="lg" className="mt-7">
                <Link href="/join">Join as Provider</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      <StickyCta />
    </>
  );
}