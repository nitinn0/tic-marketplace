"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Container } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants";
import { CreateOrganizationForm } from "@/features/organizations/components/create-organization-form";
import { OrganizationList } from "@/features/organizations/components/organization-list";
import { useOrganizationList } from "@/features/organizations/hooks/use-organization-data";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";

export default function OrganizationsPage() {
  const router = useRouter();
  const { data, error, loading } = useOrganizationList();
  const { activeOrganization, refresh } = useOrganizations();
  const [creating, setCreating] = useState(false);

  return (
    <Container className="py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Organizations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Organizations you are an active member of. Access inside each organization comes from the roles you hold
            there.
          </p>
        </div>
        {!creating ? (
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New organization
          </Button>
        ) : null}
      </div>

      {creating ? (
        <div className="mt-8">
          <CreateOrganizationForm
            onCancel={() => setCreating(false)}
            onCreated={async (organization) => {
              await refresh();
              router.push(routes.organization(organization.id));
            }}
          />
        </div>
      ) : null}

      <div className="mt-8">
        {loading ? (
          <LoadingState label="Loading organizations..." />
        ) : error ? (
          <ErrorState title="Unable to load organizations" description={error} />
        ) : data && data.length > 0 ? (
          <OrganizationList organizations={data} activeOrganizationId={activeOrganization?.id ?? null} />
        ) : (
          <EmptyState
            title="You are not part of any organization yet"
            description="Create an organization or accept an invitation to get started. Independent professionals do not need one."
          />
        )}
      </div>
    </Container>
  );
}
