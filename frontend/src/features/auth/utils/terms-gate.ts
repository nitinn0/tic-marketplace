import { api } from "@/lib/api";
import { getStoredSession } from "@/lib/auth";
import { routes } from "@/lib/constants";

export type TermsUser = {
  termsAcceptedAt?: string | null;
};

/** Send first-time users to Terms once; afterwards return the intended destination. */
export function withTermsGate(destination: string, user: TermsUser | null | undefined) {
  if (user?.termsAcceptedAt) return destination;
  const next = destination.startsWith("/") && !destination.startsWith("//") ? destination : routes.dashboard;
  return `${routes.terms}?next=${encodeURIComponent(next)}`;
}

/** Prefer live /auth/me so acceptance is not missed after Nest or Supabase signup. */
export async function destinationWithTerms(destination: string) {
  try {
    const me = await api.get<{ user?: TermsUser }>("/auth/me");
    return withTermsGate(destination, me.user ?? { termsAcceptedAt: null });
  } catch {
    return withTermsGate(destination, getStoredSession()?.user);
  }
}
