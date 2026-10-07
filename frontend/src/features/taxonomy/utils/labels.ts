import type { CategoryType, LocationLevel } from "../types";

export const CATEGORY_TYPES: CategoryType[] = ["CERTIFICATION", "TESTING", "INSPECTION", "CONSULTING", "OTHER"];

export const categoryTypeLabels: Record<CategoryType, string> = {
  CERTIFICATION: "Certification",
  TESTING: "Testing",
  INSPECTION: "Inspection",
  CONSULTING: "Consulting",
  OTHER: "Other",
};

export const locationLevelLabels: Record<LocationLevel, string> = {
  COUNTRY: "Country-wide",
  STATE: "State-wide",
  CITY: "City",
};
