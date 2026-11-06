"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";

import { Container } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Badge } from "@/components/ui/badge";
import { useApiResource } from "@/features/organizations/hooks/use-api-resource";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import type { OrganizationContext } from "@/features/organizations/types";
import { canInOrganization, PROVIDER_FUNCTIONALITIES as P } from "@/features/organizations/utils/permissions";
import { routes } from "@/lib/constants";

import { providersService } from "../services/providers.service";
import type { ProviderCatalog, ProviderProfile } from "../types";
import { formatProviderTypes, profileVerificationLabels, profileVerificationTones } from "../utils/labels";
import { CapabilitySection, SectionCard, type CapabilityOption } from "./capability-section";
import { LocationsSection } from "./locations-section";
import { ProviderBasicForm } from "./provider-basic-form";

const GHOST_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#EADFCF] bg-white px-3 py-2 text-sm font-semibold text-[#0F4C5C] transition hover:border-[#7CC0C8] hover:bg-[#E8F4F5]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]";

function ProfileShell({
  title,
  description,
  extra,
  children,
}: {
  title: string;
  description?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
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
            <Link href={routes.providerDashboard} className="transition hover:text-white">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-white/90">Profile</span>
          </nav>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Provider profile</p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
              {description ? <div className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">{description}</div> : null}
            </div>
            {extra ? <div className="flex flex-wrap gap-2">{extra}</div> : null}
          </div>
        </Container>
      </section>
      <Container className="py-8 md:py-10">{children}</Container>
    </>
  );
}

/** Provider profile of the active organization (selected in the header organization switcher). */
export function ProviderProfileView() {
  const { status, error, activeOrganization, activeContext } = useOrganizations();

  if (status === "loading" || status === "anonymous") {
    return (
      <ProfileShell title="Provider profile" description="Loading the organization selected in the header.">
        <LoadingState label="Loading your organizations..." />
      </ProfileShell>
    );
  }
  if (status === "error") {
    return (
      <ProfileShell title="Provider profile">
        <ErrorState title="Unable to load your organizations" description={error ?? undefined} />
      </ProfileShell>
    );
  }
  if (!activeOrganization) {
    return (
      <ProfileShell title="Provider profile" description="Select a provider organization to manage its public profile.">
        <EmptyState
          title="No active organization"
          description="Create or join a provider organization, then select it in the organization switcher."
        />
      </ProfileShell>
    );
  }
  if (activeOrganization.organizationType !== "PROVIDER") {
    return (
      <ProfileShell title={activeOrganization.displayName} description="This workspace is a buyer organization.">
        <EmptyState
          title="Provider profiles are for provider organizations"
          description={`${activeOrganization.displayName} is a buyer organization. Switch to a provider organization to manage its profile.`}
        />
      </ProfileShell>
    );
  }
  if (!activeContext) {
    return (
      <ProfileShell title={activeOrganization.displayName}>
        <LoadingState label="Loading your permissions..." />
      </ProfileShell>
    );
  }

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
    return (
      <ProfileShell title={context.organization.displayName}>
        <ErrorState title="Access denied" description="Your roles in this organization do not include the provider profile." />
      </ProfileShell>
    );
  }
  if (profile.loading) {
    return (
      <ProfileShell title={context.organization.displayName}>
        <LoadingState label="Loading provider profile..." />
      </ProfileShell>
    );
  }

  if (profile.status === 404) {
    return (
      <ProfileShell
        title={context.organization.displayName}
        description="Describe your organization. You can add services, standards, industries and locations afterwards."
      >
        {can(P.profile, "create") ? (
          <SectionCard
            title="Create the provider profile"
            description="This profile is what buyers see after you opt in to the public marketplace."
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
        )}
      </ProfileShell>
    );
  }
  if (profile.error || !profile.data) {
    return (
      <ProfileShell title={context.organization.displayName}>
        <ErrorState title="Unable to load the provider profile" description={profile.error ?? undefined} />
      </ProfileShell>
    );
  }

  const data = profile.data;
  return (
    <ProfileShell
      title={data.organization.displayName}
      description={
        <Link href={routes.organization(data.organizationId)} className="hover:text-white">
          {data.organization.legalName}
        </Link>
      }
      extra={
        <>
          <Badge tone="info">{formatProviderTypes(data.providerTypes)}</Badge>
          <Badge tone={profileVerificationTones[data.verificationStatus]}>
            {profileVerificationLabels[data.verificationStatus]}
          </Badge>
          <Badge tone={data.publicProfile ? "success" : "neutral"}>{data.publicProfile ? "Public" : "Private"}</Badge>
        </>
      }
    >
      <ProviderProfileDetails
        profile={data}
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
    </ProfileShell>
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
            <button type="button" className={GHOST_BTN} onClick={() => setEditingBasic(true)}>
              <Pencil className="h-4 w-4" aria-hidden />
              Edit
            </button>
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
            <dt className="text-[#5A6A6F]">Provider type</dt>
            <dd className="text-[#12303A]">{formatProviderTypes(profile.providerTypes)}</dd>
            <dt className="text-[#5A6A6F]">Headline</dt>
            <dd className="text-[#12303A]">{profile.headline || "—"}</dd>
            <dt className="text-[#5A6A6F]">Description</dt>
            <dd className="whitespace-pre-line text-[#12303A]">{profile.description || "—"}</dd>
            <dt className="text-[#5A6A6F]">Years in business</dt>
            <dd className="text-[#12303A]">{profile.yearsInBusiness ?? "—"}</dd>
            <dt className="text-[#5A6A6F]">Visibility</dt>
            <dd className="text-[#12303A]">{profile.publicProfile ? "Public (opted in)" : "Private"}</dd>
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
