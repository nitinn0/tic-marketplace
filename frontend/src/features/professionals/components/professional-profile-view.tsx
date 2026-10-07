"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useApiResource } from "@/features/organizations/hooks/use-api-resource";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import type { PermissionEntry } from "@/features/organizations/types";
import { hasPermission, PROFESSIONAL_FUNCTIONALITIES as P } from "@/features/organizations/utils/permissions";
import { SectionCard } from "@/features/providers/components/capability-section";
import { profileVerificationLabels, profileVerificationTones } from "@/features/providers/utils/labels";

import { professionalsService } from "../services/professionals.service";
import type { AvailabilityStatus, ProfessionalProfile } from "../types";
import { AVAILABILITY_STATUSES, availabilityLabels, availabilityTones, professionalTypeLabels } from "../utils/labels";
import { ExperienceSection } from "./experience-section";
import { ProfessionalBasicForm } from "./professional-basic-form";

/** The signed-in user's own professional profile. User-level: no organization is involved. */
export function ProfessionalProfileView() {
  const { status, error, me } = useOrganizations();

  if (status === "loading" || status === "anonymous") return <LoadingState label="Loading your account..." />;
  if (status === "error" || !me) return <ErrorState title="Unable to load your account" description={error ?? undefined} />;
  if (!hasPermission(me.permissions, P.profile, "view")) {
    return (
      <EmptyState
        title="Professional profiles are not enabled for your account"
        description="An administrator can grant you the Professional role to create an individual expert profile."
      />
    );
  }

  return <ProfessionalWorkspace permissions={me.permissions} />;
}

function ProfessionalWorkspace({ permissions }: { permissions: PermissionEntry[] }) {
  const profile = useApiResource(() => professionalsService.getProfile(), []);
  const can = (code: string, action: "create" | "edit" | "delete") => hasPermission(permissions, code, action);

  if (profile.loading) return <LoadingState label="Loading your professional profile..." />;
  if (profile.status === 404) {
    return can(P.profile, "create") ? (
      <SectionCard title="Create your professional profile" description="Tell buyers and providers about your expertise.">
        <ProfessionalBasicForm
          profile={null}
          submitLabel="Create profile"
          onSubmit={async (input) => {
            await professionalsService.createProfile(input);
            await profile.reload();
          }}
        />
      </SectionCard>
    ) : (
      <EmptyState title="No professional profile yet" description="Your roles do not allow creating a professional profile." />
    );
  }
  if (profile.error || !profile.data) {
    return <ErrorState title="Unable to load your professional profile" description={profile.error ?? undefined} />;
  }

  return (
    <ProfessionalProfileDetails
      profile={profile.data}
      canEditProfile={can(P.profile, "edit")}
      experiencePermissions={{
        canCreate: can(P.experience, "create"),
        canEdit: can(P.experience, "edit"),
        canDelete: can(P.experience, "delete"),
      }}
      onChanged={profile.reload}
    />
  );
}

function ProfessionalProfileDetails({
  profile,
  canEditProfile,
  experiencePermissions,
  onChanged,
}: {
  profile: ProfessionalProfile;
  canEditProfile: boolean;
  experiencePermissions: { canCreate: boolean; canEdit: boolean; canDelete: boolean };
  onChanged: () => Promise<void>;
}) {
  const [editingBasic, setEditingBasic] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Professional profile</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{profile.headline || professionalTypeLabels[profile.professionalType]}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">{professionalTypeLabels[profile.professionalType]}</Badge>
          <Badge tone={availabilityTones[profile.availabilityStatus]}>{availabilityLabels[profile.availabilityStatus]}</Badge>
          <Badge tone={profileVerificationTones[profile.verificationStatus]}>
            {profileVerificationLabels[profile.verificationStatus]}
          </Badge>
          <Badge tone={profile.publicProfile ? "success" : "neutral"}>{profile.publicProfile ? "Public" : "Private"}</Badge>
        </div>
      </div>

      {profile.publicProfile && !profile.publiclyVisible ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          The profile is marked public but is hidden because your account is not active.
        </p>
      ) : null}

      <SectionCard
        title="Basic information"
        action={
          canEditProfile && !editingBasic ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingBasic(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          ) : null
        }
      >
        {editingBasic ? (
          <ProfessionalBasicForm
            profile={profile}
            submitLabel="Save changes"
            onCancel={() => setEditingBasic(false)}
            onSubmit={async (input) => {
              await professionalsService.updateProfile(input);
              setEditingBasic(false);
              await onChanged();
            }}
          />
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-[12rem_1fr]">
            <dt className="text-slate-500">Professional type</dt>
            <dd className="text-slate-900">{professionalTypeLabels[profile.professionalType]}</dd>
            <dt className="text-slate-500">Headline</dt>
            <dd className="text-slate-900">{profile.headline || "—"}</dd>
            <dt className="text-slate-500">Bio</dt>
            <dd className="whitespace-pre-line text-slate-900">{profile.bio || "—"}</dd>
            <dt className="text-slate-500">Years of experience</dt>
            <dd className="text-slate-900">{profile.yearsExperience ?? "—"}</dd>
            <dt className="text-slate-500">Visibility</dt>
            <dd className="text-slate-900">{profile.publicProfile ? "Public (opted in)" : "Private"}</dd>
          </dl>
        )}
      </SectionCard>

      <ExperienceSection experience={profile.experience} onChanged={onChanged} {...experiencePermissions} />

      <AvailabilitySection status={profile.availabilityStatus} canEdit={canEditProfile} onChanged={onChanged} />
    </div>
  );
}

function AvailabilitySection({
  status,
  canEdit,
  onChanged,
}: {
  status: AvailabilityStatus;
  canEdit: boolean;
  onChanged: () => Promise<void>;
}) {
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await professionalsService.updateProfile({ availabilityStatus: value });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update availability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Availability" description="Let others know whether you are taking on new engagements.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          aria-label="Availability"
          className="sm:w-64"
          disabled={!canEdit}
          value={value}
          onChange={(event) => setValue(event.target.value as AvailabilityStatus)}
        >
          {AVAILABILITY_STATUSES.map((option) => (
            <option key={option} value={option}>
              {availabilityLabels[option]}
            </option>
          ))}
        </Select>
        {canEdit ? (
          <Button type="button" onClick={() => void save()} disabled={saving || value === status}>
            {saving ? "Saving..." : "Update availability"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
