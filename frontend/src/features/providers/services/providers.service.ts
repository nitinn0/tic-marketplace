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

  publishService: (
    organizationId: string,
    input: { categoryId: string; name: string; description?: string; documents: File[] },
  ) => {
    const form = new FormData();
    form.append("categoryId", input.categoryId);
    form.append("name", input.name);
    if (input.description) form.append("description", input.description);
    for (const file of input.documents) {
      form.append("documents", file);
    }
    return api.postForm<ProviderServiceItem[]>("/provider/profile/services/publish", form, scoped(organizationId));
  },
  replaceServices: (organizationId: string, serviceIds: string[]) =>
    api.put<ProviderServiceItem[]>("/provider/profile/services", { serviceIds }, scoped(organizationId)),
  removeService: (organizationId: string, serviceId: string) =>
    api.delete<ProviderServiceItem[]>(`/provider/profile/services/${serviceId}`, scoped(organizationId)),
  replaceStandards: (organizationId: string, standardIds: string[]) =>
    api.put<ProviderStandardItem[]>("/provider/profile/standards", { standardIds }, scoped(organizationId)),
  replaceIndustries: (organizationId: string, industryIds: string[]) =>
    api.put<ProviderIndustryItem[]>("/provider/profile/industries", { industryIds }, scoped(organizationId)),
  replaceLocations: (organizationId: string, locations: LocationSelection[]) =>
    api.put<ProviderLocationItem[]>("/provider/profile/locations", { locations }, scoped(organizationId)),
};
