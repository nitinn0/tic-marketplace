"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthField, AuthInput } from "@/features/auth/components/auth-field";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setDevUrl(null);
    try {
      const result = await api.post<{ message: string; devResetUrl?: string }>("/auth/forgot-password", {
        email: email.trim(),
      });
      setMessage(result.message);
      if (result.devResetUrl) setDevUrl(result.devResetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset instructions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot password"
      description="Enter your work email and we will send a one-hour reset link if an account exists."
      highlights={["Link expires in one hour", "Existing sessions are revoked after a successful reset"]}
    >
      <div className="auth-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reset</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">Recover access</h2>
        <form className="mt-8 space-y-5" onSubmit={(event) => void submit(event)}>
          <AuthField label="Email" htmlFor="email">
            <AuthInput
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </AuthField>
          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
          {devUrl ? (
            <p className="break-all rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Dev reset link: <Link href={devUrl}>{devUrl}</Link>
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-full" disabled={loading || !email}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href={routes.login} className="font-semibold text-sky-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
