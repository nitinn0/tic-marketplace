"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { isProviderAdmin } from "@/features/organizations/utils/permissions";
import { routes } from "@/lib/constants";

/** Independents directory is only for provider organization admins. */
export default function ProfessionalsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, me, activeOrganization, activeContext } = useOrganizations();
  const allowed = isProviderAdmin(activeOrganization, activeContext);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`${routes.login}?next=${encodeURIComponent(routes.professionals)}`);
      return;
    }
    if (status === "ready" && me && !allowed) {
      router.replace(routes.home);
    }
  }, [status, me, allowed, router]);

  if (status === "loading" || status === "anonymous" || !allowed) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center px-4 py-16 text-sm text-[#5A6A6F]">
        Checking access…
      </div>
    );
  }

  return children;
}
