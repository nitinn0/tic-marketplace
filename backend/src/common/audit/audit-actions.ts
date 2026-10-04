export const AUDIT_ACTIONS = {
  organizationCreated: 'ORGANIZATION_CREATED',
  organizationUpdated: 'ORGANIZATION_UPDATED',
  organizationStatusChanged: 'ORGANIZATION_STATUS_CHANGED',
  organizationContextSwitched: 'ORGANIZATION_CONTEXT_SWITCHED',
  memberInvited: 'ORGANIZATION_MEMBER_INVITED',
  invitationCancelled: 'ORGANIZATION_INVITATION_CANCELLED',
  memberAccepted: 'ORGANIZATION_MEMBER_ACCEPTED',
  memberSuspended: 'ORGANIZATION_MEMBER_SUSPENDED',
  memberReactivated: 'ORGANIZATION_MEMBER_REACTIVATED',
  memberRemoved: 'ORGANIZATION_MEMBER_REMOVED',
  memberLeft: 'ORGANIZATION_MEMBER_LEFT',
  roleAssigned: 'ORGANIZATION_ROLE_ASSIGNED',
  roleRemoved: 'ORGANIZATION_ROLE_REMOVED',
  ownershipTransferred: 'ORGANIZATION_OWNERSHIP_TRANSFERRED',
} as const;

export const AUDIT_ENTITIES = {
  organization: 'organization',
  organizationMember: 'organization_user',
  organizationMemberRole: 'organization_user_role',
  organizationInvitation: 'organization_invitation',
} as const;
