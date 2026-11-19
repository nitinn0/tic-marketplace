"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, BadgeCheck, MapPin, MessageSquare } from "lucide-react";

import type { MarketplaceProfessional } from "@/features/marketplace/types";
import { openHireConversation } from "@/features/messaging/services/chat.service";
import { professionalTypeLabels } from "@/features/professionals/utils/labels";
import type { ProfessionalType } from "@/features/professionals/types";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";

export default function ProfessionalDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [professional, setProfessional] = useState<MarketplaceProfessional | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get<MarketplaceProfessional>(`/marketplace/professionals/${encodeURIComponent(id)}`)
      .then((data) => {
        if (!cancelled) setProfessional(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load professional");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const typeLabel = professional
    ? professionalTypeLabels[professional.professionalType as ProfessionalType] ?? professional.professionalType
    : "";

  return (
    <section className="bg-[#FBF6F0]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
        <Link
          href={routes.professionals}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F4C5C] transition hover:text-[#0B3B47]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to individuals list
        </Link>

        {!loaded ? <div className="skeleton mt-8 h-64 rounded-3xl" /> : null}

        {error ? (
          <div
            role="alert"
            className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Professional not found</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        ) : null}

        {professional ? (
          <article className="mt-8 rounded-3xl border border-[#EADFCF] bg-white p-6 shadow-[0_20px_50px_-36px_rgba(18,48,58,0.45)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36F47]">Independent professional</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#12303A]">{professional.name}</h1>
                <p className="mt-2 text-sm font-medium text-[#0F4C5C]">{typeLabel}</p>
              </div>
              {professional.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Verified
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                  Verification pending
                </span>
              )}
            </div>

            {professional.headline ? (
              <p className="mt-5 text-base leading-relaxed text-[#5A6A6F]">{professional.headline}</p>
            ) : null}

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {professional.baseCity ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7B80]">Base city</dt>
                  <dd className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#12303A]">
                    <MapPin className="h-3.5 w-3.5 text-[#E36F47]" aria-hidden />
                    {professional.baseCity}
                  </dd>
                </div>
              ) : null}
              {professional.yearsExperience != null ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7B80]">Experience</dt>
                  <dd className="mt-1 text-sm text-[#12303A]">{professional.yearsExperience} years</dd>
                </div>
              ) : null}
              {professional.primaryAccreditation ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7B80]">Primary accreditation</dt>
                  <dd className="mt-1 text-sm text-[#12303A]">{professional.primaryAccreditation}</dd>
                </div>
              ) : null}
            </dl>

            {professional.bio ? (
              <div className="mt-8 border-t border-[#EADFCF] pt-6">
                <h2 className="font-display text-lg font-semibold text-[#12303A]">About</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#5A6A6F]">{professional.bio}</p>
              </div>
            ) : null}

            <div className="mt-8 rounded-2xl border border-[#E8F4F5] bg-[#E8F4F5]/50 px-4 py-4">
              <p className="text-sm text-[#0F4C5C]">
                Message {professional.name.split(" ")[0]} to discuss the engagement. Phone numbers and emails stay blocked
                in chat.
              </p>
              {chatError ? <p className="mt-2 text-sm text-red-700">{chatError}</p> : null}
              <button
                type="button"
                disabled={openingChat}
                onClick={() => {
                  setOpeningChat(true);
                  setChatError(null);
                  void openHireConversation(professional.id)
                    .then((data) => router.push(routes.message(data.id)))
                    .catch((err: unknown) => {
                      setChatError(err instanceof Error ? err.message : "Could not open chat");
                      setOpeningChat(false);
                    });
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition hover:-translate-y-0.5 hover:bg-[#F2A98B] disabled:pointer-events-none disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
                {openingChat ? "Opening chat…" : "Message to hire"}
              </button>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
