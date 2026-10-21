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

/** Creates a Supabase user when needed, then returns a session the API will accept. */
export async function signUpWithEmail(input: { email: string; password: string; firstName: string; lastName: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { first_name: input.firstName, last_name: input.lastName } },
  });
  if (data.session) return data;
  if (error && !/already registered|already exists/i.test(error.message)) {
    throw error;
  }

  try {
    return await signInWithEmail(input.email, input.password);
  } catch (signInError) {
    const message = signInError instanceof Error ? signInError.message : "";
    if (/confirm/i.test(message)) {
      throw new Error("Confirm your email, then use Login to finish creating the provider organization.");
    }
    throw signInError;
  }
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
