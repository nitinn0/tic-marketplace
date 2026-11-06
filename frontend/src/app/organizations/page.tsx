"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";

import { Container } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { routes } from "@/lib/constants";
import { CreateOrganizationForm } from "@/features/organizations/components/create-organization-form";
import { OrganizationList } from "@/features/organizations/components/organization-list";
import { useOrganizationList } from "@/features/organizations/hooks/use-organization-data";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { hasPermission, ORGANIZATION_FUNCTIONALITIES } from "@/features/organizations/utils/permissions";

const CORAL_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2A98B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]";

export default function OrganizationsPage() {
  const router = useRouter();
  const { activeOrganization, refresh, me, status } = useOrganizations();
  const platformAccess =
    status === "ready" &&
    hasPermission(me?.permissions, "organizations.platform_access", "view") &&
    hasPermission(me?.permissions, ORGANIZATION_FUNCTIONALITIES.profile, "view");
  const { data, error, loading } = useOrganizationList(status === "loading" ? null : platformAccess ? "all" : "mine");
  const [creating, setCreating] = useState(false);

  return (
    <div className="bg-[#FBF6F0]">
      <section className="relative overflow-hidden bg-[#0B3440] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.5),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.26),_transparent_45%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        />
        <Container className="relative py-10 md:py-12">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/60">
            <Link href={routes.dashboard} className="transition hover:text-white">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-white/90">Organizations</span>
          </nav>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Workspace</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Organizations</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
                {platformAccess
                  ? "Every organization on the platform. Open one to manage it with your platform access."
                  : "Organizations you are an active member of. Access inside each organization comes from the roles you hold there."}
              </p>
            </div>
            {!creating ? (
              <button type="button" className={CORAL_BTN} onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                New organization
              </button>
            ) : null}
          </div>
        </Container>
      </section>

      <Container className="py-8 md:py-10">
        {creating ? (
          <div className="mb-8">
            <CreateOrganizationForm
              onCancel={() => setCreating(false)}
              onCreated={async (organization) => {
                await refresh();
                router.push(routes.organization(organization.id));
              }}
            />
          </div>
        ) : null}

        {status === "loading" || loading ? (
          <LoadingState label="Loading organizations..." />
        ) : error ? (
          <ErrorState title="Unable to load organizations" description={error} />
        ) : data && data.length > 0 ? (
          <OrganizationList organizations={data} activeOrganizationId={activeOrganization?.id ?? null} />
        ) : (
          <EmptyState
            title={platformAccess ? "No organizations yet" : "You are not part of any organization yet"}
            description={
              platformAccess
                ? "Create an organization to get started."
                : "Create an organization or accept an invitation to get started. Independent professionals do not need one."
            }
          />
        )}
      </Container>
    </div>
  );
}
