"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<RegisterResponse>("/auth/register", {
        firstName,
        lastName,
        email,
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
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">New customer</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Create your account</h1>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              First name
              <input
                required
                minLength={2}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:bg-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Last name
              <input
                required
                minLength={2}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:bg-white"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:bg-white"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:bg-white"
            />
          </label>
          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign-Up"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href={routes.login} className="font-medium text-sky-700">
            Login Now
          </Link>
        </p>
      </div>
    </div>
  );
}
