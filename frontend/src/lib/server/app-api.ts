import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type JsonMap = Record<string, unknown>;

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function camelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelize(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonMap).map(([key, nested]) => [
        camelKey(key),
        camelize(nested),
      ]),
    ) as T;
  }

  return value as T;
}

// Prisma generates ids and updated_at client-side, so the tables have no DB defaults for them.
function newRow(values: JsonMap, { timestamps = true } = {}) {
  return {
    id: crypto.randomUUID(),
    ...(timestamps ? { updated_at: new Date().toISOString() } : {}),
    ...values,
  };
}

function touched(values: JsonMap) {
  return { ...values, updated_at: new Date().toISOString() };
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as JsonMap;
  } catch {
    return {};
  }
}

async function requireUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new ApiError("Unauthorized", 401);
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) {
    throw new ApiError("Unauthorized", 401);
  }

  return data.user;
}

async function resolveAppUser(authUser: { id: string; email?: string }) {
  const admin = getSupabaseAdmin();
  const email = authUser.email?.toLowerCase();

  const { data: byId } = await admin
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();
  if (byId) {
    return byId;
  }

  if (email) {
    const { data: byEmail } = await admin
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (byEmail) {
      return byEmail;
    }
  }

  const metadata = (authUser as { user_metadata?: JsonMap }).user_metadata ?? {};
  const { data: created, error } = await admin
    .from("users")
    .insert(
      newRow({
        id: authUser.id,
        email: email ?? `${authUser.id}@users.local`,
        first_name: String(metadata.first_name ?? "Supabase"),
        last_name: String(metadata.last_name ?? "User"),
        status: "ACTIVE",
      }),
    )
    .select("*")
    .single();

  if (error || !created) {
    throw new ApiError(error?.message ?? "Unable to resolve user", 500);
  }

  return created;
}

async function resolveTargetUserId(requestedId: string, authEmail?: string) {
  const admin = getSupabaseAdmin();
  const { data: byId } = await admin.from("users").select("id").eq("id", requestedId).maybeSingle();
  if (byId) {
    return byId.id;
  }

  if (authEmail) {
    const { data: byEmail } = await admin
      .from("users")
      .select("id")
      .eq("email", authEmail.toLowerCase())
      .maybeSingle();
    if (byEmail) {
      return byEmail.id;
    }
  }

  throw new ApiError("User not found", 404);
}

async function getCurrentProfile(authUser: { id: string; email?: string }) {
  const admin = getSupabaseAdmin();
  const appUser = await resolveAppUser(authUser);
  const { data: userRoles, error } = await admin
    .from("user_roles")
    .select("role:roles(id, name, code, permissions:role_permissions(can_view, can_create, can_edit, can_delete, can_approve, can_configure, functionality:functionalities(code)))")
    .eq("user_id", appUser.id);

  if (error) {
    throw new ApiError(error.message, 500);
  }

  const roles = (userRoles ?? []).map((entry) => {
    const role = camelize<{
      id: string;
      name: string;
      code: string;
      permissions?: Array<{
        canView?: boolean | null;
        canCreate?: boolean | null;
        canEdit?: boolean | null;
        canDelete?: boolean | null;
        canApprove?: boolean | null;
        canConfigure?: boolean | null;
        functionality?: { code: string };
      }>;
    }>(entry.role);

    return role;
  });

  const permissions = roles.flatMap((role) =>
    (role.permissions ?? []).map((permission) => ({
      functionalityCode: permission.functionality?.code ?? "",
      canView: Boolean(permission.canView),
      canCreate: Boolean(permission.canCreate),
      canEdit: Boolean(permission.canEdit),
      canDelete: Boolean(permission.canDelete),
      canApprove: Boolean(permission.canApprove),
      canConfigure: Boolean(permission.canConfigure),
    })),
  );

  const user = camelize<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    status: string;
  }>(appUser);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
    },
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      code: role.code,
    })),
    permissions,
  };
}

async function listModules() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("modules")
    .select("*, sub_modules(*, functionalities(*))")
    .order("sort_order");

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return camelize<JsonMap[]>(data ?? []).map((module) => ({
    ...module,
    subModules: ((module.subModules as JsonMap[] | undefined) ?? []).map((subModule) => ({
      ...subModule,
      functionalities: subModule.functionalities ?? [],
    })),
  }));
}

async function listAccessLevels() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("access_levels").select("*").order("sort_order");
  if (error) {
    throw new ApiError(error.message, 500);
  }
  return camelize(data ?? []);
}

async function listRoles() {
  const admin = getSupabaseAdmin();
  const [{ data: roles, error: rolesError }, { data: levels, error: levelsError }] = await Promise.all([
    admin
      .from("roles")
      .select("*, user_roles(assigned_at, user:users(id, email, first_name, last_name, status))")
      .order("name"),
    admin.from("access_levels").select("id, name, code"),
  ]);

  if (rolesError) {
    throw new ApiError(rolesError.message, 500);
  }
  if (levelsError) {
    throw new ApiError(levelsError.message, 500);
  }

  const levelMap = new Map((levels ?? []).map((level) => [level.id, camelize(level)]));
  return (roles ?? []).map((role) => {
    const { userRoles, ...mapped } = camelize<JsonMap & {
      userRoles?: Array<{ assignedAt: string; user: JsonMap | null }>;
    }>(role);
    return {
      ...mapped,
      baselineAccessLevel: mapped.baselineAccessLevelId
        ? levelMap.get(String(mapped.baselineAccessLevelId)) ?? null
        : null,
      users: (userRoles ?? [])
        .filter((entry) => entry.user)
        .map((entry) => ({ ...entry.user, assignedAt: entry.assignedAt })),
    };
  });
}

async function getRolePermissions(roleId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("role_permissions")
    .select(
      "*, functionality:functionalities(id, code, name, action, sub_module:sub_modules(id, name, module:modules(id, name))), access_level:access_levels(id, name, code)",
    )
    .eq("role_id", roleId);

  if (error) {
    throw new ApiError(error.message, 500);
  }

  return camelize<JsonMap[]>(data ?? []).map((entry) => ({
    ...entry,
    functionality: entry.functionality
      ? {
          ...(entry.functionality as JsonMap),
          subModule: (entry.functionality as JsonMap).subModule
            ? {
                ...((entry.functionality as JsonMap).subModule as JsonMap),
                module: ((entry.functionality as JsonMap).subModule as JsonMap).module ?? null,
              }
            : null,
        }
      : null,
    accessLevel: entry.accessLevel ?? null,
  }));
}

export async function handleAppApi(request: Request, path: string) {
  try {
    const method = request.method.toUpperCase();

    if (method === "GET" && path === "health") {
      return json({ status: "ok", service: "tic-marketplace-api" });
    }

    const authUser = await requireUser(request);

    if (method === "GET" && path === "auth/me") {
      return json(await getCurrentProfile(authUser));
    }

    if (method === "GET" && path === "rbac/modules") {
      return json(await listModules());
    }

    if (method === "POST" && path === "rbac/modules") {
      const body = await readJson(request);
      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("modules")
        .insert(
          newRow({
            name: body.name,
            code: body.code,
            description: body.description || null,
          }),
        )
        .select("*")
        .single();
      if (error) {
        throw new ApiError(error.message, 400);
      }
      return json(camelize(data), 201);
    }

    const moduleMatch = path.match(/^rbac\/modules\/([^/]+)$/);
    if (moduleMatch) {
      const admin = getSupabaseAdmin();
      if (method === "PATCH") {
        const body = await readJson(request);
        const { data, error } = await admin
          .from("modules")
          .update(
            touched({
              name: body.name,
              code: body.code,
              description: body.description || null,
            }),
          )
          .eq("id", moduleMatch[1])
          .select("*")
          .single();
        if (error) {
          throw new ApiError(error.message, 400);
        }
        return json(camelize(data));
      }
      if (method === "DELETE") {
        const { error } = await admin.from("modules").delete().eq("id", moduleMatch[1]);
        if (error) {
          throw new ApiError(error.message, 400);
        }
        return json({ success: true });
      }
    }

    if (method === "GET" && path === "rbac/access-levels") {
      return json(await listAccessLevels());
    }

    if (method === "POST" && path === "rbac/access-levels") {
      const body = await readJson(request);
      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("access_levels")
        .insert(
          newRow({
            name: body.name,
            code: body.code,
            description: body.description || null,
          }),
        )
        .select("*")
        .single();
      if (error) {
        throw new ApiError(error.message, 400);
      }
      return json(camelize(data), 201);
    }

    const accessMatrixMatch = path.match(/^rbac\/access-levels\/([^/]+)\/matrix$/);
    if (accessMatrixMatch) {
      const accessLevelId = accessMatrixMatch[1];
      const admin = getSupabaseAdmin();
      if (method === "GET") {
        const { data, error } = await admin
          .from("access_level_permissions")
          .select("*")
          .eq("access_level_id", accessLevelId);
        if (error) {
          throw new ApiError(error.message, 500);
        }
        return json(camelize(data ?? []));
      }
      if (method === "PUT") {
        const body = await readJson(request);
        const permissions = Array.isArray(body.permissions) ? body.permissions : null;
        if (!permissions) {
          throw new ApiError("Invalid permissions payload");
        }

        const { error: deleteError } = await admin
          .from("access_level_permissions")
          .delete()
          .eq("access_level_id", accessLevelId);
        if (deleteError) {
          throw new ApiError(deleteError.message, 400);
        }

        if (permissions.length > 0) {
          const { error: insertError } = await admin.from("access_level_permissions").insert(
            permissions.map((permission) => {
              const entry = permission as JsonMap;
              return newRow({
                access_level_id: accessLevelId,
                functionality_id: entry.functionalityId,
                can_view: Boolean(entry.canView),
                can_create: Boolean(entry.canCreate),
                can_edit: Boolean(entry.canEdit),
                can_delete: Boolean(entry.canDelete),
                can_approve: Boolean(entry.canApprove),
                can_configure: Boolean(entry.canConfigure),
              });
            }),
          );
          if (insertError) {
            throw new ApiError(insertError.message, 400);
          }
        }

        return json({ success: true });
      }
    }

    if (method === "GET" && path === "rbac/roles") {
      return json(await listRoles());
    }

    if (method === "POST" && path === "rbac/roles") {
      const body = await readJson(request);
      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("roles")
        .insert(
          newRow({
            name: body.name,
            code: body.code,
            description: body.description || null,
            category: body.category || null,
            organization_type: body.organizationType || null,
            baseline_access_level_id: body.baselineAccessLevelId || null,
            is_active: typeof body.isActive === "boolean" ? body.isActive : true,
          }),
        )
        .select("*")
        .single();
      if (error) {
        throw new ApiError(error.message, 400);
      }
      return json(camelize(data), 201);
    }

    const roleUsersMatch = path.match(/^rbac\/roles\/([^/]+)\/users$/);
    if (roleUsersMatch && method === "PUT") {
      const roleId = roleUsersMatch[1];
      const body = await readJson(request);
      if (!Array.isArray(body.userIds)) {
        throw new ApiError("Invalid user assignment payload");
      }
      const desired = new Set(body.userIds.map(String));

      const admin = getSupabaseAdmin();
      const { data: role, error: roleError } = await admin
        .from("roles")
        .select("id, is_system")
        .eq("id", roleId)
        .maybeSingle();
      if (roleError || !role) {
        throw new ApiError("Role not found", 404);
      }

      const { data: current, error: currentError } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role_id", roleId);
      if (currentError) {
        throw new ApiError(currentError.message, 500);
      }

      const currentIds = new Set((current ?? []).map((entry) => String(entry.user_id)));
      const toRemove = [...currentIds].filter((id) => !desired.has(id));
      const toAdd = [...desired].filter((id) => !currentIds.has(id));

      if (role.is_system && toRemove.length > 0) {
        throw new ApiError("Protected system roles cannot be removed from users");
      }

      if (toRemove.length > 0) {
        const { error } = await admin
          .from("user_roles")
          .delete()
          .eq("role_id", roleId)
          .in("user_id", toRemove);
        if (error) {
          throw new ApiError(error.message, 400);
        }
      }

      if (toAdd.length > 0) {
        const { error } = await admin
          .from("user_roles")
          .insert(toAdd.map((userId) => newRow({ user_id: userId, role_id: roleId }, { timestamps: false })));
        if (error) {
          throw new ApiError(error.message, 400);
        }
      }

      return json({ success: true, added: toAdd.length, removed: toRemove.length });
    }

    const rolePermissionsMatch = path.match(/^rbac\/roles\/([^/]+)\/permissions$/);
    if (rolePermissionsMatch) {
      const roleId = rolePermissionsMatch[1];
      if (method === "GET") {
        return json(await getRolePermissions(roleId));
      }
      if (method === "PUT") {
        const body = await readJson(request);
        const permissions = Array.isArray(body.permissions) ? body.permissions : null;
        if (!permissions) {
          throw new ApiError("Invalid permissions payload");
        }

        const admin = getSupabaseAdmin();
        const { error: deleteError } = await admin.from("role_permissions").delete().eq("role_id", roleId);
        if (deleteError) {
          throw new ApiError(deleteError.message, 400);
        }

        if (permissions.length > 0) {
          const { error: insertError } = await admin.from("role_permissions").insert(
            permissions.map((permission) => {
              const entry = permission as JsonMap;
              return newRow({
                role_id: roleId,
                functionality_id: entry.functionalityId,
                access_level_id: entry.accessLevelId || null,
                can_view: entry.canView ?? null,
                can_create: entry.canCreate ?? null,
                can_edit: entry.canEdit ?? null,
                can_delete: entry.canDelete ?? null,
                can_approve: entry.canApprove ?? null,
                can_configure: entry.canConfigure ?? null,
              });
            }),
          );
          if (insertError) {
            throw new ApiError(insertError.message, 400);
          }
        }

        return json({ success: true });
      }
    }

    const roleMatch = path.match(/^rbac\/roles\/([^/]+)$/);
    if (roleMatch) {
      const admin = getSupabaseAdmin();
      if (method === "GET") {
        const { data, error } = await admin.from("roles").select("*").eq("id", roleMatch[1]).single();
        if (error || !data) {
          throw new ApiError("Role not found", 404);
        }
        return json(camelize(data));
      }
      if (method === "PATCH") {
        const body = await readJson(request);
        const { data, error } = await admin
          .from("roles")
          .update(
            touched({
              name: body.name,
              code: body.code,
              description: body.description || null,
              category: body.category || null,
              organization_type: body.organizationType || null,
              baseline_access_level_id: body.baselineAccessLevelId || null,
              ...(typeof body.isActive === "boolean" ? { is_active: body.isActive } : {}),
            }),
          )
          .eq("id", roleMatch[1])
          .select("*")
          .single();
        if (error) {
          throw new ApiError(error.message, 400);
        }
        return json(camelize(data));
      }
      if (method === "DELETE") {
        const { data: role, error: roleError } = await admin
          .from("roles")
          .select("is_system")
          .eq("id", roleMatch[1])
          .single();
        if (roleError || !role) {
          throw new ApiError("Role not found", 404);
        }
        if (role.is_system) {
          throw new ApiError("Protected system roles cannot be deleted");
        }
        const { error } = await admin.from("roles").delete().eq("id", roleMatch[1]);
        if (error) {
          throw new ApiError(error.message, 400);
        }
        return json({ success: true });
      }
    }

    if (method === "GET" && path === "rbac/users") {
      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("users")
        .select("id, email, first_name, last_name, status")
        .order("first_name")
        .order("last_name")
        .order("email");
      if (error) {
        throw new ApiError(error.message, 500);
      }
      return json(camelize(data ?? []));
    }

    if (method === "POST" && path === "rbac/users") {
      const body = await readJson(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const roleId = String(body.roleId ?? "");

      if (!email || !roleId) {
        throw new ApiError("Email and role are required");
      }
      if (password.length < 8) {
        throw new ApiError("Password must be at least 8 characters");
      }

      const admin = getSupabaseAdmin();
      const { data: role, error: roleError } = await admin
        .from("roles")
        .select("id, name, code")
        .eq("id", roleId)
        .maybeSingle();
      if (roleError || !role) {
        throw new ApiError("Role not found", 404);
      }

      const { data: existing } = await admin.from("users").select("id").eq("email", email).maybeSingle();
      if (existing) {
        throw new ApiError("User with this email already exists");
      }

      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError || !authData.user) {
        throw new ApiError(authError?.message ?? "Unable to create auth user", 400);
      }

      const authUserId = authData.user.id;
      const { error: userError } = await admin.from("users").insert(
        newRow({
          id: authUserId,
          email,
          first_name: email.split("@")[0],
          last_name: "",
          status: "ACTIVE",
        }),
      );
      if (userError) {
        await admin.auth.admin.deleteUser(authUserId);
        throw new ApiError(userError.message, 400);
      }

      const { error: assignError } = await admin
        .from("user_roles")
        .insert(newRow({ user_id: authUserId, role_id: role.id }, { timestamps: false }));
      if (assignError) {
        await admin.from("users").delete().eq("id", authUserId);
        await admin.auth.admin.deleteUser(authUserId);
        throw new ApiError(assignError.message, 400);
      }

      return json({ id: authUserId, email, status: "ACTIVE", role }, 201);
    }

    const userRoleMatch = path.match(/^rbac\/users\/([^/]+)\/roles$/);
    if (userRoleMatch && method === "POST") {
      const body = await readJson(request);
      const userId = await resolveTargetUserId(userRoleMatch[1], authUser.email);
      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("user_roles")
        .insert(newRow({ user_id: userId, role_id: body.roleId }, { timestamps: false }))
        .select("*")
        .single();
      if (error) {
        throw new ApiError(error.message, 400);
      }
      return json(camelize(data), 201);
    }

    const removeRoleMatch = path.match(/^rbac\/users\/([^/]+)\/roles\/([^/]+)$/);
    if (removeRoleMatch && method === "DELETE") {
      const userId = await resolveTargetUserId(removeRoleMatch[1], authUser.email);
      const admin = getSupabaseAdmin();
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role_id", removeRoleMatch[2]);
      if (error) {
        throw new ApiError(error.message, 400);
      }
      return json({ success: true });
    }

    throw new ApiError("Not found", 404);
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ message: error.message }, error.status);
    }

    const message = error instanceof Error ? error.message : "Unexpected server error";
    return json({ message }, 500);
  }
}
