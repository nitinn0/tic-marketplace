import { api } from "@/lib/api";

import type {
  ActiveFilter,
  CategoryInput,
  DeleteOutcome,
  IndustryInput,
  LocationInput,
  ServiceInput,
  StandardInput,
  TaxonomyCategory,
  TaxonomyIndustry,
  TaxonomyLocation,
  TaxonomyService,
  TaxonomyStandard,
} from "../types";

export type ListParams = { search?: string; active?: ActiveFilter } & Record<string, string | undefined>;

function query(params: ListParams = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    if (key === "active") {
      if (value !== "all") search.set("active", value === "active" ? "true" : "false");
    } else {
      search.set(key, value);
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

function resource<T, I>(path: string) {
  const item = (id: string) => `${path}/${encodeURIComponent(id)}`;
  return {
    list: (params?: ListParams) => api.get<T[]>(`${path}${query(params)}`),
    create: (input: I) => api.post<T>(path, input),
    update: (id: string, input: I) => api.patch<T>(item(id), input),
    /** Referenced records are deactivated instead of deleted; the outcome says which happened. */
    remove: (id: string) => api.delete<DeleteOutcome>(item(id)),
  };
}

export const taxonomyService = {
  categories: resource<TaxonomyCategory, CategoryInput>("/taxonomy/categories"),
  services: resource<TaxonomyService, ServiceInput>("/taxonomy/services"),
  standards: resource<TaxonomyStandard, StandardInput>("/taxonomy/standards"),
  industries: resource<TaxonomyIndustry, IndustryInput>("/taxonomy/industries"),
  locations: resource<TaxonomyLocation, LocationInput>("/taxonomy/locations"),
};
