"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthField, AuthPasswordInput, PasswordStrengthMeter } from "@/features/auth/components/auth-field";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, password });
      router.replace(routes.login);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-rise">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">New password</p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">Choose a new password</h2>
      <form className="mt-8 space-y-5" onSubmit={(event) => void submit(event)}>
        <AuthField label="Password" htmlFor="password" hint="At least 8 characters.">
          <AuthPasswordInput
            id="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordStrengthMeter password={password} />
        </AuthField>
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="h-11 w-full" disabled={loading || password.length < 8 || !token}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href={routes.login} className="font-semibold text-sky-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset password"
      description="Set a new password for your TIC Marketplace account."
    >
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
