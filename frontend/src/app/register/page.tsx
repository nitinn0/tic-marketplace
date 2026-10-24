"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AuthField,
  AuthInput,
  AuthPasswordInput,
  PasswordStrengthMeter,
} from "@/features/auth/components/auth-field";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { routes } from "@/lib/constants";

type RegisterResponse = {
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

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    firstName.trim().length >= 2 && lastName.trim().length >= 2 && email.trim().includes("@") && password.length >= 8;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<RegisterResponse>("/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      saveSession(result);
      router.push(routes.dashboard);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Buyer account"
      title="Create your account"
      description="Register once, then request quotes, track responses, and collaborate inside your buyer organization."
      highlights={[
        "One account for RFQs, quotes and organization membership",
        "Invite teammates when your organization is ready",
        "Switch to provider onboarding anytime from Join as provider",
      ]}
    >
      <div className="auth-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sign up</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">Get started</h2>
        <p className="mt-2 text-sm text-slate-600">Takes under a minute. No credit card required.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label="First name" htmlFor="firstName">
              <AuthInput
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                autoFocus
                required
                minLength={2}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Priya"
              />
            </AuthField>
            <AuthField label="Last name" htmlFor="lastName">
              <AuthInput
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                required
                minLength={2}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Sharma"
              />
            </AuthField>
          </div>

          <AuthField label="Work email" htmlFor="email">
            <AuthInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
            />
          </AuthField>

          <AuthField label="Password" htmlFor="password" hint="At least 8 characters.">
            <AuthPasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
            />
            <PasswordStrengthMeter password={password} />
          </AuthField>

          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" className="mt-1 h-11 w-full text-sm font-semibold" disabled={loading || !canSubmit}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href={routes.login} className="font-semibold text-sky-700 transition hover:text-sky-800">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm text-slate-600">
        Listing lab or certification services?{" "}
        <Link href={routes.join} className="font-semibold text-sky-700 transition hover:text-sky-800">
          Join as a provider
        </Link>
      </div>
    </AuthShell>
  );
}
