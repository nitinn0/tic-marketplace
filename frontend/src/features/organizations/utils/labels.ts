import type {
  InvitationStatus,
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
  OrganizationVerificationStatus,
} from "../types";

export const organizationTypeLabels: Record<OrganizationType, string> = {
  BUYER: "Buyer",
  PROVIDER: "Provider",
};

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export const organizationStatusTones: Record<OrganizationStatus, BadgeTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "danger",
};

export const verificationTones: Record<OrganizationVerificationStatus, BadgeTone> = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
};

export const membershipTones: Record<MembershipStatus, BadgeTone> = {
  INVITED: "info",
  ACTIVE: "success",
  SUSPENDED: "warning",
  REMOVED: "neutral",
};

export const invitationTones: Record<InvitationStatus, BadgeTone> = {
  PENDING: "info",
  ACCEPTED: "success",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
};

export function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function fullName(user: { firstName: string; lastName: string; email?: string }) {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email || "Unknown user";
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
