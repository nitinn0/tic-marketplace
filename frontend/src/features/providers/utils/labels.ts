import type { BadgeTone } from "@/features/organizations/utils/labels";

import type { CoverageType, ProfileVerificationStatus, ProviderType } from "../types";

export const PROVIDER_TYPES: ProviderType[] = ["CERTIFICATION_BODY", "TESTING_LAB", "INSPECTION_COMPANY", "CONSULTANCY", "OTHER"];

export const providerTypeLabels: Record<ProviderType, string> = {
  CERTIFICATION_BODY: "Certification body",
  TESTING_LAB: "Testing laboratory",
  INSPECTION_COMPANY: "Inspection company",
  CONSULTANCY: "Consultancy",
  OTHER: "Other",
};

export const COVERAGE_TYPES: CoverageType[] = ["LOCAL", "REGIONAL", "NATIONAL", "INTERNATIONAL"];

export const coverageTypeLabels: Record<CoverageType, string> = {
  LOCAL: "Local",
  REGIONAL: "Regional",
  NATIONAL: "National",
  INTERNATIONAL: "International",
};

export const profileVerificationLabels: Record<ProfileVerificationStatus, string> = {
  PENDING: "Verification pending",
  VERIFIED: "Verified",
  REJECTED: "Verification rejected",
};

export const profileVerificationTones: Record<ProfileVerificationStatus, BadgeTone> = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
};
