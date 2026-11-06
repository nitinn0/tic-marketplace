"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  Clock3,
  EyeOff,
  Inbox,
  MapPin,
  MessageSquare,
  Users,
} from "lucide-react";

import { Container } from "@/components/common/container";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";
import { formatMoney, type ProviderRfq } from "@/features/marketplace/types";
import { cn } from "@/lib/utils";

/* Palette: Terracotta + Deep Teal
   dark #0B3440 · cream #FBF6F0 · terracotta #E36F47 · peach #F2A98B · ink #12303A · sand #EADFCF */

type Filter = "ALL" | "OPEN" | "QUOTED" | "AWARDED" | "CLOSED";

const CORAL_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2A98B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C] disabled:pointer-events-none disabled:opacity-50";

const GHOST_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#EADFCF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F4C5C] transition hover:border-[#7CC0C8] hover:bg-[#E8F4F5]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C] disabled:pointer-events-none disabled:opacity-50";

const FIELD =
  "border-[#EADFCF] bg-[#FBF6F0] text-[#12303A] placeholder:text-[#8A969A] focus:border-[#7CC0C8] focus:bg-white";

function rfqFilter(rfq: ProviderRfq): Exclude<Filter, "ALL"> {
  if (rfq.quote?.status === "ACCEPTED") return "AWARDED";
  if (rfq.quote?.status === "SUBMITTED") return "QUOTED";
  if (rfq.status === "OPEN") return "OPEN";
  return "CLOSED";
}

function ProviderRfqsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRfqId = searchParams.get("rfq");
  const [rfqs, setRfqs] = useState<ProviderRfq[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(requestedRfqId);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [amount, setAmount] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [timelineDays, setTimelineDays] = useState("");
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    return api
      .get<{ rfqs: ProviderRfq[] }>("/provider/rfqs")
      .then((data) => setRfqs(data.rfqs))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load RFQs"))
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!requestedRfqId) return;
    setActiveId(requestedRfqId);
    setFilter("ALL");
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`rfq-${requestedRfqId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedRfqId, rfqs.length]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!activeId) return;
    setPending(true);
    setError(null);
    try {
      await api.post(`/provider/rfqs/${activeId}/quotes`, {
        amount: Number(amount),
        scopeNotes,
        exclusions: exclusions.trim() || undefined,
        timelineDays: timelineDays ? Number(timelineDays) : undefined,
      });
      setActiveId(null);
      setAmount("");
      setScopeNotes("");
      setExclusions("");
      setTimelineDays("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the quote");
    } finally {
      setPending(false);
    }
  }

  async function withdraw(rfqId: string) {
    setBusyId(rfqId);
    setError(null);
    try {
      await api.post(`/provider/rfqs/${rfqId}/quotes/withdraw`, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not withdraw quote");
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const next = { ALL: rfqs.length, OPEN: 0, QUOTED: 0, AWARDED: 0, CLOSED: 0 };
    for (const rfq of rfqs) next[rfqFilter(rfq)] += 1;
    return next;
  }, [rfqs]);

  const visible = filter === "ALL" ? rfqs : rfqs.filter((rfq) => rfqFilter(rfq) === filter);
  const filters: { id: Filter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "OPEN", label: "Open" },
    { id: "QUOTED", label: "Quoted" },
    { id: "AWARDED", label: "Awarded" },
    { id: "CLOSED", label: "Closed" },
  ];

  return (
    <div className="bg-[#FBF6F0]">
      <section className="relative overflow-hidden bg-[#0B3440] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.5),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.26),_transparent_45%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        />
        <Container className="relative py-10 md:py-12">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/60">
            <Link href={routes.providerDashboard} className="transition hover:text-white">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-white/90">Incoming RFQs</span>
          </nav>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Provider workspace</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Incoming RFQs</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
            Buyer company name, email and personal details stay hidden. You can see location, sites and employee count.
          </p>
          {loaded && !error ? (
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/85">
                <ClipboardList className="h-3.5 w-3.5 text-[#F2A98B]" aria-hidden />
                {counts.ALL} {counts.ALL === 1 ? "request" : "requests"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/85">
                <EyeOff className="h-3.5 w-3.5 text-[#7CC0C8]" aria-hidden />
                Buyer identity masked
              </span>
            </div>
          ) : null}
        </Container>
      </section>

      <Container className="py-8 md:py-10">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loaded ? <div className="skeleton h-56 rounded-3xl" /> : null}

        {loaded && (rfqs.length > 0 || !error) ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Waiting" value={String(counts.OPEN)} hint="Open requests without a live quote" />
              <Stat label="Quoted" value={String(counts.QUOTED)} hint="Quotes the buyer can still compare" />
              <Stat label="Awarded" value={String(counts.AWARDED)} hint="Jobs you can message about" />
            </div>

            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter RFQs">
              {filters.map((item) => {
                const selected = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                      selected
                        ? "border-[#E36F47] bg-[#E36F47] text-[#0B2530]"
                        : "border-[#EADFCF] bg-white text-[#3E5258] hover:border-[#7CC0C8]",
                    )}
                  >
                    {item.label} ({counts[item.id]})
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-[#D9C8B0] bg-white/70 px-6 py-14 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4EBDD] text-[#0F4C5C]">
                  <Inbox className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-5 font-display text-xl font-bold text-[#12303A]">
                  {rfqs.length === 0 ? "No RFQs yet" : "Nothing in this filter"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#5A6A6F]">
                  {rfqs.length === 0
                    ? "No RFQs have been routed to this provider yet. Switch to the provider organization that offers the service."
                    : "Try another status to see the rest of your incoming requests."}
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-4">
                {visible.map((rfq) => {
                  const open = rfq.status === "OPEN";
                  const quoted = rfq.quote?.status === "SUBMITTED";
                  const awarded = rfq.quote?.status === "ACCEPTED";
                  const rejected = rfq.quote?.status === "REJECTED";
                  const withdrawn = rfq.quote?.status === "WITHDRAWN";
                  const highlighted = requestedRfqId === rfq.id;

                  return (
                    <li
                      id={`rfq-${rfq.id}`}
                      key={rfq.id}
                      className={cn(
                        "scroll-mt-24 rounded-3xl border bg-white p-5 shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)] sm:p-6",
                        highlighted ? "border-[#E36F47] ring-2 ring-[#E36F47]/25" : "border-[#EADFCF]",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E36F47]">{rfq.service.name}</p>
                          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#12303A]">{rfq.title}</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={open ? "info" : "neutral"}>{open ? "Open" : "Closed"}</Badge>
                          {awarded ? <Badge tone="success">Awarded</Badge> : null}
                          {quoted ? <Badge tone="warning">Quoted</Badge> : null}
                          {rejected ? <Badge tone="neutral">Not selected</Badge> : null}
                          {withdrawn ? <Badge tone="neutral">Withdrawn</Badge> : null}
                          <Badge tone="neutral">
                            <EyeOff className="h-3 w-3" aria-hidden />
                            Buyer hidden
                          </Badge>
                        </div>
                      </div>

                      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                        <Fact icon={MapPin} label="Location" value={rfq.location} />
                        <Fact icon={Building2} label="Sites" value={String(rfq.siteCount)} />
                        <Fact icon={Users} label="Employees" value={String(rfq.employeeCount)} />
                      </dl>

                      <p className="mt-5 text-sm leading-6 text-[#3E5258]">{rfq.description}</p>
                      {rfq.timeline ? (
                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6A6F]">
                          <Clock3 className="h-3.5 w-3.5 text-[#0F4C5C]" aria-hidden />
                          Timeline: {rfq.timeline}
                        </p>
                      ) : null}
                      {rfq.matchReasons.length > 0 ? (
                        <p className="mt-2 text-xs text-[#5A6A6F]">{rfq.matchReasons.join(" · ")}</p>
                      ) : null}

                      {rfq.quote ? (
                        <div className="mt-4 rounded-2xl border border-[#E8F4F5] bg-[#E8F4F5]/60 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0F4C5C]">Your quote</p>
                          <p className="mt-1 font-display text-lg font-bold text-[#12303A]">
                            {formatMoney(rfq.quote.amount, rfq.quote.currency)}
                          </p>
                          {rfq.quote.scopeNotes ? (
                            <p className="mt-1 text-sm leading-6 text-[#3E5258]">{rfq.quote.scopeNotes}</p>
                          ) : null}
                        </div>
                      ) : null}

                      {awarded ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-[#B7D8C4] bg-emerald-50/70 p-4">
                          <p className="text-sm font-semibold text-[#12303A]">You won this RFQ</p>
                          <p className="mt-1 text-sm text-[#5A6A6F]">
                            Message the buyer to coordinate next steps. Phone numbers and emails are blocked in chat.
                          </p>
                          <button
                            type="button"
                            className={cn(GHOST_BTN, "mt-3")}
                            disabled={busyId === `chat-${rfq.id}`}
                            onClick={() => {
                              if (rfq.conversationId) {
                                router.push(routes.message(rfq.conversationId));
                                return;
                              }
                              setBusyId(`chat-${rfq.id}`);
                              void api
                                .get<{ id: string }>(`/provider/rfqs/${rfq.id}/conversation`)
                                .then((data) => {
                                  router.push(routes.message(data.id));
                                })
                                .catch((err: unknown) => {
                                  setError(err instanceof Error ? err.message : "Could not open chat");
                                  setBusyId(null);
                                });
                            }}
                          >
                            <MessageSquare className="h-4 w-4" aria-hidden />
                            {busyId === `chat-${rfq.id}` ? "Opening…" : "Open messages"}
                          </button>
                        </div>
                      ) : null}

                      {open && !awarded && !rejected ? (
                        activeId === rfq.id ? (
                          <form onSubmit={onSubmit} className="mt-5 space-y-3 border-t border-[#EADFCF] pt-5">
                            <Field label="Amount (INR)" htmlFor={`amount-${rfq.id}`}>
                              <Input
                                id={`amount-${rfq.id}`}
                                required
                                type="number"
                                min={1}
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                className={FIELD}
                              />
                            </Field>
                            <Field label="Scope" htmlFor={`scope-${rfq.id}`}>
                              <Textarea
                                id={`scope-${rfq.id}`}
                                required
                                minLength={5}
                                value={scopeNotes}
                                onChange={(event) => setScopeNotes(event.target.value)}
                                className={FIELD}
                              />
                            </Field>
                            <Field label="Exclusions" htmlFor={`exclusions-${rfq.id}`}>
                              <Textarea
                                id={`exclusions-${rfq.id}`}
                                value={exclusions}
                                onChange={(event) => setExclusions(event.target.value)}
                                className={FIELD}
                              />
                            </Field>
                            <Field label="Timeline (days)" htmlFor={`days-${rfq.id}`}>
                              <Input
                                id={`days-${rfq.id}`}
                                type="number"
                                min={1}
                                value={timelineDays}
                                onChange={(event) => setTimelineDays(event.target.value)}
                                className={FIELD}
                              />
                            </Field>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button type="submit" className={CORAL_BTN} disabled={pending}>
                                {pending ? "Sending…" : "Send quote"}
                              </button>
                              <button type="button" className={GHOST_BTN} onClick={() => setActiveId(null)}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="mt-5 flex flex-wrap gap-2">
                            <button type="button" className={CORAL_BTN} onClick={() => setActiveId(rfq.id)}>
                              {rfq.quote && !withdrawn ? "Update quote" : "Quote this RFQ"}
                            </button>
                            {quoted ? (
                              <button
                                type="button"
                                className={GHOST_BTN}
                                disabled={busyId === rfq.id}
                                onClick={() => void withdraw(rfq.id)}
                              >
                                {busyId === rfq.id ? "Withdrawing…" : "Withdraw quote"}
                              </button>
                            ) : null}
                          </div>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </Container>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[#EADFCF] bg-white p-4 shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E36F47]">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-[#12303A]">{value}</p>
      <p className="mt-1 text-xs text-[#5A6A6F]">{hint}</p>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#EADFCF] bg-[#FBF6F0]/70 px-3 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E8F4F5] text-[#0F4C5C]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span>
        <span className="block text-xs text-[#5A6A6F]">{label}</span>
        <span className="block text-sm font-medium text-[#12303A]">{value}</span>
      </span>
    </div>
  );
}

export default function ProviderRfqsPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#FBF6F0]">
          <div className="bg-[#0B3440] py-16" />
          <Container className="py-10">
            <div className="skeleton h-56 rounded-3xl" />
          </Container>
        </div>
      }
    >
      <ProviderRfqsContent />
    </Suspense>
  );
}
