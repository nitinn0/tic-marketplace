"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("bob+auth@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const authData = await signInWithEmail(email, password).catch(() => null);

      if (authData?.session) {
        window.localStorage.setItem("tic_access_token", authData.session.access_token);
        window.localStorage.setItem("tic_refresh_token", authData.session.refresh_token);
        window.localStorage.setItem(
          "tic_user",
          JSON.stringify({
            id: authData.user?.id ?? "supabase-user",
            email: authData.user?.email ?? email,
            firstName: "Supabase",
            lastName: "User",
            status: "ACTIVE",
          }),
        );
        router.push(routes.dashboard);
        router.refresh();
        return;
      }

      const result = await api.post<LoginResponse>("/auth/login", { email, password });
      window.localStorage.setItem("tic_access_token", result.accessToken);
      window.localStorage.setItem("tic_refresh_token", result.refreshToken);
      window.localStorage.setItem("tic_user", JSON.stringify(result.user));
      router.push(routes.dashboard);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        <div className="bg-sky-700 p-8 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
            TIC Marketplace
          </p>
          <h1 className="mt-4 text-3xl font-bold">Welcome back</h1>
          <p className="mt-4 max-w-sm text-sky-100">
            Access the marketplace, manage permissions, and work in the admin workspace.
          </p>

          <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
            <p className="font-semibold">Demo super admin</p>
            <p className="mt-2 text-sky-100">bob+auth@example.com</p>
            <p className="text-sky-100">password123</p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Sign in
          </p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">Your workspace</h2>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:bg-white"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:bg-white"
                placeholder="••••••••"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
