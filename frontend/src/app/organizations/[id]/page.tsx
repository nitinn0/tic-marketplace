"use client";

import { useParams } from "next/navigation";

import { Container } from "@/components/common/container";
import { LoadingState } from "@/components/common/loading-state";
import { MyAccessCard } from "@/features/organizations/components/my-access-card";
import { OrganizationAccessError, OrganizationPageHeader } from "@/features/organizations/components/organization-page-header";
import { OrganizationProfileCard } from "@/features/organizations/components/organization-profile";
import { useOrganizationDetails } from "@/features/organizations/hooks/use-organization-data";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { canInOrganization, ORGANIZATION_FUNCTIONALITIES as F } from "@/features/organizations/utils/permissions";

function OrganizationOverview({ organizationId }: { organizationId: string }) {
  const { refresh } = useOrganizations();
  const { data: organization, error, status, loading, reload } = useOrganizationDetails(organizationId);

  if (loading) return <LoadingState label="Loading organization..." />;
  if (error || !organization) return <OrganizationAccessError status={status} message={error ?? "Unknown error"} />;

  const access = {
    permissions: organization.permissions,
    status: organization.status,
    accessVia: organization.accessVia,
    hasPlatformAccess: organization.hasPlatformAccess,
  };

  return (
    <>
      <OrganizationPageHeader organization={organization} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <OrganizationProfileCard
          organization={organization}
          canEdit={canInOrganization(access, F.profile, "edit")}
          canEditStatus={canInOrganization(access, F.status, "edit")}
          onUpdated={() => {
            void reload();
            void refresh();
          }}
        />
        <MyAccessCard organization={organization} />
      </div>
    </>
  );
}

export default function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Container className="py-10">
      <OrganizationOverview key={id} organizationId={id} />
    </Container>
  );
}
