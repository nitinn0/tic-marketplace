"use client";

import { RequireAuth } from "@/components/auth/require-auth";

export default function RfqLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
