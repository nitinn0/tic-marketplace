"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiResource } from "@/features/organizations/hooks/use-api-resource";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import type { OrganizationContext } from "@/features/organizations/types";
import { canInOrganization, PROVIDER_FUNCTIONALITIES as P } from "@/features/organizations/utils/permissions";
import { routes } from "@/lib/constants";

import { providersService } from "../services/providers.service";
import type { ProviderCatalog, ProviderProfile } from "../types";
import { profileVerificationLabels, profileVerificationTones, providerTypeLabels } from "../utils/labels";
import { CapabilitySection, SectionCard, type CapabilityOption } from "./capability-section";
import { LocationsSection } from "./locations-section";
import { ProviderBasicForm } from "./provider-basic-form";

/** Provider profile of the active organization (selected in the header organization switcher). */
export function ProviderProfileView() {
  const { status, error, activeOrganization, activeContext } = useOrganizations();

  if (status === "loading" || status === "anonymous") return <LoadingState label="Loading your organizations..." />;
  if (status === "error") return <ErrorState title="Unable to load your organizations" description={error ?? undefined} />;
  if (!activeOrganization) {
    return (
      <EmptyState
        title="No active organization"
        description="Create or join a provider organization, then select it in the organization switcher."
      />
    );
  }
  if (activeOrganization.organizationType !== "PROVIDER") {
    return (
      <EmptyState
        title="Provider profiles are for provider organizations"
        description={`${activeOrganization.displayName} is a buyer organization. Switch to a provider organization to manage its profile.`}
      />
    );
  }
  if (!activeContext) return <LoadingState label="Loading your permissions..." />;

  return <ProviderWorkspace key={activeOrganization.id} context={activeContext} />;
}

function ProviderWorkspace({ context }: { context: OrganizationContext }) {
  const organizationId = context.organization.id;
  const access = {
    permissions: context.permissions,
    status: context.organization.status,
    accessVia: context.accessVia,
    hasPlatformAccess: context.hasPlatformAccess,
  };
  const can = (code: string, action: "view" | "create" | "edit") => canInOrganization(access, code, action);

  const profile = useApiResource(() => providersService.getProfile(organizationId), [organizationId]);
  const catalog = useApiResource(() => providersService.catalog(organizationId), [organizationId]);

  if (!can(P.profile, "view")) {
    return <ErrorState title="Access denied" description="Your roles in this organization do not include the provider profile." />;
  }
  if (profile.loading) return <LoadingState label="Loading provider profile..." />;

  if (profile.status === 404) {
    return can(P.profile, "create") ? (
      <SectionCard
        title={`Create the provider profile for ${context.organization.displayName}`}
        description="Describe your organization. You can add services, standards, industries and locations afterwards."
      >
        <ProviderBasicForm
          profile={null}
          submitLabel="Create profile"
          onSubmit={async (input) => {
            await providersService.createProfile(organizationId, input);
            await profile.reload();
          }}
        />
      </SectionCard>
    ) : (
      <EmptyState
        title="No provider profile yet"
        description="An organization administrator needs to create the provider profile."
      />
    );
  }
  if (profile.error || !profile.data) {
    return <ErrorState title="Unable to load the provider profile" description={profile.error ?? undefined} />;
  }

  return (
    <ProviderProfileDetails
      profile={profile.data}
      catalog={catalog.data}
      catalogError={catalog.error}
      readOnlyReason={
        context.organization.status !== "ACTIVE" && !context.hasPlatformAccess
          ? `This organization is ${context.organization.status.toLowerCase()}, so its profile is read-only.`
          : null
      }
      can={can}
      onChanged={profile.reload}
    />
  );
}

function ProviderProfileDetails({
  profile,
  catalog,
  catalogError,
  readOnlyReason,
  can,
  onChanged,
}: {
  profile: ProviderProfile;
  catalog: ProviderCatalog | null;
  catalogError: string | null;
  readOnlyReason: string | null;
  can: (code: string, action: "view" | "create" | "edit") => boolean;
  onChanged: () => Promise<void>;
}) {
  const [editingBasic, setEditingBasic] = useState(false);
  const organizationId = profile.organizationId;
  const { capabilities } = profile;

  const serviceOptions: CapabilityOption[] = (catalog?.services ?? []).map((service) => ({
    id: service.id,
    label: service.name,
    group: service.categoryPath.join(" / "),
  }));
  const standardOptions: CapabilityOption[] = (catalog?.standards ?? []).map((standard) => ({
    id: standard.id,
    label: standard.code,
    detail: [standard.name, standard.version].filter(Boolean).join(" · "),
  }));
  const industryOptions: CapabilityOption[] = (catalog?.industries ?? []).map((industry) => ({
    id: industry.id,
    label: industry.name,
    depth: industry.depth,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Provider profile</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{profile.organization.displayName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            <Link href={routes.organization(organizationId)} className="hover:text-sky-700">
              {profile.organization.legalName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">{providerTypeLabels[profile.providerType]}</Badge>
          <Badge tone={profileVerificationTones[profile.verificationStatus]}>
            {profileVerificationLabels[profile.verificationStatus]}
          </Badge>
          <Badge tone={profile.publicProfile ? "success" : "neutral"}>{profile.publicProfile ? "Public" : "Private"}</Badge>
        </div>
      </div>

      {readOnlyReason ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{readOnlyReason}</p>
      ) : null}
      {profile.publicProfile && !profile.publiclyVisible ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          The profile is marked public but is hidden because the organization is not active.
        </p>
      ) : null}
      {catalogError ? <ErrorState title="Unable to load the taxonomy catalog" description={catalogError} /> : null}

      <SectionCard
        title="Basic information"
        action={
          can(P.profile, "edit") && !editingBasic ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingBasic(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          ) : null
        }
      >
        {editingBasic ? (
          <ProviderBasicForm
            profile={profile}
            submitLabel="Save changes"
            onCancel={() => setEditingBasic(false)}
            onSubmit={async (input) => {
              await providersService.updateProfile(organizationId, input);
              setEditingBasic(false);
              await onChanged();
            }}
          />
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-[12rem_1fr]">
            <dt className="text-slate-500">Provider type</dt>
            <dd className="text-slate-900">{providerTypeLabels[profile.providerType]}</dd>
            <dt className="text-slate-500">Headline</dt>
            <dd className="text-slate-900">{profile.headline || "—"}</dd>
            <dt className="text-slate-500">Description</dt>
            <dd className="whitespace-pre-line text-slate-900">{profile.description || "—"}</dd>
            <dt className="text-slate-500">Years in business</dt>
            <dd className="text-slate-900">{profile.yearsInBusiness ?? "—"}</dd>
            <dt className="text-slate-500">Visibility</dt>
            <dd className="text-slate-900">{profile.publicProfile ? "Public (opted in)" : "Private"}</dd>
          </dl>
        )}
      </SectionCard>

      <CapabilitySection
        title="Services"
        description="Services you offer, chosen from the marketplace catalog."
        emptyText="No services added yet."
        assigned={capabilities.services.map((service) => ({
          id: service.id,
          label: service.name,
          group: service.categoryPath.join(" / "),
          inactive: !service.effectiveActive,
        }))}
        options={serviceOptions}
        canEdit={can(P.services, "edit")}
        onSave={async (ids) => {
          await providersService.replaceServices(organizationId, ids);
          await onChanged();
        }}
      />

      <CapabilitySection
        title="Standards"
        description="Standards you work with. This is a declaration, not an accreditation claim."
        emptyText="No standards added yet."
        assigned={capabilities.standards.map((standard) => ({
          id: standard.id,
          label: standard.code,
          detail: standard.name,
          inactive: !standard.effectiveActive,
        }))}
        options={standardOptions}
        canEdit={can(P.standards, "edit")}
        onSave={async (ids) => {
          await providersService.replaceStandards(organizationId, ids);
          await onChanged();
        }}
      />

      <CapabilitySection
        title="Industries"
        description="Industries you serve."
        emptyText="No industries added yet."
        assigned={capabilities.industries.map((industry) => ({
          id: industry.id,
          label: [...industry.path, industry.name].join(" / "),
          inactive: !industry.effectiveActive,
        }))}
        options={industryOptions}
        canEdit={can(P.industries, "edit")}
        onSave={async (ids) => {
          await providersService.replaceIndustries(organizationId, ids);
          await onChanged();
        }}
      />

      <LocationsSection
        assigned={capabilities.locations}
        catalog={catalog?.locations ?? []}
        canEdit={can(P.locations, "edit")}
        onSave={async (locations) => {
          await providersService.replaceLocations(organizationId, locations);
          await onChanged();
        }}
      />
    </div>
  );
}
