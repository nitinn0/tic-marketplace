import type { BadgeTone } from "@/features/organizations/utils/labels";

import type { AvailabilityStatus, ProfessionalType } from "../types";

export const PROFESSIONAL_TYPES: ProfessionalType[] = [
  "CONSULTANT",
  "LEAD_AUDITOR",
  "LEAD_VERIFIER",
  "INSPECTOR",
  "TECHNICAL_EXPERT",
  "OTHER",
];

export const professionalTypeLabels: Record<ProfessionalType, string> = {
  CONSULTANT: "Consultant",
  LEAD_AUDITOR: "Lead auditor",
  LEAD_VERIFIER: "Lead verifier",
  INSPECTOR: "Inspector",
  TECHNICAL_EXPERT: "Technical expert",
  OTHER: "Other",
};

export const AVAILABILITY_STATUSES: AvailabilityStatus[] = ["AVAILABLE", "PARTIALLY_AVAILABLE", "UNAVAILABLE"];

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  AVAILABLE: "Available",
  PARTIALLY_AVAILABLE: "Partially available",
  UNAVAILABLE: "Unavailable",
};

export const availabilityTones: Record<AvailabilityStatus, BadgeTone> = {
  AVAILABLE: "success",
  PARTIALLY_AVAILABLE: "warning",
  UNAVAILABLE: "neutral",
};

export function formatMonth(value: string | null) {
  if (!value) return "Present";
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
