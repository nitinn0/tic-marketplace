"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { AuthField, AuthInput, AuthPasswordInput } from "@/features/auth/components/auth-field";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { organizationsService } from "@/features/organizations/services/organizations.service";
import { api, usesSupabaseAuth } from "@/lib/api";
import { homeForMemberships, requestedNext } from "@/lib/home-route";
import { signInWithEmail } from "@/lib/supabase-auth";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

const CORAL_BTN =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E36F47] px-5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2A98B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C] disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0";

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
      eyebrow="Secure workspace"
      title="Welcome back"
      description="Sign in to manage RFQs, quotes, provider profiles, and organization permissions."
      highlights={[
        "Compare matched quotes without chasing email threads",
        "Switch between buyer and provider workspaces",
        "Invite teammates when your organization is ready",
      ]}
    >
      <div className="auth-rise">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36F47]">Sign in</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#12303A]">Your workspace</h2>
        <p className="mt-2 text-sm text-[#5A6A6F]">Use the email and password for your TIC Marketplace account.</p>

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
              placeholder="Enter your email"
              required
            />
          </AuthField>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="password" className="text-sm font-medium text-[#3E5258]">
                Password
              </label>
              <Link
                href={routes.forgotPassword}
                className="text-xs font-semibold text-[#0F4C5C] transition hover:text-[#E36F47]"
              >
                Forgot password?
              </Link>
            </div>
            <AuthPasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <button type="submit" className={CORAL_BTN} disabled={loading || !email || !password}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#5A6A6F]">
          New here?{" "}
          <Link href={routes.register} className="font-semibold text-[#0F4C5C] transition hover:text-[#E36F47]">
            Create an account
          </Link>
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-[#EADFCF] bg-[#F4EBDD]/70 px-4 py-3.5 text-sm text-[#5A6A6F]">
        Offering TIC services?{" "}
        <Link
          href={routes.join}
          className={cn("inline-flex items-center gap-1 font-semibold text-[#0F4C5C] transition hover:text-[#E36F47]")}
        >
          Join as a provider
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </AuthShell>
  );
}
