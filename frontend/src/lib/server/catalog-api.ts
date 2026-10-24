import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type JsonMap = Record<string, unknown>;

class CatalogError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const POPULAR_SLUGS = [
  "water-chemical-testing",
  "iso-9001-certification",
  "ghg-verification",
  "factory-inspection",
  "iso-27001-certification",
  "water-microbiological-testing",
  "iso-14001-certification",
  "supplier-audit",
];

const CATEGORY_TAGLINE: Record<string, string> = {
  testing: "Labs for product, material and environmental testing.",
  inspection: "On-site inspection of goods, plants and shipments.",
  certification: "Accredited certification of systems, products and people.",
  "experts-consulting": "Auditors, verifiers and sustainability consultants.",
};

const TAXONOMY_PERMISSION: Record<string, string> = {
  categories: "marketplace.categories",
  services: "marketplace.services",
  standards: "marketplace.standards",
  industries: "marketplace.industries",
  locations: "marketplace.locations",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function asObject(value: unknown): JsonMap | null {
  if (Array.isArray(value)) return asObject(value[0]);
  if (!value || typeof value !== "object") return null;
  return value as JsonMap;
}

function text(value: unknown) {
  return value == null ? null : String(value);
}

function countryName(countryCode: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

function locationLabel(parts: { countryCode: string; state?: string | null; city?: string | null; postalCode?: string | null }) {
  const segments = [parts.city, parts.state, countryName(parts.countryCode)].filter(Boolean);
  const label = segments.join(", ");
  return parts.postalCode ? `${label} ${parts.postalCode}` : label;
}

function locationLevel(parts: { state?: string | null; city?: string | null }) {
  if (parts.city) return "CITY";
  if (parts.state) return "STATE";
  return "COUNTRY";
}

type TreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  categoryType?: string;
};

function buildTree(rows: TreeNode[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const childrenOf = new Map<string | null, TreeNode[]>();
  for (const row of rows) {
    const key = row.parentId && byId.has(row.parentId) ? row.parentId : null;
    const list = childrenOf.get(key) ?? [];
    list.push(row);
    childrenOf.set(key, list);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }
  return { byId, childrenOf };
}

function ancestorsOf(index: ReturnType<typeof buildTree>, id: string) {
  const chain: TreeNode[] = [];
  let current = index.byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId && index.byId.has(current.parentId) && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    const parent = index.byId.get(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

function descendantIds(index: ReturnType<typeof buildTree>, id: string) {
  const ids: string[] = [];
  const walk = (nodeId: string) => {
    for (const child of index.childrenOf.get(nodeId) ?? []) {
      ids.push(child.id);
      walk(child.id);
    }
  };
  walk(id);
  return ids;
}

function effectivelyActive(index: ReturnType<typeof buildTree>, id: string) {
  const node = index.byId.get(id);
  if (!node?.active) return false;
  return ancestorsOf(index, id).every((ancestor) => ancestor.active);
}

function depthFirst(index: ReturnType<typeof buildTree>) {
  const ordered: { node: TreeNode; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const node of index.childrenOf.get(parentId) ?? []) {
      ordered.push({ node, depth });
      walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  return ordered;
}

function matchesSearch(search: string | null, ...fields: Array<string | null | undefined>) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}

function countBy(rows: JsonMap[], key: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = text(row[key]);
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

async function selectAll(table: string, columns = "*") {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from(table).select(columns).limit(2000);
  if (error) throw new CatalogError(error.message, 500);
  return (data ?? []) as unknown as JsonMap[];
}

function toTreeNode(row: JsonMap, withType = false): TreeNode {
  return {
    id: String(row.id),
    parentId: text(row.parent_id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    description: text(row.description),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    ...(withType ? { categoryType: String(row.category_type ?? "") } : {}),
  };
}

type CatalogService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  categoryType: string;
  categoryActive: boolean;
  sortOrder: number;
};

type CatalogProvider = {
  id: string;
  name: string;
  headline: string | null;
  description: string | null;
  providerType: string;
  providerTypes: string[];
  verified: boolean;
  yearsInBusiness: number | null;
  services: { id: string; slug: string; name: string }[];
  locations: string[];
  public: boolean;
  createdAt: string;
};

async function loadCatalog() {
  const [categoryRows, serviceRows, profileRows, industryRows] = await Promise.all([
    selectAll("service_categories"),
    selectAll(
      "services",
      "id, name, slug, description, active, sort_order, category_id, category:service_categories(id, name, slug, category_type, active)",
    ),
    selectAll(
      "provider_profiles",
      "id, headline, description, provider_types, years_in_business, verification_status, public_profile, created_at, organization:organizations(display_name, status, organization_type), services:provider_services(service:services(id, name, slug, active)), locations:provider_locations(location:locations(country_code, state, city, postal_code))",
    ),
    selectAll("industries", "id, name, slug, active, parent_id, sort_order"),
  ]);

  const categories = categoryRows.map((row) => toTreeNode(row, true));
  const index = buildTree(categories);
  const services: CatalogService[] = serviceRows
    .map((row) => {
      const category = asObject(row.category);
      return {
        id: String(row.id),
        slug: String(row.slug ?? ""),
        name: String(row.name ?? ""),
        description: text(row.description),
        active: Boolean(row.active),
        categoryId: String(row.category_id ?? category?.id ?? ""),
        categoryName: String(category?.name ?? ""),
        categorySlug: String(category?.slug ?? ""),
        categoryType: String(category?.category_type ?? ""),
        categoryActive: Boolean(category?.active),
        sortOrder: Number(row.sort_order ?? 0),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const providers: CatalogProvider[] = profileRows
    .map((row) => {
      const organization = asObject(row.organization);
      const serviceLinks = Array.isArray(row.services) ? row.services : [];
      const locationLinks = Array.isArray(row.locations) ? row.locations : [];
      const publicProfile =
        Boolean(row.public_profile) &&
        organization?.status === "ACTIVE" &&
        organization?.organization_type === "PROVIDER";
      return {
        id: String(row.id),
        name: String(organization?.display_name ?? "Provider"),
        headline: text(row.headline),
        description: text(row.description),
        providerTypes: Array.isArray(row.provider_types)
          ? row.provider_types.map((entry) => String(entry))
          : row.provider_type
            ? [String(row.provider_type)]
            : [],
        providerType: Array.isArray(row.provider_types)
          ? String(row.provider_types[0] ?? "")
          : String(row.provider_type ?? ""),
        verified: row.verification_status === "VERIFIED",
        yearsInBusiness: row.years_in_business == null ? null : Number(row.years_in_business),
        services: serviceLinks.flatMap((link) => {
          const service = asObject(asObject(link)?.service);
          if (!service?.id || service.active === false) return [];
          return [{ id: String(service.id), slug: String(service.slug ?? ""), name: String(service.name ?? "") }];
        }),
        locations: locationLinks.flatMap((link) => {
          const location = asObject(asObject(link)?.location);
          if (!location?.country_code) return [];
          return [
            locationLabel({
              countryCode: String(location.country_code),
              state: text(location.state),
              city: text(location.city),
              postalCode: text(location.postal_code),
            }),
          ];
        }),
        public: publicProfile,
        createdAt: String(row.created_at ?? ""),
      };
    })
    .filter((provider) => provider.public)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const industries = industryRows
    .filter((row) => row.active && !row.parent_id)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((row) => String(row.name));

  return { index, services, providers, industries };
}

function postedByFor(serviceId: string, providers: CatalogProvider[]) {
  const match = providers
    .filter((provider) => provider.services.some((service) => service.id === serviceId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  return match ? { id: match.id, name: match.name } : null;
}

function serviceCard(
  service: CatalogService,
  index: ReturnType<typeof buildTree>,
  providerCount: number,
  postedBy: { id: string; name: string } | null,
) {
  const path = ancestorsOf(index, service.categoryId).map((node) => node.name);
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    categoryName: service.categoryName,
    categorySlug: service.categorySlug,
    categoryType: service.categoryType,
    categoryPath: [...path, service.categoryName].filter(Boolean),
    providerCount,
    postedBy,
  };
}

function providerCard(provider: CatalogProvider) {
  return {
    id: provider.id,
    name: provider.name,
    headline: provider.headline,
    providerType: provider.providerType,
    providerTypes: provider.providerTypes,
    verified: provider.verified,
    yearsInBusiness: provider.yearsInBusiness,
    services: provider.services.map(({ slug, name }) => ({ slug, name })),
    locations: provider.locations,
  };
}

function activeServices(catalog: Awaited<ReturnType<typeof loadCatalog>>) {
  return catalog.services.filter(
    (service) => service.active && effectivelyActive(catalog.index, service.categoryId),
  );
}

function providerCountFor(serviceId: string, providers: CatalogProvider[]) {
  return providers.filter((provider) => provider.services.some((service) => service.id === serviceId)).length;
}

async function marketplaceHome() {
  const catalog = await loadCatalog();
  const services = activeServices(catalog);
  const roots = (catalog.index.childrenOf.get(null) ?? []).filter((category) => category.active);
  const popularOrder = new Map(POPULAR_SLUGS.map((slug, position) => [slug, position]));
  const popular = [...services]
    .sort((a, b) => (popularOrder.get(a.slug) ?? 100) - (popularOrder.get(b.slug) ?? 100) || a.name.localeCompare(b.name))
    .slice(0, 8);

  return {
    counts: {
      verifiedProviders: catalog.providers.filter((provider) => provider.verified).length,
      providers: catalog.providers.length,
      services: services.length,
    },
    categories: roots.map((root) => ({
      id: root.slug,
      slug: root.slug,
      name: root.name,
      categoryType: root.categoryType,
      tagline: root.description || CATEGORY_TAGLINE[root.slug] || "",
      serviceCount: services.filter((service) => {
        const ancestors = ancestorsOf(catalog.index, service.categoryId);
        return (ancestors[0]?.id ?? service.categoryId) === root.id;
      }).length,
    })),
    popular: popular.map((service) =>
      serviceCard(service, catalog.index, providerCountFor(service.id, catalog.providers), postedByFor(service.id, catalog.providers)),
    ),
    providers: catalog.providers.slice(0, 6).map(providerCard),
    industries: catalog.industries,
  };
}

async function marketplaceServices(url: URL) {
  const catalog = await loadCatalog();
  const services = activeServices(catalog);
  const categorySlug = url.searchParams.get("category");
  const category = categorySlug
    ? [...catalog.index.byId.values()].find((row) => row.slug === categorySlug && effectivelyActive(catalog.index, row.id))
    : undefined;
  if (categorySlug && !category) throw new CatalogError("Category not found", 404);
  const allowed = category ? new Set([category.id, ...descendantIds(catalog.index, category.id)]) : null;
  const keywords = (url.searchParams.get("q") ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
  const filtered = services.filter((service) => {
    if (allowed && !allowed.has(service.categoryId)) return false;
    if (keywords.length === 0) return true;
    const path = ancestorsOf(catalog.index, service.categoryId)
      .map((node) => node.name)
      .join(" ");
    const haystack = `${service.name} ${service.slug.replaceAll("-", " ")} ${service.description ?? ""} ${service.categoryName} ${path}`.toLowerCase();
    return keywords.every((word) => haystack.includes(word));
  });
  return {
    services: filtered.map((service) =>
      serviceCard(service, catalog.index, providerCountFor(service.id, catalog.providers), postedByFor(service.id, catalog.providers)),
    ),
    category: category ? { slug: category.slug, name: category.name } : null,
  };
}

async function marketplaceService(slug: string) {
  const catalog = await loadCatalog();
  const service = activeServices(catalog).find((row) => row.slug === slug);
  if (!service) throw new CatalogError("Service not found", 404);
  const offering = catalog.providers.filter((provider) => provider.services.some((row) => row.id === service.id));
  return {
    ...serviceCard(service, catalog.index, offering.length, postedByFor(service.id, offering)),
    description: service.description,
    providers: offering.map(providerCard),
  };
}

async function marketplaceProviders() {
  const catalog = await loadCatalog();
  return { providers: catalog.providers.map(providerCard) };
}

async function marketplaceProvider(id: string) {
  const catalog = await loadCatalog();
  const provider = catalog.providers.find((row) => row.id === id);
  if (!provider) throw new CatalogError("Provider not found", 404);
  return { ...providerCard(provider), description: provider.description, yearsInBusiness: provider.yearsInBusiness, standards: [] };
}

async function canView(userId: string, userStatus: string, functionalityCode: string) {
  if (userStatus !== "ACTIVE") return false;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_roles")
    .select(
      "role:roles(organization_type, is_active, permissions:role_permissions(can_view, functionality:functionalities(code)))",
    )
    .eq("user_id", userId);
  if (error) throw new CatalogError(error.message, 500);
  return (data ?? []).some((entry) => {
    const role = asObject(entry.role);
    if (!role?.is_active || text(role.organization_type)) return false;
    const permissions = Array.isArray(role.permissions) ? role.permissions : [];
    return permissions.some((permission) => {
      const row = asObject(permission);
      const functionality = asObject(row?.functionality);
      return row?.can_view && functionality?.code === functionalityCode;
    });
  });
}

async function requireTaxonomyView(user: { id: string; status?: string }, resource: string) {
  const code = TAXONOMY_PERMISSION[resource];
  if (!code || !(await canView(user.id, String(user.status ?? ""), code))) {
    throw new CatalogError("You do not have permission to view this taxonomy", 403);
  }
}

function flag(url: URL, name: string) {
  const value = url.searchParams.get(name);
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

async function listCategories(url: URL) {
  const [rows, services] = await Promise.all([selectAll("service_categories"), selectAll("services", "id, category_id")]);
  const nodes = rows.map((row) => toTreeNode(row, true));
  const index = buildTree(nodes);
  const serviceCounts = countBy(services, "category_id");
  const active = flag(url, "active");
  const categoryType = url.searchParams.get("categoryType");
  const parentId = url.searchParams.get("parentId");
  const search = url.searchParams.get("search")?.trim() || null;
  return depthFirst(index)
    .filter(({ node }) => {
      if (active !== undefined && node.active !== active) return false;
      if (categoryType && node.categoryType !== categoryType) return false;
      if (parentId && node.parentId !== parentId) return false;
      return matchesSearch(search, node.name, node.slug, node.description);
    })
    .map(({ node, depth }) => ({
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      slug: node.slug,
      description: node.description,
      categoryType: node.categoryType,
      active: node.active,
      effectiveActive: effectivelyActive(index, node.id),
      sortOrder: node.sortOrder,
      depth,
      path: ancestorsOf(index, node.id).map((ancestor) => ({ id: ancestor.id, name: ancestor.name })),
      childCount: (index.childrenOf.get(node.id) ?? []).length,
      serviceCount: serviceCounts.get(node.id) ?? 0,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    }));
}

async function listTaxonomyServices(url: URL) {
  const [rows, links, categories] = await Promise.all([
    selectAll("services"),
    selectAll("provider_services", "service_id"),
    selectAll("service_categories"),
  ]);
  const index = buildTree(categories.map((row) => toTreeNode(row, true)));
  const counts = countBy(links, "service_id");
  const categoryId = url.searchParams.get("categoryId");
  if (categoryId && !index.byId.has(categoryId)) throw new CatalogError("Category not found", 404);
  const allowed = categoryId ? new Set([categoryId, ...descendantIds(index, categoryId)]) : null;
  const active = flag(url, "active");
  const search = url.searchParams.get("search")?.trim() || null;
  return rows
    .map((row) => {
      const category = index.byId.get(String(row.category_id ?? ""));
      return {
        id: String(row.id),
        categoryId: String(row.category_id ?? ""),
        category: category
          ? {
              id: category.id,
              name: category.name,
              slug: category.slug,
              categoryType: category.categoryType,
              active: category.active,
            }
          : null,
        categoryPath: category
          ? [...ancestorsOf(index, category.id).map((ancestor) => ancestor.name), category.name]
          : [],
        name: String(row.name ?? ""),
        slug: String(row.slug ?? ""),
        description: text(row.description),
        active: Boolean(row.active),
        effectiveActive: Boolean(row.active) && category ? effectivelyActive(index, category.id) : false,
        sortOrder: Number(row.sort_order ?? 0),
        providerCount: counts.get(String(row.id)) ?? 0,
        createdAt: String(row.created_at ?? ""),
        updatedAt: String(row.updated_at ?? ""),
      };
    })
    .filter((service) => {
      if (active !== undefined && service.active !== active) return false;
      if (allowed && !allowed.has(service.categoryId)) return false;
      return matchesSearch(search, service.name, service.slug, service.description);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

async function listStandards(url: URL) {
  const [rows, links] = await Promise.all([selectAll("standards"), selectAll("provider_standards", "standard_id")]);
  const counts = countBy(links, "standard_id");
  const active = flag(url, "active");
  const search = url.searchParams.get("search")?.trim() || null;
  return rows
    .map((row) => ({
      id: String(row.id),
      code: String(row.code ?? ""),
      name: String(row.name ?? ""),
      version: text(row.version),
      description: text(row.description),
      active: Boolean(row.active),
      providerCount: counts.get(String(row.id)) ?? 0,
      createdAt: String(row.created_at ?? ""),
      updatedAt: String(row.updated_at ?? ""),
    }))
    .filter((row) => (active === undefined || row.active === active) && matchesSearch(search, row.code, row.name, row.description))
    .sort((a, b) => a.code.localeCompare(b.code));
}

async function listIndustries(url: URL) {
  const [rows, links] = await Promise.all([selectAll("industries"), selectAll("provider_industries", "industry_id")]);
  const nodes = rows.map((row) => toTreeNode(row));
  const index = buildTree(nodes);
  const counts = countBy(links, "industry_id");
  const active = flag(url, "active");
  const parentId = url.searchParams.get("parentId");
  const search = url.searchParams.get("search")?.trim() || null;
  return depthFirst(index)
    .filter(({ node }) => {
      if (active !== undefined && node.active !== active) return false;
      if (parentId && node.parentId !== parentId) return false;
      return matchesSearch(search, node.name, node.slug, node.description);
    })
    .map(({ node, depth }) => ({
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      slug: node.slug,
      description: node.description,
      active: node.active,
      effectiveActive: effectivelyActive(index, node.id),
      sortOrder: node.sortOrder,
      depth,
      path: ancestorsOf(index, node.id).map((ancestor) => ({ id: ancestor.id, name: ancestor.name })),
      childCount: (index.childrenOf.get(node.id) ?? []).length,
      providerCount: counts.get(node.id) ?? 0,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    }));
}

async function listLocations(url: URL) {
  const [rows, links] = await Promise.all([selectAll("locations"), selectAll("provider_locations", "location_id")]);
  const counts = countBy(links, "location_id");
  const active = flag(url, "active");
  const countryCode = url.searchParams.get("countryCode")?.toUpperCase();
  const search = url.searchParams.get("search")?.trim() || null;
  return rows
    .map((row) => {
      const parts = {
        countryCode: String(row.country_code ?? "").trim(),
        state: text(row.state),
        city: text(row.city),
        postalCode: text(row.postal_code),
      };
      return {
        id: String(row.id),
        countryCode: parts.countryCode,
        state: parts.state,
        city: parts.city,
        postalCode: parts.postalCode,
        level: locationLevel(parts),
        label: locationLabel(parts),
        active: Boolean(row.active),
        latitude: row.latitude == null ? null : Number(row.latitude),
        longitude: row.longitude == null ? null : Number(row.longitude),
        providerCount: counts.get(String(row.id)) ?? 0,
        createdAt: String(row.created_at ?? ""),
        updatedAt: String(row.updated_at ?? ""),
      };
    })
    .filter((row) => {
      if (active !== undefined && row.active !== active) return false;
      if (countryCode && row.countryCode !== countryCode) return false;
      return matchesSearch(search, row.label, row.countryCode, row.state, row.city);
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function canReadBuyerRfqs(userId: string, userStatus: string, organizationId: string) {
  const admin = getSupabaseAdmin();
  const { data: organization, error } = await admin
    .from("organizations")
    .select("id, organization_type")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw new CatalogError(error.message, 500);
  if (!organization || organization.organization_type !== "BUYER") return false;

  const { data: membership } = await admin
    .from("organization_users")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("membership_status", "ACTIVE")
    .maybeSingle();
  if (membership) return true;
  return canView(userId, userStatus, "organizations.platform_access");
}

function buyerRfq(row: JsonMap) {
  const service = asObject(row.service) ?? {};
  const dispatches = Array.isArray(row.dispatches) ? row.dispatches : [];
  const quotes = Array.isArray(row.quotes) ? row.quotes : [];
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    location: String(row.location_label ?? ""),
    siteCount: Number(row.site_count ?? 0),
    employeeCount: Number(row.employee_count ?? 0),
    timeline: text(row.timeline),
    status: String(row.status ?? ""),
    createdAt: String(row.created_at ?? ""),
    service: { id: String(service.id ?? ""), name: String(service.name ?? ""), slug: String(service.slug ?? "") },
    matches: dispatches.map((entry) => {
      const dispatch = asObject(entry) ?? {};
      const provider = asObject(dispatch.provider);
      const organization = asObject(provider?.organization);
      const reasons = Array.isArray(dispatch.match_reasons) ? dispatch.match_reasons.map(String) : [];
      return {
        providerId: String(dispatch.provider_id ?? ""),
        name: String(organization?.display_name ?? "Provider"),
        score: Number(dispatch.match_score ?? 0),
        reasons,
      };
    }),
    quotes: quotes.flatMap((entry) => {
      const quote = asObject(entry);
      if (!quote || quote.status === "WITHDRAWN") return [];
      const provider = asObject(quote.provider);
      const organization = asObject(provider?.organization);
      return [
        {
          id: String(quote.id),
          providerId: String(quote.provider_id ?? ""),
          providerName: String(organization?.display_name ?? "Provider"),
          amount: Number(quote.amount ?? 0),
          currency: String(quote.currency ?? "INR"),
          scopeNotes: String(quote.scope_notes ?? ""),
          exclusions: text(quote.exclusions),
          timelineDays: quote.timeline_days == null ? null : Number(quote.timeline_days),
          createdAt: String(quote.created_at ?? ""),
        },
      ];
    }),
  };
}

const RFQ_COLUMNS =
  "id, title, description, location_label, site_count, employee_count, timeline, status, created_at, buyer_organization_id, service:services(id, name, slug), dispatches:rfq_dispatches(provider_id, match_score, match_reasons, provider:provider_profiles(organization:organizations(display_name))), quotes:rfq_quotes(id, provider_id, amount, currency, scope_notes, exclusions, timeline_days, status, created_at, provider:provider_profiles(organization:organizations(display_name)))";

async function listRfqs(user: { id: string; status?: string }, request: Request) {
  const organizationId = request.headers.get("x-organization-id");
  if (!organizationId) return { rfqs: [] };
  const allowed = await canReadBuyerRfqs(user.id, String(user.status ?? ""), organizationId);
  if (!allowed) return { rfqs: [] };
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("rfqs")
    .select(RFQ_COLUMNS)
    .eq("buyer_organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new CatalogError(error.message, 500);
  return { rfqs: ((data ?? []) as JsonMap[]).map(buyerRfq) };
}

async function getRfq(user: { id: string; status?: string }, request: Request, rfqId: string) {
  const organizationId = request.headers.get("x-organization-id");
  if (!organizationId || !(await canReadBuyerRfqs(user.id, String(user.status ?? ""), organizationId))) {
    throw new CatalogError("RFQ not found", 404);
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("rfqs")
    .select(RFQ_COLUMNS)
    .eq("id", rfqId)
    .eq("buyer_organization_id", organizationId)
    .maybeSingle();
  if (error) throw new CatalogError(error.message, 500);
  if (!data) throw new CatalogError("RFQ not found", 404);
  return buyerRfq(data as JsonMap);
}

/** Public directory. Browsing does not require an account. */
export async function handlePublicCatalog(request: Request, path: string) {
  if (request.method.toUpperCase() !== "GET" || !path.startsWith("marketplace/")) return null;
  try {
    if (path === "marketplace/home") return json(await marketplaceHome());
    if (path === "marketplace/services") return json(await marketplaceServices(new URL(request.url)));
    if (path === "marketplace/providers") return json(await marketplaceProviders());
    const serviceMatch = path.match(/^marketplace\/services\/([^/]+)$/);
    if (serviceMatch) return json(await marketplaceService(decodeURIComponent(serviceMatch[1])));
    const providerMatch = path.match(/^marketplace\/providers\/([^/]+)$/);
    if (providerMatch) return json(await marketplaceProvider(providerMatch[1]));
    return null;
  } catch (error) {
    if (error instanceof CatalogError) return json({ message: error.message }, error.status);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return json({ message }, 500);
  }
}

/** Signed-in taxonomy administration and buyer RFQs. */
export async function handlePrivateCatalog(
  request: Request,
  path: string,
  user: { id: string; status?: string },
) {
  if (request.method.toUpperCase() !== "GET") return null;
  try {
    const taxonomyMatch = path.match(/^taxonomy\/(categories|services|standards|industries|locations)$/);
    if (taxonomyMatch) {
      const resource = taxonomyMatch[1];
      await requireTaxonomyView(user, resource);
      const url = new URL(request.url);
      if (resource === "categories") return json(await listCategories(url));
      if (resource === "services") return json(await listTaxonomyServices(url));
      if (resource === "standards") return json(await listStandards(url));
      if (resource === "industries") return json(await listIndustries(url));
      return json(await listLocations(url));
    }

    if (path === "rfqs") return json(await listRfqs(user, request));
    const rfqMatch = path.match(/^rfqs\/([^/]+)$/);
    if (rfqMatch) return json(await getRfq(user, request, rfqMatch[1]));
    return null;
  } catch (error) {
    if (error instanceof CatalogError) return json({ message: error.message }, error.status);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return json({ message }, 500);
  }
}
