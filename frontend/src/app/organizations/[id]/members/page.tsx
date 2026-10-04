"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus } from "lucide-react";

import { Container } from "@/components/common/container";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmRequest } from "@/features/organizations/components/confirm-dialog";
import { InviteMemberDialog } from "@/features/organizations/components/invite-member-dialog";
import { MemberRolesDialog } from "@/features/organizations/components/member-roles-dialog";
import { MembersTable } from "@/features/organizations/components/members-table";
import { OrganizationAccessError, OrganizationPageHeader } from "@/features/organizations/components/organization-page-header";
import { PendingInvitations } from "@/features/organizations/components/pending-invitations";
import {
  useCompatibleRoles,
  useOrganizationDetails,
  useOrganizationMembers,
  usePendingInvitations,
} from "@/features/organizations/hooks/use-organization-data";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { organizationsService } from "@/features/organizations/services/organizations.service";
import type { OrganizationDetails, OrganizationMember } from "@/features/organizations/types";
import { fullName } from "@/features/organizations/utils/labels";
import { canInOrganization, ORGANIZATION_FUNCTIONALITIES as F } from "@/features/organizations/utils/permissions";

function MembersView({ organization, onOrganizationChanged }: { organization: OrganizationDetails; onOrganizationChanged: () => void }) {
  const { me, refresh } = useOrganizations();
  const access = {
    permissions: organization.permissions,
    status: organization.status,
    accessVia: organization.accessVia,
    hasPlatformAccess: organization.hasPlatformAccess,
  };
  const canInvite = canInOrganization(access, F.members, "create");
  const canAssignRoles = canInOrganization(access, F.memberRoles, "create");
  const canRemoveRoles = canInOrganization(access, F.memberRoles, "delete");

  const [includeRemoved, setIncludeRemoved] = useState(false);
  const members = useOrganizationMembers(organization.id, includeRemoved);
  const roles = useCompatibleRoles(organization.id, canInvite || canAssignRoles || canRemoveRoles);
  const invitations = usePendingInvitations(organization.id, canInvite);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [rolesMember, setRolesMember] = useState<OrganizationMember | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const reloadMembers = () => void members.reload();

  const handlers = {
    onManageRoles: setRolesMember,
    onSuspend: (member: OrganizationMember) =>
      setConfirm({
        title: `Suspend ${fullName(member.user)}?`,
        description: "Suspended members keep their roles but cannot access or act in this organization until reactivated.",
        confirmLabel: "Suspend member",
        destructive: true,
        action: async () => {
          await organizationsService.setMemberStatus(organization.id, member.id, "SUSPENDED");
          reloadMembers();
        },
      }),
    onReactivate: (member: OrganizationMember) =>
      setConfirm({
        title: `Reactivate ${fullName(member.user)}?`,
        description: "They will regain access with the roles they currently hold.",
        confirmLabel: "Reactivate",
        action: async () => {
          await organizationsService.setMemberStatus(organization.id, member.id, "ACTIVE");
          reloadMembers();
        },
      }),
    onRemove: (member: OrganizationMember) =>
      setConfirm({
        title: `Remove ${fullName(member.user)}?`,
        description:
          "Their roles are revoked and they lose access immediately. The membership record is kept for audit purposes.",
        confirmLabel: "Remove member",
        destructive: true,
        action: async () => {
          await organizationsService.removeMember(organization.id, member.id);
          reloadMembers();
          void invitations.reload();
        },
      }),
    onTransferOwnership: (member: OrganizationMember) =>
      setConfirm({
        title: `Make ${fullName(member.user)} the owner?`,
        description: organization.membership?.isOwner
          ? "You will no longer be an owner. Your roles stay the same."
          : "Current owners will be replaced by this member.",
        confirmLabel: "Transfer ownership",
        action: async () => {
          await organizationsService.transferOwnership(organization.id, member.id);
          reloadMembers();
          onOrganizationChanged();
          void refresh();
        },
      }),
  };

  return (
    <div className="mt-8 space-y-8">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Members</h2>
            <p className="text-sm text-slate-600">Removed members are hidden unless you choose to show them.</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={includeRemoved}
                onChange={(event) => setIncludeRemoved(event.target.checked)}
              />
              Show removed
            </label>
            {canInvite ? (
              <Button type="button" onClick={() => setInviteOpen(true)} disabled={!roles.data}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Invite member
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          {members.loading ? (
            <LoadingState label="Loading members..." />
          ) : members.error ? (
            <ErrorState title="Unable to load members" description={members.error} />
          ) : (
            <MembersTable
              organization={organization}
              members={members.data ?? []}
              currentUserId={me?.user.id}
              handlers={handlers}
            />
          )}
        </div>
      </section>

      {canInvite ? (
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Pending invitations</h2>
          <div className="mt-4">
            {invitations.error ? (
              <ErrorState title="Unable to load invitations" description={invitations.error} />
            ) : (
              <PendingInvitations
                invitations={invitations.data ?? []}
                canCancel={canInvite}
                onCancel={(invitation) =>
                  setConfirm({
                    title: `Cancel the invitation for ${invitation.email}?`,
                    description: "The invitation link will stop working.",
                    confirmLabel: "Cancel invitation",
                    destructive: true,
                    action: async () => {
                      await organizationsService.cancelInvitation(organization.id, invitation.id);
                      void invitations.reload();
                      reloadMembers();
                    },
                  })
                }
              />
            )}
          </div>
        </section>
      ) : null}

      <InviteMemberDialog
        open={inviteOpen}
        organizationId={organization.id}
        organizationName={organization.displayName}
        roles={roles.data ?? []}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {
          void invitations.reload();
          reloadMembers();
        }}
      />

      {rolesMember ? (
        <MemberRolesDialog
          key={rolesMember.id}
          organizationId={organization.id}
          member={rolesMember}
          roles={roles.data ?? []}
          canAssign={canAssignRoles}
          canRemove={canRemoveRoles}
          onClose={() => setRolesMember(null)}
          onChanged={reloadMembers}
        />
      ) : null}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function OrganizationMembers({ organizationId }: { organizationId: string }) {
  const { data: organization, error, status, loading, reload } = useOrganizationDetails(organizationId);

  if (loading) return <LoadingState label="Loading organization..." />;
  if (error || !organization) return <OrganizationAccessError status={status} message={error ?? "Unknown error"} />;

  return (
    <>
      <OrganizationPageHeader organization={organization} />
      <MembersView organization={organization} onOrganizationChanged={() => void reload()} />
    </>
  );
}

export default function OrganizationMembersPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Container className="py-10">
      <OrganizationMembers key={id} organizationId={id} />
    </Container>
  );
}
