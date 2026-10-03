"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(routes.dashboard);
    }
  }, [router]);

  return <>{children}</>;
}
