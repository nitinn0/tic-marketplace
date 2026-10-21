import { supabase } from "@/lib/supabase";
import type { SessionPayload } from "@/lib/auth";

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function supabaseTokenIsValid(token: string) {
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}

/** Creates a confirmed account on the server, then signs in. Supabase does not send a confirmation email. */
export async function signUpWithEmail(input: { email: string; password: string; firstName: string; lastName: string }) {
  const response = await fetch("/api/v1/auth/provider-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(body.message || "Unable to create the account.");
  }
  return signInWithEmail(input.email, input.password);
}

export function sessionFromSupabaseAuth(
  data: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null; session: { access_token: string; refresh_token: string; expires_in?: number } | null },
  fallback: { email: string; firstName: string; lastName: string },
): SessionPayload {
  if (!data.session) {
    throw new Error("Unable to sign in.");
  }
  const metadata = data.user?.user_metadata ?? {};
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in ?? 900,
    user: {
      id: data.user?.id ?? "supabase-user",
      email: data.user?.email ?? fallback.email,
      firstName: String(metadata.first_name ?? (fallback.firstName || "Provider")),
      lastName: String(metadata.last_name ?? (fallback.lastName || "User")),
      status: "ACTIVE",
    },
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
