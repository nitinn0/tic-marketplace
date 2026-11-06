"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";

import { Container } from "@/components/common/container";
import { AuthField, AuthInput, AuthPasswordInput } from "@/features/auth/components/auth-field";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { ApiError, api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { routes } from "@/lib/constants";

type RequestResponse = { message: string; devOtp?: string };
const CORAL_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2A98B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C] disabled:pointer-events-none disabled:opacity-50";

const GHOST_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#EADFCF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F4C5C] transition hover:border-[#7CC0C8] hover:bg-[#E8F4F5]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C] disabled:pointer-events-none disabled:opacity-50";

type ConfirmResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number | string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
};

export default function AccountSettingsPage() {
  const { me, status, error: profileError, refresh } = useOrganizations();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = useMemo(
    () => Boolean(me?.globalRoles?.some((role) => role.code === "SUPER_ADMIN")),
    [me?.globalRoles],
  );

  const requestChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setDevOtp(null);
    try {
      const result = await api.post<RequestResponse>("/auth/change-email/request", {
        newEmail: newEmail.trim(),
        password,
      });
      setMessage(result.message);
      if (result.devOtp) setDevOtp(result.devOtp);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Unable to start email change");
    } finally {
      setLoading(false);
    }
  };

  const confirmChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.post<ConfirmResponse>("/auth/change-email/confirm", {
        otp: otp.trim(),
      });
      saveSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          status: result.user.status,
        },
      });
      setMessage(result.message);
      setStep("request");
      setNewEmail("");
      setPassword("");
      setOtp("");
      setDevOtp(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Unable to confirm email change");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "anonymous") {
    return (
      <div className="bg-[#FBF6F0]">
        <Container className="py-16">
          <p className="text-sm text-[#5A6A6F]">Loading account settings…</p>
        </Container>
      </div>
    );
  }

  if (status === "error" || !me) {
    return (
      <div className="bg-[#FBF6F0]">
        <Container className="py-10">
          <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {profileError ?? "Unable to load your account."}
          </p>
        </Container>
      </div>
    );
  }

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
            <Link href={routes.dashboard} className="transition hover:text-white">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-white/90">Account settings</span>
          </nav>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Account</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Account settings</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
            Manage the email address used to sign in.
          </p>
        </Container>
      </section>

      <Container className="py-8 md:py-10">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-[#EADFCF] bg-white p-6 shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)]">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[#EADFCF] pb-3">
              <dt className="text-[#5A6A6F]">Name</dt>
              <dd className="font-medium text-[#12303A]">
                {me.user.firstName} {me.user.lastName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#5A6A6F]">Current email</dt>
              <dd className="truncate font-medium text-[#12303A]">{me.user.email}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-3xl border border-[#EADFCF] bg-white p-6 shadow-[0_12px_30px_-22px_rgba(18,48,58,0.45)]">
          <h2 className="font-display text-lg font-semibold text-[#12303A]">Change email</h2>
          {isSuperAdmin ? (
            <p className="mt-3 text-sm text-[#5A6A6F]">
              Super admin accounts cannot change email from this screen. Contact another platform operator if this
              address must be updated.
            </p>
          ) : step === "request" ? (
            <>
              <p className="mt-2 text-sm text-[#5A6A6F]">
                Enter a new email and your current password. We will send a one-time code to the new address.
              </p>
              <form className="mt-6 space-y-5" onSubmit={(event) => void requestChange(event)}>
                <AuthField label="New email" htmlFor="new-email">
                  <AuthInput
                    id="new-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="you@company.com"
                  />
                </AuthField>
                <AuthField label="Current password" htmlFor="password">
                  <AuthPasswordInput
                    id="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                  />
                </AuthField>
                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                ) : null}
                {message ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {message}
                  </p>
                ) : null}
                <button type="submit" className={`${CORAL_BTN} w-full`} disabled={loading || !newEmail || !password}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending code…
                    </>
                  ) : (
                    "Send verification code"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#5A6A6F]">
                Enter the 6-digit code sent to <span className="font-medium text-[#12303A]">{newEmail}</span>.
              </p>
              <form className="mt-6 space-y-5" onSubmit={(event) => void confirmChange(event)}>
                <AuthField label="Verification code" htmlFor="otp">
                  <AuthInput
                    id="otp"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                  />
                </AuthField>
                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                ) : null}
                {message ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {message}
                  </p>
                ) : null}
                {devOtp ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Dev OTP: <span className="font-mono font-semibold">{devOtp}</span>
                  </p>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className={`${GHOST_BTN} w-full sm:flex-1`}
                    disabled={loading}
                    onClick={() => {
                      setStep("request");
                      setOtp("");
                      setError(null);
                      setMessage(null);
                      setDevOtp(null);
                    }}
                  >
                    Back
                  </button>
                  <button type="submit" className={`${CORAL_BTN} w-full sm:flex-1`} disabled={loading || otp.length !== 6}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
                      </>
                    ) : (
                      "Confirm new email"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

      </div>
      </Container>
    </div>
  );
}
