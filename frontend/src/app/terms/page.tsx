"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { api } from "@/lib/api";
import { clearSession, getStoredSession, isAuthenticated, saveSession } from "@/lib/auth";
import { requestedNext } from "@/lib/home-route";
import { routes } from "@/lib/constants";

const TERMS_SECTIONS = [
  {
    title: "1. About TIC Marketplace",
    body: "TIC Marketplace connects buyers with testing, inspection, certification and professional-service providers. By creating an account you agree to use the platform for legitimate commercial purposes related to those services.",
  },
  {
    title: "2. Accounts and accuracy",
    body: "You must provide accurate registration details and keep them up to date. You are responsible for activity under your account and for safeguarding your login credentials. Notify us promptly if you suspect unauthorized access.",
  },
  {
    title: "3. Provider and professional listings",
    body: "Organizations and independent professionals are responsible for the accuracy of their profiles, services, accreditations and supporting documents. Listings may be reviewed, verified, suspended or removed if they are misleading, incomplete or non-compliant.",
  },
  {
    title: "4. RFQs, quotes and off-platform contact",
    body: "Buyers may request quotes and providers may respond through the platform. Do not use marketplace messaging to exchange personal contact details in order to circumvent the platform where that is restricted. Commercial agreements formed through RFQs remain between the parties involved.",
  },
  {
    title: "5. Acceptable use",
    body: "You may not misuse the marketplace, scrape data, upload malware, post unlawful content, impersonate others, or attempt to access systems or data you are not authorized to use. We may suspend accounts that violate these rules.",
  },
  {
    title: "6. Content and documents",
    body: "Documents and materials you upload must be yours to share or licensed for that purpose. Buyers may access supporting documents only after signing in, and only for evaluating services and quotes.",
  },
  {
    title: "7. Privacy",
    body: "We process account and usage data to operate the marketplace, improve matching and meet security obligations. Do not submit sensitive personal data that is not required for providing or requesting TIC services.",
  },
  {
    title: "8. Availability and changes",
    body: "We aim for reliable service but do not guarantee uninterrupted availability. Features may change over time. Material updates to these Terms may be communicated in-product; continued use after notice constitutes acceptance of the updated Terms where permitted by law.",
  },
  {
    title: "9. Limitation of liability",
    body: "To the fullest extent permitted by law, TIC Marketplace is provided on an as-is basis and is not liable for indirect or consequential losses arising from marketplace use, provider performance, or third-party agreements. Nothing in these Terms excludes liability that cannot be excluded by law.",
  },
  {
    title: "10. Contact",
    body: "Questions about these Terms can be sent to info@ticmarketplace.com.",
  },
] as const;

type AcceptResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    termsAcceptedAt: string | null;
  };
};

export default function TermsPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  const nextPath = useMemo(() => requestedNext() ?? routes.dashboard, []);

  useEffect(() => {
    const session = getStoredSession();
    setSignedIn(Boolean(session));
    setAlreadyAccepted(Boolean(session?.user && "termsAcceptedAt" in session.user && (session.user as { termsAcceptedAt?: string | null }).termsAcceptedAt));
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    let cancelled = false;
    api
      .get<{ user?: { termsAcceptedAt?: string | null } }>("/auth/me")
      .then((me) => {
        if (cancelled) return;
        const accepted = Boolean(me.user?.termsAcceptedAt);
        setAlreadyAccepted(accepted);
        if (accepted) {
          router.replace(nextPath);
          router.refresh();
        }
      })
      .catch(() => {
        /* stay on page; accept will re-auth if needed */
      });
    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  const onAccept = async () => {
    if (!checked) return;
    setLoading(true);
    setError(null);
    try {
      if (!isAuthenticated()) {
        router.push(`${routes.login}?next=${encodeURIComponent(`${routes.terms}?next=${encodeURIComponent(nextPath)}`)}`);
        return;
      }
      const result = await api.post<AcceptResponse>("/auth/terms/accept", {});
      const session = getStoredSession();
      if (session) {
        saveSession({
          ...session,
          user: {
            ...session.user,
            ...result.user,
          },
        });
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && /401|Unauthorized|session/i.test(err.message)) {
        clearSession();
        setSignedIn(false);
        setError("Your session expired. Sign in again to accept the Terms.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to record acceptance.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Legal"
      title="Terms & Conditions"
      description="Please review and accept these Terms once when you create your account. You will not be asked again after acceptance."
      highlights={[
        "Shown once after first signup",
        "Applies to buyers, providers and independents",
        "You can revisit this page anytime from the footer",
      ]}
    >
      <div className="auth-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Agreement</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">Terms & Conditions</h2>
        <p className="mt-2 text-sm text-slate-600">
          Last updated {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}.
        </p>

        <div className="mt-6 max-h-[22rem] space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="font-semibold text-slate-900">{section.title}</h3>
              <p className="mt-1.5 text-slate-600">{section.body}</p>
            </section>
          ))}
        </div>

        {alreadyAccepted ? (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>You have already accepted these Terms. Redirecting…</p>
          </div>
        ) : (
          <>
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
              />
              <span>
                I have read and agree to the TIC Marketplace Terms & Conditions.
                {!signedIn ? (
                  <>
                    {" "}
                    <Link href={`${routes.login}?next=${encodeURIComponent(`${routes.terms}?next=${encodeURIComponent(nextPath)}`)}`} className="font-semibold text-[#0F4C5C] hover:underline">
                      Sign in
                    </Link>{" "}
                    if you already have an account.
                  </>
                ) : null}
              </span>
            </label>

            {error ? (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button
              type="button"
              className="mt-4 h-11 w-full bg-[#0F4C5C] text-sm font-semibold text-white hover:bg-[#0B3B47]"
              disabled={!checked || loading || !signedIn}
              onClick={() => void onAccept()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Accept and continue"
              )}
            </Button>

            {!signedIn ? (
              <p className="mt-3 text-center text-sm text-slate-600">
                Create an account first, then you will be asked to accept these Terms once.
              </p>
            ) : null}
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href={routes.home} className="font-semibold text-[#0F4C5C] transition hover:text-[#0B3B47]">
            Back to home
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
