import { Crown } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type {
  InvitationStatus,
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
  OrganizationVerificationStatus,
} from "../types";
import {
  invitationTones,
  membershipTones,
  organizationStatusTones,
  organizationTypeLabels,
  titleCase,
  verificationTones,
} from "../utils/labels";

export function OrganizationTypeBadge({ type }: { type: OrganizationType }) {
  return <Badge tone={type === "PROVIDER" ? "info" : "neutral"}>{organizationTypeLabels[type]}</Badge>;
}

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  return <Badge tone={organizationStatusTones[status]}>{titleCase(status)}</Badge>;
}

export function VerificationBadge({ status }: { status: OrganizationVerificationStatus }) {
  return <Badge tone={verificationTones[status]}>{status === "PENDING" ? "Verification pending" : titleCase(status)}</Badge>;
}

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  return <Badge tone={membershipTones[status]}>{titleCase(status)}</Badge>;
}

export function InvitationBadge({ status }: { status: InvitationStatus }) {
  return <Badge tone={invitationTones[status]}>{titleCase(status)}</Badge>;
}

export function OwnerBadge() {
  return (
    <Badge tone="warning">
      <Crown className="h-3 w-3" aria-hidden="true" />
      Owner
    </Badge>
  );
}
