import type { ProviderCatalog, ProviderType } from "../types";

const ROOT_SLUG_TO_PROVIDER_TYPE: Record<string, ProviderType> = {
  testing: "TESTING_LAB",
  inspection: "INSPECTION_COMPANY",
  certification: "CERTIFICATION_BODY",
  "professional-services": "CONSULTANCY",
  "experts-consulting": "CONSULTANCY",
};

/** Maps selected catalogue/custom services to providerTypes via their root category slug. */
export function providerTypesFromSelection(
  catalog: Pick<ProviderCatalog, "categories" | "services"> | null,
  serviceIds: string[],
  customCategoryIds: string[],
): ProviderType[] {
  if (!catalog) return ["OTHER"];

  const rootIds = new Set<string>();
  const resolveRoot = (categoryId: string | undefined | null) => {
    if (!categoryId) return;
    let current = catalog.categories.find((category) => category.id === categoryId);
    while (current?.parentId) {
      current = catalog.categories.find((category) => category.id === current!.parentId);
    }
    if (current) rootIds.add(current.id);
  };

  for (const serviceId of serviceIds) {
    const service = catalog.services.find((entry) => entry.id === serviceId);
    resolveRoot(service?.categoryId ?? service?.category.id);
  }
  for (const categoryId of customCategoryIds) resolveRoot(categoryId);

  const types = [...rootIds]
    .map((id) => catalog.categories.find((category) => category.id === id)?.slug)
    .map((slug) => (slug ? ROOT_SLUG_TO_PROVIDER_TYPE[slug] : undefined))
    .filter((value): value is ProviderType => Boolean(value));

  return types.length ? Array.from(new Set(types)) : ["OTHER"];
}
