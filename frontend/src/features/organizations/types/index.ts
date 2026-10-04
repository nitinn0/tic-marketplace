export type OrganizationType = "BUYER" | "PROVIDER";
export type OrganizationStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type OrganizationVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type MembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "REMOVED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
export type AccessVia = "MEMBERSHIP" | "PLATFORM";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "configure";

export type PermissionEntry = {
  functionalityCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canConfigure: boolean;
};

export type RoleSummary = { id: string; code: string; name: string };

export type UserSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status?: string;
};

/** Shape of an entry in GET /auth/me `organizations`. */
export type UserOrganization = {
  id: string;
  displayName: string;
  organizationType: OrganizationType;
  status: OrganizationStatus;
  membershipStatus: MembershipStatus;
  isOwner: boolean;
  roles: RoleSummary[];
};

export type MeResponse = {
  user: UserSummary & { phone?: string | null };
  globalRoles: RoleSummary[];
  /** @deprecated use globalRoles */
  roles: RoleSummary[];
  permissions: PermissionEntry[];
  organizations: UserOrganization[];
  activeOrganizationId: string | null;
};

export type MembershipSummary = {
  id: string;
  membershipStatus: MembershipStatus;
  isOwner: boolean;
  joinedAt: string | null;
};

export type OrganizationSummary = {
  id: string;
  legalName: string;
  displayName: string;
  organizationType: OrganizationType;
  status: OrganizationStatus;
  verificationStatus: OrganizationVerificationStatus;
  countryCode: string | null;
  website: string | null;
  createdAt: string;
  memberCount: number;
  membership: (MembershipSummary & { roles: RoleSummary[] }) | null;
};

export type OrganizationProfile = {
  id: string;
  legalName: string;
  displayName: string;
  organizationType: OrganizationType;
  registrationNumber: string | null;
  taxId: string | null;
  website: string | null;
  description: string | null;
  countryCode: string | null;
  status: OrganizationStatus;
  verificationStatus: OrganizationVerificationStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationDetails = OrganizationProfile & {
  memberCount: number;
  membership: (MembershipSummary & { roles: RoleSummary[] }) | null;
  accessVia: AccessVia;
  hasPlatformAccess: boolean;
  permissions: PermissionEntry[];
};

/** The caller's effective access inside one organization. */
export type OrganizationContext = {
  organization: Pick<OrganizationProfile, "id" | "displayName" | "organizationType" | "status">;
  membership: MembershipSummary | null;
  roles: RoleSummary[];
  accessVia: AccessVia;
  hasPlatformAccess: boolean;
  permissions: PermissionEntry[];
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  user: UserSummary;
  membershipStatus: MembershipStatus;
  isOwner: boolean;
  joinedAt: string | null;
  invitedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Array<RoleSummary & { assignedAt: string }>;
};

export type CompatibleRole = RoleSummary & {
  description: string | null;
  organizationType: OrganizationType;
  assignable: boolean;
};

export type OrganizationInvitation = {
  id: string;
  organizationId: string;
  email: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  role: RoleSummary;
  invitedBy: UserSummary | null;
};

export type InviteMemberResult = {
  invitation: OrganizationInvitation;
  emailDelivered: boolean;
  /** Only returned outside production so the flow can be completed without an email provider. */
  devAcceptUrl?: string;
  devToken?: string;
};

export type InvitationPreview = {
  email: string;
  status: InvitationStatus;
  expiresAt: string;
  organization: { displayName: string; organizationType: OrganizationType };
  role: { name: string };
  invitedBy: { firstName: string; lastName: string } | null;
};

export type AcceptInvitationResult = {
  organization: { id: string; displayName: string; organizationType: OrganizationType };
  membership: MembershipSummary;
  role: RoleSummary;
};

export type CreateOrganizationInput = {
  legalName: string;
  displayName: string;
  organizationType: OrganizationType;
  registrationNumber?: string;
  taxId?: string;
  website?: string;
  description?: string;
  countryCode?: string;
};

export type UpdateOrganizationInput = Partial<Omit<CreateOrganizationInput, "organizationType">> & {
  status?: OrganizationStatus;
};
