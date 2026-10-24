"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthField, AuthInput, AuthPasswordInput } from "@/features/auth/components/auth-field";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { organizationsService } from "@/features/organizations/services/organizations.service";
import { api, usesSupabaseAuth } from "@/lib/api";
import { homeForMemberships, requestedNext } from "@/lib/home-route";
import { signInWithEmail } from "@/lib/supabase-auth";
import { routes } from "@/lib/constants";

type LoginResponse = {
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

async function destinationAfterLogin() {
  const next = requestedNext();
  if (next) return next;
  try {
    return homeForMemberships(await organizationsService.me());
  } catch {
    return routes.dashboard;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (usesSupabaseAuth()) {
        const authData = await signInWithEmail(email, password);
        if (!authData.session) {
          throw new Error("Unable to sign in.");
        }

        const metadata = authData.user?.user_metadata ?? {};
        window.localStorage.setItem("tic_access_token", authData.session.access_token);
        window.localStorage.setItem("tic_refresh_token", authData.session.refresh_token);
        window.localStorage.setItem(
          "tic_user",
          JSON.stringify({
            id: authData.user?.id ?? "supabase-user",
            email: authData.user?.email ?? email,
            firstName: metadata.first_name ?? "",
            lastName: metadata.last_name ?? "",
            status: "ACTIVE",
          }),
        );
        router.push(await destinationAfterLogin());
        router.refresh();
        return;
      }

      const result = await api.post<LoginResponse>("/auth/login", { email, password });
      window.localStorage.setItem("tic_access_token", result.accessToken);
      window.localStorage.setItem("tic_refresh_token", result.refreshToken);
      window.localStorage.setItem("tic_user", JSON.stringify(result.user));
      router.push(await destinationAfterLogin());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Secure workspace access"
      title="Welcome back"
      description="Sign in to manage RFQs, quotes, provider profiles, and organization permissions."
    >
      <div className="auth-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sign in</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">Your workspace</h2>
        <p className="mt-2 text-sm text-slate-600">Use the email and password for your TIC Marketplace account.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          <AuthField label="Email" htmlFor="email">
            <AuthInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
          </AuthField>

          <AuthField label="Password" htmlFor="password">
            <AuthPasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
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

          <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={loading || !email || !password}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{" "}
          <Link href={routes.register} className="font-semibold text-sky-700 transition hover:text-sky-800">
            Create an account
          </Link>
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm text-slate-600">
        Offering TIC services?{" "}
        <Link href={routes.join} className="font-semibold text-sky-700 transition hover:text-sky-800">
          Join as a provider
        </Link>
      </div>
    </AuthShell>
  );
}
