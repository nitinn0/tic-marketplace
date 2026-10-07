import type { OrganizationStatus, OrganizationType } from "@/features/organizations/types";
import type { CategoryType, LocationLevel } from "@/features/taxonomy/types";

export type ProviderType = "CERTIFICATION_BODY" | "TESTING_LAB" | "INSPECTION_COMPANY" | "CONSULTANCY" | "OTHER";
export type CoverageType = "LOCAL" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL";
export type ProfileVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

type Assigned = { active: boolean; effectiveActive: boolean; assignedAt: string };

export type ProviderServiceItem = Assigned & {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string; categoryType: CategoryType } | null;
  categoryPath: string[];
};

export type ProviderStandardItem = Assigned & {
  id: string;
  code: string;
  name: string;
  version: string | null;
};

export type ProviderIndustryItem = Assigned & {
  id: string;
  name: string;
  slug: string;
  path: string[];
};

export type LocationSummary = {
  id: string;
  countryCode: string;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  level: LocationLevel;
  label: string;
  active: boolean;
};

export type ProviderLocationItem = LocationSummary & Assigned & { coverageType: CoverageType | null };

export type ProviderCapabilities = {
  services: ProviderServiceItem[];
  standards: ProviderStandardItem[];
  industries: ProviderIndustryItem[];
  locations: ProviderLocationItem[];
};

export type ProviderProfile = {
  id: string;
  organizationId: string;
  organization: {
    id: string;
    legalName: string;
    displayName: string;
    organizationType: OrganizationType;
    status: OrganizationStatus;
  };
  providerType: ProviderType;
  headline: string | null;
  description: string | null;
  yearsInBusiness: number | null;
  verificationStatus: ProfileVerificationStatus;
  verifiedAt: string | null;
  publicProfile: boolean;
  /** Whether the public visibility rule currently allows showing the profile publicly. */
  publiclyVisible: boolean;
  createdAt: string;
  updatedAt: string;
  capabilities: ProviderCapabilities;
};

export type ProviderProfileInput = {
  providerType?: ProviderType;
  headline?: string | null;
  description?: string | null;
  yearsInBusiness?: number | null;
  publicProfile?: boolean;
};

export type ProviderCatalog = {
  services: Array<{
    id: string;
    name: string;
    slug: string;
    category: { id: string; name: string; categoryType: CategoryType };
    categoryPath: string[];
  }>;
  standards: Array<{ id: string; code: string; name: string; version: string | null }>;
  industries: Array<{ id: string; parentId: string | null; name: string; slug: string; depth: number; path: string[] }>;
  locations: LocationSummary[];
};

export type LocationSelection = { locationId: string; coverageType: CoverageType | null };
