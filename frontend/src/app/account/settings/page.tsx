"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Container } from "@/components/common/container";
import { Button } from "@/components/ui/button";
import { AuthField, AuthInput, AuthPasswordInput } from "@/features/auth/components/auth-field";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { ApiError, api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { routes } from "@/lib/constants";

type RequestResponse = { message: string; devOtp?: string };
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
      <Container className="py-10">
        <p className="text-sm text-slate-500">Loading account settings…</p>
      </Container>
    );
  }

  if (status === "error" || !me) {
    return (
      <Container className="py-10">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {profileError ?? "Unable to load your account."}
        </p>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Account settings</h1>
        <p className="mt-2 text-sm text-slate-600">Manage the email address used to sign in.</p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">
                {me.user.firstName} {me.user.lastName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Current email</dt>
              <dd className="truncate font-medium text-slate-900">{me.user.email}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Change email</h2>
          {isSuperAdmin ? (
            <p className="mt-3 text-sm text-slate-600">
              Super admin accounts cannot change email from this screen. Contact another platform operator if this
              address must be updated.
            </p>
          ) : step === "request" ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
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
                <Button type="submit" className="h-11 w-full" disabled={loading || !newEmail || !password}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending code…
                    </>
                  ) : (
                    "Send verification code"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Enter the 6-digit code sent to <span className="font-medium text-slate-900">{newEmail}</span>.
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
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 flex-1"
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
                  </Button>
                  <Button type="submit" className="h-11 flex-1" disabled={loading || otp.length !== 6}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
                      </>
                    ) : (
                      "Confirm new email"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href={routes.dashboard} className="font-semibold text-sky-700">
            Back to dashboard
          </Link>
        </p>
      </div>
    </Container>
  );
}
