"use client";

import { useEffect, useMemo, useState } from "react";
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
import { organizationsService } from "@/features/organizations/services/organizations.service";
import { professionalsService } from "@/features/professionals/services/professionals.service";
import type { ProfessionalType } from "@/features/professionals/types";
import { providersService } from "@/features/providers/services/providers.service";
import type { ProviderType } from "@/features/providers/types";
import {
  COMPANY_CLASSIFICATION_BLOCKED_MESSAGE,
  containsCompanyClassification,
} from "@/features/providers/utils/company-classification";
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

type JoinKind = "organisation" | "independent";

const JOIN_CATEGORIES = [
  { id: "testing", label: "Testing", providerType: "TESTING_LAB" as ProviderType, professionalType: "TECHNICAL_EXPERT" as ProfessionalType },
  { id: "inspection", label: "Inspection", providerType: "INSPECTION_COMPANY" as ProviderType, professionalType: "INSPECTOR" as ProfessionalType },
  { id: "certification", label: "Certification", providerType: "CERTIFICATION_BODY" as ProviderType, professionalType: "LEAD_AUDITOR" as ProfessionalType },
  { id: "esg", label: "Sustainability & ESG", providerType: "CONSULTANCY" as ProviderType, professionalType: "CONSULTANT" as ProfessionalType },
  { id: "professional", label: "Professional Services", providerType: "CONSULTANCY" as ProviderType, professionalType: "CONSULTANT" as ProfessionalType },
] as const;

const BASE_CITIES = [
  "Ahmedabad",
  "Bengaluru",
  "Chennai",
  "Delhi NCR",
  "Hyderabad",
  "Jaipur",
  "Kolkata",
  "Mumbai",
  "Pune",
  "Surat",
  "Other / Remote",
];

const loginHref = `${routes.login}?next=${encodeURIComponent(routes.join)}`;

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function accountNamesFromOrg(orgName: string, email: string) {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Provider";
  const first = local.split(/\s+/)[0] || "Provider";
  const last = orgName.trim().slice(0, 40) || "Account";
  return { firstName: first.charAt(0).toUpperCase() + first.slice(1), lastName: last };
}

export default function JoinPage() {
  const router = useRouter();
  const [kind, setKind] = useState<JoinKind>("organisation");
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [baseCity, setBaseCity] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [accreditation, setAccreditation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getStoredSession()));
  }, []);

  const selectedCategories = useMemo(
    () => JOIN_CATEGORIES.filter((entry) => categories.includes(entry.id)),
    [categories],
  );

  const canSubmit = useMemo(() => {
    if (!baseCity || categories.length === 0) return false;
    if (kind === "organisation") {
      if (organisationName.trim().length < 2) return false;
    } else if (fullName.trim().length < 3) {
      return false;
    }
    if (!signedIn) {
      if (!email.trim().includes("@") || password.length < 8) return false;
    }
    return true;
  }, [baseCity, categories.length, email, fullName, kind, organisationName, password, signedIn]);

  function toggleCategory(id: string) {
    setCategories((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  async function ensureSession(names: { firstName: string; lastName: string }) {
    const stored = getStoredSession();
    if (usesSupabaseAuth()) {
      const valid = stored ? await supabaseTokenIsValid(stored.accessToken) : false;
      if (valid) return;
      if (!email.trim() || !password) {
        clearSession();
        setSignedIn(false);
        throw new Error("Enter your email and password, then submit again.");
      }
      const authData = await signUpWithEmail({
        email: email.trim(),
        password,
        firstName: names.firstName,
        lastName: names.lastName,
      });
      saveSession(sessionFromSupabaseAuth(authData, { email, firstName: names.firstName, lastName: names.lastName }));
      setSignedIn(true);
      return;
    }

    if (stored) return;
    const result = await api.post<RegisterResponse>("/auth/register", {
      firstName: names.firstName,
      lastName: names.lastName,
      email: email.trim(),
      password,
    });
    saveSession(result);
    setSignedIn(true);
  }

  async function submitOrganisation() {
    const names = accountNamesFromOrg(organisationName, email);
    await ensureSession(names);

    const organization = await organizationsService.create({
      legalName: organisationName.trim(),
      displayName: organisationName.trim(),
      organizationType: "PROVIDER",
      description: [about.trim(), accreditation.trim() ? `Primary accreditation: ${accreditation.trim()}` : "", baseCity ? `Base city: ${baseCity}` : ""]
        .filter(Boolean)
        .join("\n\n"),
      countryCode: "IN",
    });
    setActiveOrganizationId(organization.id);
    await organizationsService.switch(organization.id);

    const providerTypes = Array.from(new Set(selectedCategories.map((entry) => entry.providerType)));
    try {
      await providersService.createProfile(organization.id, {
        providerTypes: providerTypes.length ? providerTypes : ["OTHER"],
        headline: headline.trim() || null,
        description: about.trim() || null,
        publicProfile: true,
      });
    } catch (err) {
      // Profile may already exist if the org was partially onboarded; continue to the profile page.
      if (!(err instanceof ApiError && err.status === 409)) throw err;
    }

    router.push(routes.providerProfile);
    router.refresh();
  }

  async function submitIndependent() {
    if (containsCompanyClassification(fullName)) {
      throw new Error(COMPANY_CLASSIFICATION_BLOCKED_MESSAGE);
    }

    const names = splitFullName(fullName);
    if (names.firstName.length < 2 || names.lastName.length < 2) {
      throw new Error("Enter your full personal name (first and last name).");
    }
    if (containsCompanyClassification(`${names.firstName} ${names.lastName}`)) {
      throw new Error(COMPANY_CLASSIFICATION_BLOCKED_MESSAGE);
    }

    await ensureSession(names);

    const professionalType = selectedCategories[0]?.professionalType ?? "OTHER";
    await professionalsService.onboard({
      firstName: names.firstName,
      lastName: names.lastName,
      professionalType,
      headline: headline.trim() || null,
      bio: about.trim() || null,
      baseCity: baseCity || null,
      primaryAccreditation: accreditation.trim() || null,
      publicProfile: true,
      availabilityStatus: "AVAILABLE",
    });

    router.push(routes.professionalProfile);
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (kind === "organisation") await submitOrganisation();
      else await submitIndependent();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        setSignedIn(false);
        setError("Your session is not valid for this site. Enter your email and password, then try again.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to submit for verification.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Provider onboarding"
      title="Join as a provider"
      description="Labs, certification bodies, inspectors, consultants, auditors and independent experts."
      highlights={[
        "List as an organisation or an independent professional",
        "Individuals must use a personal name — no PVT LTD / LLP profiles",
        "Companies can browse independents to hire them",
      ]}
    >
      <div className="auth-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Providers</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">Join as a provider</h2>
        <p className="mt-2 text-sm text-slate-600">
          Labs, certification bodies, inspectors, consultants, auditors and independent experts.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label="Provider type">
          {(
            [
              { id: "organisation", label: "Organisation" },
              { id: "independent", label: "Independent professional" },
            ] as const
          ).map((option) => {
            const active = kind === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setKind(option.id);
                  setError(null);
                }}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition",
                  active
                    ? "border-[#0F4C5C] bg-[#E8F4F5] text-[#0F4C5C]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {kind === "organisation" ? (
            <AuthField label="Organisation name" htmlFor="organisationName">
              <AuthInput
                id="organisationName"
                required
                value={organisationName}
                onChange={(event) => setOrganisationName(event.target.value)}
                placeholder="Organisation name"
                autoFocus
              />
            </AuthField>
          ) : (
            <AuthField
              label="Full name"
              htmlFor="fullName"
              hint="Personal name only — company classifications like PVT LTD or LLP are blocked."
            >
              <AuthInput
                id="fullName"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                autoFocus
              />
            </AuthField>
          )}

          {signedIn ? null : (
            <>
              <AuthField label="Work email" htmlFor="email">
                <AuthInput
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Work email"
                />
              </AuthField>
              <AuthField label="Password" htmlFor="password" hint="At least 8 characters to create your account.">
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
            </>
          )}

          <AuthField label="Base city" htmlFor="baseCity">
            <select
              id="baseCity"
              required
              value={baseCity}
              onChange={(event) => setBaseCity(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
            >
              <option value="">Select base city</option>
              {BASE_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </AuthField>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Categories</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
              {JOIN_CATEGORIES.map((category) => {
                const active = categories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                      active
                        ? "border-[#0F4C5C] bg-[#E8F4F5] text-[#0F4C5C]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          <AuthField label="Headline" htmlFor="headline">
            <AuthInput
              id="headline"
              maxLength={160}
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Headline — what you do, for whom, where"
            />
          </AuthField>

          <AuthField
            label={kind === "organisation" ? "About your organisation / experience" : "About"}
            htmlFor="about"
          >
            <textarea
              id="about"
              rows={4}
              maxLength={5000}
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              placeholder="About your organisation / experience"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
            />
          </AuthField>

          <AuthField label="Primary accreditation" htmlFor="accreditation">
            <AuthInput
              id="accreditation"
              maxLength={200}
              value={accreditation}
              onChange={(event) => setAccreditation(event.target.value)}
              placeholder="Primary accreditation (e.g. NABL TC-1234, IRCA Lead Auditor)"
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

          <Button
            type="submit"
            className="h-11 bg-[#0F4C5C] text-sm font-semibold text-white hover:bg-[#0B3B47]"
            disabled={loading || !canSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Submitting…
              </>
            ) : (
              "Submit for verification"
            )}
          </Button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href={loginHref} className="font-semibold text-[#0F4C5C] transition hover:text-[#0B3B47]">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
