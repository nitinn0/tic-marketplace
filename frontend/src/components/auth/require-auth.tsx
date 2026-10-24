"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";

/** Client-side gate for pages that need a stored session before rendering content. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`${routes.login}?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-slate-500">Checking your session…</div>;
  }

  return <>{children}</>;
}
