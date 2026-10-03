import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertAccessLevel(code: string, name: string, sortOrder: number) {
  return prisma.accessLevel.upsert({
    where: { code },
    update: { name, sortOrder, isActive: true },
    create: {
      code,
      name,
      sortOrder,
      isSystem: true,
      isActive: true,
    },
  });
}

async function upsertModule(code: string, name: string, sortOrder: number) {
  return prisma.moduleEntity.upsert({
    where: { code },
    update: { name, sortOrder, isActive: true },
    create: {
      code,
      name,
      sortOrder,
      isActive: true,
    },
  });
}

async function upsertSubModule(moduleId: string, code: string, name: string, sortOrder: number) {
  return prisma.subModule.upsert({
    where: {
      moduleId_code: {
        moduleId,
        code,
      },
    },
    update: { name, sortOrder, isActive: true },
    create: {
      moduleId,
      code,
      name,
      sortOrder,
      isActive: true,
    },
  });
}

async function upsertFunctionality(
  subModuleId: string,
  code: string,
  name: string,
  action: string,
  sortOrder: number,
) {
  return prisma.functionality.upsert({
    where: {
      subModuleId_code: {
        subModuleId,
        code,
      },
    },
    update: { name, action, sortOrder, isActive: true },
    create: {
      subModuleId,
      code,
      name,
      action,
      sortOrder,
      isActive: true,
    },
  });
}

async function upsertRole(
  code: string,
  name: string,
  baselineAccessLevelId: string | null,
  category: string,
) {
  return prisma.role.upsert({
    where: { code },
    update: {
      name,
      baselineAccessLevelId,
      category,
      isActive: true,
      isSystem: true,
    },
    create: {
      code,
      name,
      baselineAccessLevelId,
      category,
      isSystem: true,
      isActive: true,
    },
  });
}

async function upsertRolePermission(
  roleId: string,
  functionalityId: string,
  accessLevelId: string | null,
  values: {
    canView?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    canConfigure?: boolean;
  },
) {
  return prisma.rolePermission.upsert({
    where: {
      roleId_functionalityId: {
        roleId,
        functionalityId,
      },
    },
    update: {
      accessLevelId,
      canView: values.canView ?? null,
      canCreate: values.canCreate ?? null,
      canEdit: values.canEdit ?? null,
      canDelete: values.canDelete ?? null,
      canApprove: values.canApprove ?? null,
      canConfigure: values.canConfigure ?? null,
    },
    create: {
      roleId,
      functionalityId,
      accessLevelId,
      canView: values.canView ?? null,
      canCreate: values.canCreate ?? null,
      canEdit: values.canEdit ?? null,
      canDelete: values.canDelete ?? null,
      canApprove: values.canApprove ?? null,
      canConfigure: values.canConfigure ?? null,
    },
  });
}

async function assignRoleToUser(userEmail: string, roleCode: string) {
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    return;
  }

  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    return;
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });
}

async function main() {
  const viewerLevel = await upsertAccessLevel('VIEWER', 'Viewer', 1);
  const editorLevel = await upsertAccessLevel('EDITOR', 'Editor', 2);
  const adminLevel = await upsertAccessLevel('ADMIN', 'Administrator', 3);

  const platformModule = await upsertModule('platform', 'Platform', 1);
  const rbacModule = await upsertModule('rbac', 'RBAC', 2);

  const platformSettingsSubmodule = await upsertSubModule(
    platformModule.id,
    'platform_settings',
    'Platform Settings',
    1,
  );
  const rbacMgmtSubmodule = await upsertSubModule(
    rbacModule.id,
    'rbac_management',
    'RBAC Management',
    1,
  );

  const platformOverview = await upsertFunctionality(
    platformSettingsSubmodule.id,
    'platform.overview',
    'Platform Overview',
    'view',
    1,
  );
  const roleManagement = await upsertFunctionality(
    rbacMgmtSubmodule.id,
    'rbac.manage_roles',
    'Manage Roles',
    'view',
    1,
  );
  const moduleManagement = await upsertFunctionality(
    rbacMgmtSubmodule.id,
    'rbac.manage_modules',
    'Manage Modules',
    'view',
    2,
  );
  const accessLevelManagement = await upsertFunctionality(
    rbacMgmtSubmodule.id,
    'rbac.manage_access_levels',
    'Manage Access Levels',
    'view',
    3,
  );

  const superAdminRole = await upsertRole('SUPER_ADMIN', 'Super Admin', adminLevel.id, 'system');
  const adminRole = await upsertRole('ADMIN', 'Administrator', adminLevel.id, 'system');
  const userRole = await upsertRole('USER', 'User', viewerLevel.id, 'platform');

  await upsertRolePermission(superAdminRole.id, platformOverview.id, adminLevel.id, {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canConfigure: true,
  });

  await upsertRolePermission(superAdminRole.id, roleManagement.id, adminLevel.id, {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canConfigure: true,
  });

  await upsertRolePermission(superAdminRole.id, moduleManagement.id, adminLevel.id, {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canConfigure: true,
  });

  await upsertRolePermission(superAdminRole.id, accessLevelManagement.id, adminLevel.id, {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canConfigure: true,
  });

  await upsertRolePermission(adminRole.id, roleManagement.id, editorLevel.id, {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canConfigure: false,
  });

  await upsertRolePermission(userRole.id, platformOverview.id, viewerLevel.id, {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canConfigure: false,
  });

  await assignRoleToUser('bob+auth@example.com', 'SUPER_ADMIN');
  await assignRoleToUser('alice+test@example.com', 'USER');

  console.log('RBAC seed completed successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
