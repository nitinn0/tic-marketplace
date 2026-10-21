"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { organizationsService } from "@/features/organizations/services/organizations.service";
import { ApiError, api, setActiveOrganizationId, usesSupabaseAuth } from "@/lib/api";
import { clearSession, getStoredSession, saveSession } from "@/lib/auth";
import { routes } from "@/lib/constants";
import { sessionFromSupabaseAuth, signUpWithEmail, supabaseTokenIsValid } from "@/lib/supabase-auth";

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
      const authData = await signUpWithEmail({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim() });
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
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Providers</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Join as a provider</h1>
        <p className="mt-3 text-sm text-slate-600">
          List your lab, inspection company, certification body, or consulting practice and receive matching RFQs.
        </p>

        {step === "choose" ? (
          <div className="mt-8 grid gap-3">
            <Button type="button" className="w-full" onClick={() => setStep("onboard")}>
              Onboard
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={loginHref}>Login</Link>
            </Button>
            <p className="text-center text-sm text-slate-500">
              New providers start with Onboard. Use Login if you already have an account.
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {signedIn ? null : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" htmlFor="firstName">
                    <Input id="firstName" required minLength={2} value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                  </Field>
                  <Field label="Last name" htmlFor="lastName">
                    <Input id="lastName" required minLength={2} value={lastName} onChange={(event) => setLastName(event.target.value)} />
                  </Field>
                </div>
                <Field label="Email" htmlFor="email">
                  <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </Field>
                <Field label="Password" htmlFor="password">
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="Business name" htmlFor="displayName">
              <Input
                id="displayName"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Name buyers will see"
              />
            </Field>
            <Field label="Legal name" htmlFor="legalName">
              <Input
                id="legalName"
                required
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                placeholder="Registered company name"
              />
            </Field>
            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating provider..." : "Create provider account"}
            </Button>
            <button type="button" className="text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => setStep("choose")}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
