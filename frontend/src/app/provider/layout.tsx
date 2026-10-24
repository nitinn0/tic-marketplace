"use client";

import { RequireAuth } from "@/components/auth/require-auth";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
