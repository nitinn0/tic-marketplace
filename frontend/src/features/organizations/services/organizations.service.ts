import { api } from "@/lib/api";

import type {
  AcceptInvitationResult,
  CompatibleRole,
  CreateOrganizationInput,
  InvitationPreview,
  InviteMemberResult,
  MeResponse,
  OrganizationContext,
  OrganizationDetails,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationSummary,
  RoleSummary,
  UpdateOrganizationInput,
} from "../types";

const base = (organizationId: string) => `/organizations/${encodeURIComponent(organizationId)}`;
const member = (organizationId: string, memberId: string) =>
  `${base(organizationId)}/members/${encodeURIComponent(memberId)}`;

export const organizationsService = {
  me: () => api.get<MeResponse>("/auth/me"),

  list: () => api.get<OrganizationSummary[]>("/organizations"),
  get: (organizationId: string) => api.get<OrganizationDetails>(base(organizationId)),
  create: (input: CreateOrganizationInput) => api.post<OrganizationDetails>("/organizations", input),
  update: (organizationId: string, input: UpdateOrganizationInput) =>
    api.patch<OrganizationDetails>(base(organizationId), input),

  switch: (organizationId: string) => api.post<OrganizationContext>(`${base(organizationId)}/switch`),
  context: (organizationId: string) => api.get<OrganizationContext>(`${base(organizationId)}/permissions`),
  leave: (organizationId: string) => api.post<{ success: boolean }>(`${base(organizationId)}/leave`),
  compatibleRoles: (organizationId: string) => api.get<CompatibleRole[]>(`${base(organizationId)}/roles`),

  members: (organizationId: string, includeRemoved = false) =>
    api.get<OrganizationMember[]>(`${base(organizationId)}/members${includeRemoved ? "?includeRemoved=true" : ""}`),
  invite: (organizationId: string, input: { email: string; roleId: string }) =>
    api.post<InviteMemberResult>(`${base(organizationId)}/members/invite`, input),
  setMemberStatus: (organizationId: string, memberId: string, membershipStatus: "ACTIVE" | "SUSPENDED") =>
    api.patch<OrganizationMember>(member(organizationId, memberId), { membershipStatus }),
  removeMember: (organizationId: string, memberId: string) =>
    api.delete<{ success: boolean }>(member(organizationId, memberId)),
  transferOwnership: (organizationId: string, memberId: string) =>
    api.post<OrganizationMember[]>(`${member(organizationId, memberId)}/transfer-ownership`),
  assignRole: (organizationId: string, memberId: string, roleId: string) =>
    api.post<RoleSummary[]>(`${member(organizationId, memberId)}/roles`, { roleId }),
  removeRole: (organizationId: string, memberId: string, roleId: string) =>
    api.delete<RoleSummary[]>(`${member(organizationId, memberId)}/roles/${encodeURIComponent(roleId)}`),

  invitations: (organizationId: string) => api.get<OrganizationInvitation[]>(`${base(organizationId)}/invitations`),
  cancelInvitation: (organizationId: string, invitationId: string) =>
    api.delete<{ success: boolean }>(`${base(organizationId)}/invitations/${encodeURIComponent(invitationId)}`),
  previewInvitation: (token: string) => api.post<InvitationPreview>("/organization-invitations/preview", { token }),
  acceptInvitation: (token: string) => api.post<AcceptInvitationResult>("/organization-invitations/accept", { token }),
};
