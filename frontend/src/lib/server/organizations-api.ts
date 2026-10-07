import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type JsonMap = Record<string, unknown>;

export class OrganizationsApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type Flags = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canConfigure: boolean;
};

const FLAG_KEYS = ["canView", "canCreate", "canEdit", "canDelete", "canApprove", "canConfigure"] as const;
const ACTION_TO_FLAG: Record<string, (typeof FLAG_KEYS)[number]> = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
  approve: "canApprove",
  configure: "canConfigure",
};

const F = {
  profile: "organizations.profile",
  status: "organizations.status",
  members: "organizations.members",
  memberRoles: "organizations.member_roles",
  ownership: "organizations.ownership",
  platformAccess: "organizations.platform_access",
} as const;

const OWNER_ROLE: Record<string, string> = {
  BUYER: "BUYER_ADMIN",
  PROVIDER: "PROVIDER_ADMIN",
};

function camelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelize(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonMap).map(([key, nested]) => [camelKey(key), camelize(nested)]),
    ) as T;
  }
  return value as T;
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function emptyFlags(): Flags {
  return {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canConfigure: false,
  };
}

function pickFlags(source: Partial<Record<(typeof FLAG_KEYS)[number], boolean | null>>): Flags {
  const flags = emptyFlags();
  for (const key of FLAG_KEYS) {
    flags[key] = source[key] ?? false;
  }
  return flags;
}

function applyOverride(
  inherited: Flags | undefined,
  override: Partial<Record<(typeof FLAG_KEYS)[number], boolean | null>>,
): Flags {
  const flags = emptyFlags();
  for (const key of FLAG_KEYS) {
    flags[key] = override[key] ?? inherited?.[key] ?? false;
  }
  return flags;
}

function unionFlags(current: Flags | undefined, next: Flags): Flags {
  if (!current) {
    return { ...next };
  }
  const flags = emptyFlags();
  for (const key of FLAG_KEYS) {
    flags[key] = current[key] || next[key];
  }
  return flags;
}

function permissionsToList(permissions: Map<string, Flags>) {
  return [...permissions.entries()]
    .filter(([, flags]) => FLAG_KEYS.some((key) => flags[key]))
    .map(([functionalityCode, flags]) => ({ functionalityCode, ...flags }))
    .sort((a, b) => a.functionalityCode.localeCompare(b.functionalityCode));
}

function allows(permissions: Map<string, Flags>, code: string, action: string) {
  const flag = ACTION_TO_FLAG[action.toLowerCase()];
  if (!flag) {
    return false;
  }
  return permissions.get(code)?.[flag] ?? false;
}

function isSubset(candidate: Map<string, Flags>, holder: Map<string, Flags>) {
  for (const [code, flags] of candidate) {
    for (const key of FLAG_KEYS) {
      if (flags[key] && !holder.get(code)?.[key]) {
        return false;
      }
    }
  }
  return true;
}

function isGlobalRole(role: { organizationType?: string | null }) {
  return !role.organizationType?.trim();
}

function isCompatible(role: { organizationType?: string | null; isActive?: boolean }, organizationType: string) {
  return Boolean(role.isActive) && role.organizationType?.trim().toUpperCase() === organizationType;
}

function newRow(values: JsonMap, { timestamps = true } = {}) {
  return {
    id: crypto.randomUUID(),
    ...(timestamps ? { updated_at: new Date().toISOString() } : {}),
    ...values,
  };
}

function emptyToNull(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

type RoleRef = { id: string; code: string; name: string; organizationType: string | null; isActive: boolean };

function asObject(value: unknown): JsonMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Array.isArray(value) ? asObject(value[0]) : null;
  }
  return value as JsonMap;
}

function roleFromRelation(value: unknown): RoleRef | null {
  const role = camelize<RoleRef | null>(asObject(value));
  return role?.id ? role : null;
}

function rolesFromAssignments(value: unknown): RoleRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => roleFromRelation(asObject(entry)?.role ?? entry))
    .filter((role): role is RoleRef => Boolean(role));
}

type OrgAccess = {
  userId: string;
  organization: {
    id: string;
    legalName: string;
    displayName: string;
    organizationType: string;
    status: string;
    verificationStatus: string;
    registrationNumber: string | null;
    taxId: string | null;
    website: string | null;
    description: string | null;
    countryCode: string | null;
    createdAt: string;
    updatedAt: string;
  };
  membership: {
    id: string;
    membershipStatus: string;
    isOwner: boolean;
    joinedAt: string | null;
  } | null;
  roles: Array<{ id: string; code: string; name: string }>;
  accessVia: "MEMBERSHIP" | "PLATFORM";
  hasPlatformAccess: boolean;
  permissions: Map<string, Flags>;
};

async function resolvePermissions(roleIds: string[]) {
  const result = new Map<string, Flags>();
  const unique = [...new Set(roleIds)];
  if (unique.length === 0) {
    return result;
  }

  const admin = getSupabaseAdmin();
  const { data: roles, error } = await admin
    .from("roles")
    .select(
      "id, baseline_access_level_id, is_active, permissions:role_permissions(can_view, can_create, can_edit, can_delete, can_approve, can_configure, access_level_id, functionality:functionalities(code, is_active, sub_module:sub_modules(is_active, module:modules(is_active))))",
    )
    .in("id", unique)
    .eq("is_active", true);
  if (error) {
    throw new OrganizationsApiError(error.message, 500);
  }

  const accessLevelIds = new Set<string>();
  for (const role of roles ?? []) {
    if (role.baseline_access_level_id) {
      accessLevelIds.add(String(role.baseline_access_level_id));
    }
    for (const permission of (role.permissions as JsonMap[] | null) ?? []) {
      if (permission.access_level_id) {
        accessLevelIds.add(String(permission.access_level_id));
      }
    }
  }

  const levelMatrix = new Map<string, Map<string, Flags>>();
  if (accessLevelIds.size > 0) {
    const { data: levelPermissions, error: levelError } = await admin
      .from("access_level_permissions")
      .select(
        "access_level_id, can_view, can_create, can_edit, can_delete, can_approve, can_configure, access_level:access_levels(is_active), functionality:functionalities(code, is_active, sub_module:sub_modules(is_active, module:modules(is_active)))",
      )
      .in("access_level_id", [...accessLevelIds]);
    if (levelError) {
      throw new OrganizationsApiError(levelError.message, 500);
    }
    for (const entry of levelPermissions ?? []) {
      const accessLevel = entry.access_level as { is_active?: boolean } | null;
      const functionality = camelize<{
        code: string;
        isActive: boolean;
        subModule?: { isActive: boolean; module?: { isActive: boolean } };
      }>(entry.functionality);
      if (!accessLevel?.is_active || !functionality?.code) {
        continue;
      }
      if (!functionality.isActive || !functionality.subModule?.isActive || !functionality.subModule.module?.isActive) {
        continue;
      }
      const mapped = camelize<Flags>(entry);
      const matrix = levelMatrix.get(String(entry.access_level_id)) ?? new Map<string, Flags>();
      matrix.set(functionality.code, pickFlags(mapped));
      levelMatrix.set(String(entry.access_level_id), matrix);
    }
  }

  for (const role of roles ?? []) {
    const baselineId = role.baseline_access_level_id ? String(role.baseline_access_level_id) : null;
    const baseline = baselineId ? levelMatrix.get(baselineId) : undefined;
    const rolePermissions = new Map<string, Flags>(baseline ?? []);
    for (const override of (role.permissions as JsonMap[] | null) ?? []) {
      const functionality = camelize<{
        code: string;
        isActive: boolean;
        subModule?: { isActive: boolean; module?: { isActive: boolean } };
      }>(override.functionality);
      if (!functionality?.code) {
        continue;
      }
      if (!functionality.isActive || !functionality.subModule?.isActive || !functionality.subModule.module?.isActive) {
        continue;
      }
      const mapped = camelize<Flags & { accessLevelId?: string | null }>(override);
      const inherited = mapped.accessLevelId
        ? levelMatrix.get(String(mapped.accessLevelId))?.get(functionality.code)
        : baseline?.get(functionality.code);
      rolePermissions.set(functionality.code, applyOverride(inherited, mapped));
    }
    for (const [code, flags] of rolePermissions) {
      result.set(code, unionFlags(result.get(code), flags));
    }
  }

  return result;
}

async function getGlobalRoles(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_roles")
    .select("role:roles(id, code, name, organization_type, is_active)")
    .eq("user_id", userId);
  if (error) {
    throw new OrganizationsApiError(error.message, 500);
  }
  return (data ?? [])
    .map((entry) => roleFromRelation(entry.role))
    .filter((role): role is RoleRef => Boolean(role?.id && role.isActive && isGlobalRole(role)));
}

async function getGlobalPermissions(userId: string, userStatus: string) {
  if (userStatus !== "ACTIVE") {
    return new Map<string, Flags>();
  }
  const roles = await getGlobalRoles(userId);
  return resolvePermissions(roles.map((role) => role.id));
}

function contextPayload(access: OrgAccess) {
  return {
    organization: {
      id: access.organization.id,
      displayName: access.organization.displayName,
      organizationType: access.organization.organizationType,
      status: access.organization.status,
    },
    membership: access.membership,
    roles: access.roles,
    accessVia: access.accessVia,
    hasPlatformAccess: access.hasPlatformAccess,
    permissions: permissionsToList(access.permissions),
  };
}

function detailsPayload(access: OrgAccess, memberCount: number) {
  return {
    id: access.organization.id,
    legalName: access.organization.legalName,
    displayName: access.organization.displayName,
    organizationType: access.organization.organizationType,
    registrationNumber: access.organization.registrationNumber,
    taxId: access.organization.taxId,
    website: access.organization.website,
    description: access.organization.description,
    countryCode: access.organization.countryCode,
    status: access.organization.status,
    verificationStatus: access.organization.verificationStatus,
    createdAt: access.organization.createdAt,
    updatedAt: access.organization.updatedAt,
    memberCount,
    membership: access.membership ? { ...access.membership, roles: access.roles } : null,
    accessVia: access.accessVia,
    hasPlatformAccess: access.hasPlatformAccess,
    permissions: permissionsToList(access.permissions),
  };
}

async function countActiveMembers(organizationId: string) {
  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from("organization_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("membership_status", "ACTIVE");
  if (error) {
    throw new OrganizationsApiError(error.message, 500);
  }
  return count ?? 0;
}

async function resolveAccess(userId: string, userStatus: string, organizationId: string, requireMembership = false) {
  if (userStatus !== "ACTIVE") {
    throw new OrganizationsApiError("User account is not active", 403);
  }

  const admin = getSupabaseAdmin();
  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();
  if (orgError) {
    throw new OrganizationsApiError(orgError.message, 500);
  }
  if (!organization) {
    throw new OrganizationsApiError("Organization not found", 404);
  }

  const { data: membership, error: memberError } = await admin
    .from("organization_users")
    .select(
      "id, membership_status, is_owner, joined_at, roles:organization_user_roles(role:roles(id, code, name, organization_type, is_active))",
    )
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (memberError) {
    throw new OrganizationsApiError(memberError.message, 500);
  }

  const org = camelize<OrgAccess["organization"]>(organization);
  const globalPermissions = await getGlobalPermissions(userId, userStatus);
  const hasPlatformAccess = allows(globalPermissions, F.platformAccess, "view");
  const membershipSummary = membership
    ? {
        id: String(membership.id),
        membershipStatus: String(membership.membership_status),
        isOwner: Boolean(membership.is_owner),
        joinedAt: (membership.joined_at as string | null) ?? null,
      }
    : null;

  if (membership?.membership_status === "ACTIVE") {
    const roles = rolesFromAssignments(membership.roles).filter((role) =>
      isCompatible(role, org.organizationType),
    );
    const organizationPermissions = await resolvePermissions(roles.map((role) => role.id));
    const permissions = hasPlatformAccess
      ? (() => {
          const merged = new Map(organizationPermissions);
          for (const [code, flags] of globalPermissions) {
            merged.set(code, unionFlags(merged.get(code), flags));
          }
          return merged;
        })()
      : organizationPermissions;

    return {
      userId,
      organization: org,
      membership: membershipSummary,
      roles: roles.map(({ id, code, name }) => ({ id, code, name })),
      accessVia: "MEMBERSHIP" as const,
      hasPlatformAccess,
      permissions,
    };
  }

  if (hasPlatformAccess && !requireMembership) {
    return {
      userId,
      organization: org,
      membership: membershipSummary,
      roles: [],
      accessVia: "PLATFORM" as const,
      hasPlatformAccess,
      permissions: globalPermissions,
    };
  }

  if (membership) {
    throw new OrganizationsApiError(
      `Your membership in this organization is ${String(membership.membership_status).toLowerCase()}`,
      403,
    );
  }

  throw new OrganizationsApiError("Organization not found", 404);
}

function assertCan(access: OrgAccess, code: string, action: string) {
  if (!allows(access.permissions, code, action)) {
    throw new OrganizationsApiError("You do not have permission to perform this action in this organization", 403);
  }
  if (access.organization.status !== "ACTIVE" && action.toLowerCase() !== "view" && !access.hasPlatformAccess) {
    throw new OrganizationsApiError(`Organization is ${access.organization.status.toLowerCase()}`, 403);
  }
}

export async function getMeOrganizations(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("organization_users")
    .select(
      "membership_status, is_owner, last_accessed_at, joined_at, organization:organizations(id, display_name, organization_type, status), roles:organization_user_roles(role:roles(id, code, name, organization_type, is_active))",
    )
    .eq("user_id", userId)
    .in("membership_status", ["ACTIVE", "SUSPENDED"]);
  if (error) {
    throw new OrganizationsApiError(error.message, 500);
  }

  const organizations = ((data ?? []) as JsonMap[])
    .sort((a, b) => {
      const aAccessed = String(a.last_accessed_at ?? "");
      const bAccessed = String(b.last_accessed_at ?? "");
      if (aAccessed !== bAccessed) {
        return bAccessed.localeCompare(aAccessed);
      }
      return String(a.joined_at ?? "").localeCompare(String(b.joined_at ?? ""));
    })
    .flatMap((row) => {
      const organization = camelize<{
        id: string;
        displayName: string;
        organizationType: string;
        status: string;
      }>(row.organization);
      if (!organization?.id) {
        return [];
      }
      const roles = rolesFromAssignments(row.roles)
        .filter((role) => isCompatible(role, organization.organizationType))
        .map(({ id, code, name }) => ({ id, code, name }));
      return [
        {
          id: organization.id,
          displayName: organization.displayName,
          organizationType: organization.organizationType,
          status: organization.status,
          membershipStatus: row.membership_status,
          isOwner: Boolean(row.is_owner),
          roles,
        },
      ];
    });

  const activeOrganizationId =
    organizations.find((organization) => organization.membershipStatus === "ACTIVE")?.id ?? null;

  return { organizations, activeOrganizationId };
}

async function listOrganizations(userId: string, userStatus: string, url: URL) {
  const admin = getSupabaseAdmin();
  const scope = url.searchParams.get("scope");
  const organizationType = url.searchParams.get("organizationType");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();

  let query = admin.from("organizations").select("*").order("display_name").limit(200);
  if (organizationType) {
    query = query.eq("organization_type", organizationType);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(`display_name.ilike.%${search}%,legal_name.ilike.%${search}%`);
  }

  if (scope === "all") {
    const globalPermissions = await getGlobalPermissions(userId, userStatus);
    if (!allows(globalPermissions, F.platformAccess, "view") || !allows(globalPermissions, F.profile, "view")) {
      throw new OrganizationsApiError("Listing all organizations requires platform organization access", 403);
    }
  } else {
    const { data: memberships, error: membershipError } = await admin
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("membership_status", "ACTIVE");
    if (membershipError) {
      throw new OrganizationsApiError(membershipError.message, 500);
    }
    const ids = (memberships ?? []).map((row) => String(row.organization_id));
    if (ids.length === 0) {
      return [];
    }
    query = query.in("id", ids);
  }

  const { data: organizations, error } = await query;
  if (error) {
    throw new OrganizationsApiError(error.message, 500);
  }

  const orgIds = (organizations ?? []).map((organization) => String(organization.id));
  const { data: memberships } = orgIds.length
    ? await admin
        .from("organization_users")
        .select(
          "id, organization_id, membership_status, is_owner, joined_at, roles:organization_user_roles(role:roles(id, code, name, organization_type, is_active))",
        )
        .eq("user_id", userId)
        .in("organization_id", orgIds)
    : { data: [] as JsonMap[] };

  const membershipByOrg = new Map((memberships ?? []).map((row) => [String(row.organization_id), row]));
  const counts = await Promise.all(orgIds.map(async (id) => [id, await countActiveMembers(id)] as const));
  const countByOrg = new Map(counts);

  return (organizations ?? []).map((organization) => {
    const mapped = camelize<{
      id: string;
      legalName: string;
      displayName: string;
      organizationType: string;
      status: string;
      verificationStatus: string;
      countryCode: string | null;
      website: string | null;
      createdAt: string;
    }>(organization);
    const membership = membershipByOrg.get(mapped.id);
    const roles = membership
      ? rolesFromAssignments(membership.roles)
          .filter((role) => isCompatible(role, mapped.organizationType))
          .map(({ id, code, name }) => ({ id, code, name }))
      : [];
    return {
      ...mapped,
      memberCount: countByOrg.get(mapped.id) ?? 0,
      membership: membership
        ? {
            id: String(membership.id),
            membershipStatus: membership.membership_status,
            isOwner: Boolean(membership.is_owner),
            joinedAt: membership.joined_at ?? null,
            roles,
          }
        : null,
    };
  });
}

async function createOrganization(userId: string, userStatus: string, body: JsonMap) {
  if (userStatus !== "ACTIVE") {
    throw new OrganizationsApiError("User account is not active", 403);
  }
  const legalName = String(body.legalName ?? "").trim();
  const displayName = String(body.displayName ?? "").trim();
  const organizationType = String(body.organizationType ?? "").trim().toUpperCase();
  if (!legalName || !displayName) {
    throw new OrganizationsApiError("Legal name and display name are required");
  }
  if (organizationType !== "BUYER" && organizationType !== "PROVIDER") {
    throw new OrganizationsApiError("Organization type must be BUYER or PROVIDER");
  }

  const admin = getSupabaseAdmin();
  const ownerRoleCode = OWNER_ROLE[organizationType];
  const { data: ownerRole, error: roleError } = await admin
    .from("roles")
    .select("id, code, name, organization_type, is_active")
    .eq("code", ownerRoleCode)
    .maybeSingle();
  if (roleError || !ownerRole || !isCompatible(camelize<RoleRef>(ownerRole), organizationType)) {
    throw new OrganizationsApiError(`Default owner role ${ownerRoleCode} is not configured`, 500);
  }

  const now = new Date().toISOString();
  const { data: created, error: createError } = await admin
    .from("organizations")
    .insert(
      newRow({
        legal_name: legalName,
        display_name: displayName,
        organization_type: organizationType,
        registration_number: emptyToNull(body.registrationNumber) ?? null,
        tax_id: emptyToNull(body.taxId) ?? null,
        website: emptyToNull(body.website) ?? null,
        description: emptyToNull(body.description) ?? null,
        country_code: emptyToNull(body.countryCode) ?? null,
        status: "ACTIVE",
        verification_status: "PENDING",
      }),
    )
    .select("*")
    .single();
  if (createError || !created) {
    throw new OrganizationsApiError(createError?.message ?? "Unable to create organization", 400);
  }

  const { data: membership, error: membershipError } = await admin
    .from("organization_users")
    .insert(
      newRow({
        organization_id: created.id,
        user_id: userId,
        membership_status: "ACTIVE",
        is_owner: true,
        joined_at: now,
        last_accessed_at: now,
      }),
    )
    .select("id")
    .single();
  if (membershipError || !membership) {
    await admin.from("organizations").delete().eq("id", created.id);
    throw new OrganizationsApiError(membershipError?.message ?? "Unable to create membership", 400);
  }

  const { error: assignError } = await admin
    .from("organization_user_roles")
    .insert(newRow({ organization_user_id: membership.id, role_id: ownerRole.id }));
  if (assignError) {
    await admin.from("organization_users").delete().eq("id", membership.id);
    await admin.from("organizations").delete().eq("id", created.id);
    throw new OrganizationsApiError(assignError.message, 400);
  }

  const access = await resolveAccess(userId, userStatus, String(created.id));
  return detailsPayload(access, 1);
}

async function updateOrganization(access: OrgAccess, body: JsonMap) {
  if (body.status !== undefined) {
    assertCan(access, F.status, "edit");
  }
  const admin = getSupabaseAdmin();
  const patch: JsonMap = { updated_at: new Date().toISOString() };
  const fields: Array<[string, string]> = [
    ["legalName", "legal_name"],
    ["displayName", "display_name"],
    ["registrationNumber", "registration_number"],
    ["taxId", "tax_id"],
    ["website", "website"],
    ["description", "description"],
    ["countryCode", "country_code"],
    ["status", "status"],
  ];
  for (const [from, to] of fields) {
    if (body[from] === undefined) {
      continue;
    }
    patch[to] = from === "legalName" || from === "displayName" || from === "status" ? body[from] : emptyToNull(body[from]);
  }
  const { error } = await admin.from("organizations").update(patch).eq("id", access.organization.id);
  if (error) {
    throw new OrganizationsApiError(error.message, 400);
  }
  const next = await resolveAccess(access.userId, "ACTIVE", access.organization.id);
  return detailsPayload(next, await countActiveMembers(next.organization.id));
}

async function listMembers(access: OrgAccess, includeRemoved: boolean) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("organization_users")
    .select(
      "id, organization_id, user_id, membership_status, is_owner, joined_at, invited_at, created_at, updated_at, user:users(id, email, first_name, last_name, status), roles:organization_user_roles(created_at, role:roles(id, code, name, organization_type, is_active))",
    )
    .eq("organization_id", access.organization.id)
    .order("is_owner", { ascending: false })
    .order("joined_at", { ascending: true });
  if (!includeRemoved) {
    query = query.neq("membership_status", "REMOVED");
  }
  const { data, error } = await query;
  if (error) {
    throw new OrganizationsApiError(error.message, 500);
  }
  return (data ?? []).map((member) => {
    const mapped = camelize<{
      id: string;
      organizationId: string;
      userId: string;
      membershipStatus: string;
      isOwner: boolean;
      joinedAt: string | null;
      invitedAt: string | null;
      createdAt: string;
      updatedAt: string;
      user: JsonMap;
    }>(member);
    const assignments = Array.isArray(member.roles) ? member.roles : [];
    return {
      id: mapped.id,
      organizationId: mapped.organizationId,
      userId: mapped.userId,
      user: mapped.user,
      membershipStatus: mapped.membershipStatus,
      isOwner: mapped.isOwner,
      joinedAt: mapped.joinedAt,
      invitedAt: mapped.invitedAt,
      createdAt: mapped.createdAt,
      updatedAt: mapped.updatedAt,
      roles: assignments
        .map((entry) => {
          const row = asObject(entry);
          const role = roleFromRelation(row?.role);
          if (!role || !isCompatible(role, access.organization.organizationType)) {
            return null;
          }
          return {
            id: role.id,
            code: role.code,
            name: role.name,
            assignedAt: (row?.created_at as string | undefined) ?? mapped.createdAt,
          };
        })
        .filter((role): role is { id: string; code: string; name: string; assignedAt: string } => Boolean(role)),
    };
  });
}

async function listPendingInvitations(access: OrgAccess) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("organization_invitations")
    .select("id, organization_id, email, status, expires_at, created_at, invited_by, role:roles(id, code, name)")
    .eq("organization_id", access.organization.id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });
  if (error) {
    throw new OrganizationsApiError(error.message, 500);
  }
  const inviterIds = [...new Set((data ?? []).map((row) => row.invited_by).filter(Boolean).map(String))];
  const inviters = new Map<string, JsonMap>();
  if (inviterIds.length > 0) {
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id, email, first_name, last_name")
      .in("id", inviterIds);
    if (usersError) {
      throw new OrganizationsApiError(usersError.message, 500);
    }
    for (const user of users ?? []) {
      inviters.set(String(user.id), camelize(user));
    }
  }
  return (data ?? []).map((row) => {
    const mapped = camelize<JsonMap>(row);
    const role = roleFromRelation(row.role);
    return {
      ...mapped,
      role: role ? { id: role.id, code: role.code, name: role.name } : null,
      invitedBy: row.invited_by ? inviters.get(String(row.invited_by)) ?? null : null,
    };
  });
}

async function listCompatibleRoles(access: OrgAccess) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("roles")
    .select("id, code, name, description, organization_type, is_active")
    .eq("is_active", true)
    .not("organization_type", "is", null)
    .order("name");
  if (error) {
    throw new OrganizationsApiError(error.message, 500);
  }
  const compatible = (data ?? [])
    .map((role) => camelize<RoleRef & { description: string | null }>(role))
    .filter((role) => isCompatible(role, access.organization.organizationType));
  const assignable = await Promise.all(
    compatible.map(async (role) => {
      const rolePermissions = await resolvePermissions([role.id]);
      return {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        organizationType: role.organizationType,
        assignable: access.hasPlatformAccess || isSubset(rolePermissions, access.permissions),
      };
    }),
  );
  return assignable;
}

async function switchOrganization(access: OrgAccess) {
  if (!access.membership) {
    throw new OrganizationsApiError("Organization not found", 404);
  }
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("organization_users")
    .update({ last_accessed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", access.membership.id);
  if (error) {
    throw new OrganizationsApiError(error.message, 400);
  }
  return contextPayload(access);
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as JsonMap;
  } catch {
    return {};
  }
}

export async function handleOrganizationsApi(request: Request, path: string, appUser: JsonMap) {
  const method = request.method.toUpperCase();
  const userId = String(appUser.id);
  const userStatus = String(appUser.status ?? "ACTIVE");
  const url = new URL(request.url);

  if (method === "GET" && path === "organizations") {
    return json(await listOrganizations(userId, userStatus, url));
  }

  if (method === "POST" && path === "organizations") {
    return json(await createOrganization(userId, userStatus, await readJson(request)), 201);
  }

  if (method === "GET" && path === "organizations/current") {
    const headerId = request.headers.get("x-organization-id");
    const organizationId = headerId || (await getMeOrganizations(userId)).activeOrganizationId;
    if (!organizationId) {
      throw new OrganizationsApiError("Organization not found", 404);
    }
    const access = await resolveAccess(userId, userStatus, organizationId, true);
    return json(contextPayload(access));
  }

  const orgMatch = path.match(/^organizations\/([^/]+)(?:\/(.*))?$/);
  if (!orgMatch) {
    return null;
  }

  const organizationId = orgMatch[1];
  const rest = orgMatch[2] ?? "";

  if (method === "GET" && rest === "") {
    const access = await resolveAccess(userId, userStatus, organizationId);
    assertCan(access, F.profile, "view");
    return json(detailsPayload(access, await countActiveMembers(organizationId)));
  }

  if (method === "PATCH" && rest === "") {
    const access = await resolveAccess(userId, userStatus, organizationId);
    assertCan(access, F.profile, "edit");
    return json(await updateOrganization(access, await readJson(request)));
  }

  if (method === "POST" && rest === "switch") {
    const access = await resolveAccess(userId, userStatus, organizationId, true);
    return json(await switchOrganization(access));
  }

  if (method === "GET" && rest === "permissions") {
    const access = await resolveAccess(userId, userStatus, organizationId);
    return json(contextPayload(access));
  }

  if (method === "GET" && rest === "roles") {
    const access = await resolveAccess(userId, userStatus, organizationId);
    assertCan(access, F.memberRoles, "view");
    return json(await listCompatibleRoles(access));
  }

  if (method === "GET" && rest === "members") {
    const access = await resolveAccess(userId, userStatus, organizationId);
    assertCan(access, F.members, "view");
    return json(await listMembers(access, url.searchParams.get("includeRemoved") === "true"));
  }

  if (method === "GET" && rest === "invitations") {
    const access = await resolveAccess(userId, userStatus, organizationId);
    assertCan(access, F.members, "view");
    return json(await listPendingInvitations(access));
  }

  return null;
}
