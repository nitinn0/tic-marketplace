import { api } from "@/lib/api";

import type {
  LocationSelection,
  ProviderCatalog,
  ProviderIndustryItem,
  ProviderLocationItem,
  ProviderProfile,
  ProviderProfileInput,
  ProviderServiceItem,
  ProviderStandardItem,
} from "../types";

/**
 * The provider profile always belongs to the organization in the X-Organization-Id header. It is
 * passed explicitly so a request can never target a different organization than the page shows.
 */
const scoped = (organizationId: string): RequestInit => ({ headers: { "X-Organization-Id": organizationId } });

export const providersService = {
  getProfile: (organizationId: string) => api.get<ProviderProfile>("/provider/profile", scoped(organizationId)),
  createProfile: (organizationId: string, input: ProviderProfileInput) =>
    api.post<ProviderProfile>("/provider/profile", input, scoped(organizationId)),
  updateProfile: (organizationId: string, input: ProviderProfileInput) =>
    api.patch<ProviderProfile>("/provider/profile", input, scoped(organizationId)),
  catalog: (organizationId: string) => api.get<ProviderCatalog>("/provider/catalog", scoped(organizationId)),

  replaceServices: (organizationId: string, serviceIds: string[]) =>
    api.put<ProviderServiceItem[]>("/provider/profile/services", { serviceIds }, scoped(organizationId)),
  replaceStandards: (organizationId: string, standardIds: string[]) =>
    api.put<ProviderStandardItem[]>("/provider/profile/standards", { standardIds }, scoped(organizationId)),
  replaceIndustries: (organizationId: string, industryIds: string[]) =>
    api.put<ProviderIndustryItem[]>("/provider/profile/industries", { industryIds }, scoped(organizationId)),
  replaceLocations: (organizationId: string, locations: LocationSelection[]) =>
    api.put<ProviderLocationItem[]>("/provider/profile/locations", { locations }, scoped(organizationId)),
};
