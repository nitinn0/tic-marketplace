"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`${routes.login}?next=${encodeURIComponent(pathname)}`);
    }
  }, [router, pathname]);

  return <>{children}</>;
}
