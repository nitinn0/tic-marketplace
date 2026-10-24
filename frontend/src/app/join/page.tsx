"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AuthField,
  AuthInput,
  AuthPasswordInput,
  PasswordStrengthMeter,
} from "@/features/auth/components/auth-field";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { organizationsService } from "@/features/organizations/services/organizations.service";
import { ApiError, api, setActiveOrganizationId, usesSupabaseAuth } from "@/lib/api";
import { clearSession, getStoredSession, saveSession } from "@/lib/auth";
import { routes } from "@/lib/constants";
import { sessionFromSupabaseAuth, signUpWithEmail, supabaseTokenIsValid } from "@/lib/supabase-auth";
import { cn } from "@/lib/utils";

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

const loginHref = `${routes.login}?next=${encodeURIComponent(routes.providerProfile)}`;

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "onboard">("choose");
  const [signedIn, setSignedIn] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getStoredSession()));
  }, []);

  async function createProviderOrganization() {
    const organization = await organizationsService.create({
      legalName: legalName.trim(),
      displayName: displayName.trim(),
      organizationType: "PROVIDER",
    });
    setActiveOrganizationId(organization.id);
    await organizationsService.switch(organization.id);
    router.push(routes.providerProfile);
    router.refresh();
  }

  async function ensureSession() {
    const stored = getStoredSession();
    if (usesSupabaseAuth()) {
      const valid = stored ? await supabaseTokenIsValid(stored.accessToken) : false;
      if (valid) return;
      if (!email.trim() || !password) {
        clearSession();
        setSignedIn(false);
        throw new Error("Enter your email and password, then create the provider organization again.");
      }
      const authData = await signUpWithEmail({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      saveSession(sessionFromSupabaseAuth(authData, { email, firstName, lastName }));
      setSignedIn(true);
      return;
    }

    if (stored) return;
    const result = await api.post<RegisterResponse>("/auth/register", {
      firstName,
      lastName,
      email,
      password,
    });
    saveSession(result);
    setSignedIn(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await ensureSession();
      await createProviderOrganization();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        setSignedIn(false);
        setError("Your session is not valid for this site. Enter your email and password, then try again.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to start provider onboarding.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Provider onboarding"
      title="Join as a provider"
      description="List your lab, inspection company, certification body, or consulting practice and receive matching RFQs."
      highlights={[
        "Post the services buyers already search for",
        "Receive RFQs matched to your capabilities",
        "Quote with buyer identity masked until you engage",
      ]}
    >
      <div className="auth-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Providers</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
          {step === "choose" ? "How do you want to start?" : "Create your provider organization"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {step === "choose"
            ? "New providers onboard here. Existing accounts can sign in and continue to the provider profile."
            : signedIn
              ? "You're signed in. Add the business buyers will see on the marketplace."
              : "Create your account and provider organization in one step."}
        </p>

        {step === "choose" ? (
          <div className="mt-8 grid gap-3">
            <button
              type="button"
              onClick={() => setStep("onboard")}
              className={cn(
                "group flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition",
                "hover:border-sky-300 hover:bg-sky-50/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/15",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-slate-900 group-hover:text-sky-800">Onboard as a new provider</span>
                <span className="mt-1 block text-sm text-slate-500">Create an account and list your organization.</span>
              </span>
            </button>

            <Link
              href={loginHref}
              className={cn(
                "group flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition",
                "hover:border-sky-300 hover:bg-sky-50/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/15",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <LogIn className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-slate-900 group-hover:text-sky-800">I already have an account</span>
                <span className="mt-1 block text-sm text-slate-500">Sign in, then finish your provider profile.</span>
              </span>
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
            {signedIn ? null : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AuthField label="First name" htmlFor="firstName">
                    <AuthInput
                      id="firstName"
                      required
                      minLength={2}
                      autoComplete="given-name"
                      autoFocus
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </AuthField>
                  <AuthField label="Last name" htmlFor="lastName">
                    <AuthInput
                      id="lastName"
                      required
                      minLength={2}
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </AuthField>
                </div>
                <AuthField label="Work email" htmlFor="email">
                  <AuthInput
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                  />
                </AuthField>
                <AuthField label="Password" htmlFor="password" hint="At least 8 characters.">
                  <AuthPasswordInput
                    id="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a password"
                  />
                  <PasswordStrengthMeter password={password} />
                </AuthField>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Organization</p>
                </div>
              </>
            )}

            <AuthField label="Business name" htmlFor="displayName" hint="Shown to buyers on the marketplace.">
              <AuthInput
                id="displayName"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Name buyers will see"
                autoFocus={signedIn}
              />
            </AuthField>
            <AuthField label="Legal name" htmlFor="legalName" hint="Registered company name.">
              <AuthInput
                id="legalName"
                required
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                placeholder="Registered company name"
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

            <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating provider…
                </>
              ) : (
                "Create provider account"
              )}
            </Button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
