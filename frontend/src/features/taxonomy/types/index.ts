export type CategoryType = "CERTIFICATION" | "TESTING" | "INSPECTION" | "CONSULTING" | "OTHER";
export type LocationLevel = "COUNTRY" | "STATE" | "CITY";

export type PathEntry = { id: string; name: string };

type Timestamps = { createdAt: string; updatedAt: string };

export type TaxonomyCategory = Timestamps & {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  categoryType: CategoryType;
  active: boolean;
  /** False when the category or any ancestor is inactive. */
  effectiveActive: boolean;
  sortOrder: number;
  depth: number;
  path: PathEntry[];
  childCount: number;
  serviceCount: number;
};

export type TaxonomyService = Timestamps & {
  id: string;
  categoryId: string;
  category: { id: string; name: string; slug: string; categoryType: CategoryType; active: boolean } | null;
  categoryPath: string[];
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  effectiveActive: boolean;
  sortOrder: number;
  providerCount: number;
};

export type TaxonomyStandard = Timestamps & {
  id: string;
  code: string;
  name: string;
  version: string | null;
  description: string | null;
  active: boolean;
  providerCount: number;
};

export type TaxonomyIndustry = Timestamps & {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  effectiveActive: boolean;
  sortOrder: number;
  depth: number;
  path: PathEntry[];
  childCount: number;
  providerCount: number;
};

export type TaxonomyLocation = Timestamps & {
  id: string;
  countryCode: string;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  level: LocationLevel;
  label: string;
  active: boolean;
  latitude: number | null;
  longitude: number | null;
  providerCount: number;
};

export type DeleteOutcome = { id: string; deleted: boolean; deactivated: boolean };

export type ActiveFilter = "all" | "active" | "inactive";

export type CategoryInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  categoryType?: CategoryType;
  parentId?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export type ServiceInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  categoryId?: string;
  active?: boolean;
  sortOrder?: number;
};

export type StandardInput = {
  code?: string;
  name?: string;
  version?: string | null;
  description?: string | null;
  active?: boolean;
};

export type IndustryInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export type LocationInput = {
  countryCode?: string;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  active?: boolean;
};
