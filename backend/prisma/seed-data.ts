import type { OrganizationType, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type Flags = {
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  canConfigure?: boolean;
};

const FULL: Flags = { canView: true, canCreate: true, canEdit: true, canDelete: true, canConfigure: true };
const VIEW_ONLY: Flags = { canView: true, canCreate: false, canEdit: false, canDelete: false, canConfigure: false };

export const DEMO_PASSWORD = 'password123';

export const DEMO_USERS = {
  superAdmin: { email: 'bob+auth@example.com', firstName: 'Bob', lastName: 'Auth' },
  john: { email: 'john@example.com', firstName: 'John', lastName: 'Mathew' },
  rahul: { email: 'rahul@example.com', firstName: 'Rahul', lastName: 'Sharma' },
  priya: { email: 'priya@example.com', firstName: 'Priya', lastName: 'Nair' },
  ananya: { email: 'ananya@example.com', firstName: 'Ananya', lastName: 'Iyer' },
  meera: { email: 'meera@example.com', firstName: 'Meera', lastName: 'Kapoor' },
  arjun: { email: 'arjun@example.com', firstName: 'Arjun', lastName: 'Mehta' },
} as const;

export const DEMO_ORGANIZATIONS = {
  abc: {
    legalName: 'ABC Certification Pvt Ltd',
    displayName: 'ABC Certification',
    organizationType: 'PROVIDER' as OrganizationType,
    countryCode: 'IN',
    description: 'Product and management system certification body.',
  },
  xyz: {
    legalName: 'XYZ Testing Labs Pvt Ltd',
    displayName: 'XYZ Testing Labs',
    organizationType: 'PROVIDER' as OrganizationType,
    countryCode: 'IN',
    description: 'NABL accredited testing laboratory.',
  },
  acme: {
    legalName: 'Acme Industries Pvt Ltd',
    displayName: 'Acme Industries',
    organizationType: 'BUYER' as OrganizationType,
    countryCode: 'IN',
    description: 'Manufacturer sourcing testing and certification services.',
  },
} as const;

export async function seedRbac(prisma: PrismaClient) {
  const upsertAccessLevel = (code: string, name: string, sortOrder: number) =>
    prisma.accessLevel.upsert({
      where: { code },
      update: { name, sortOrder, isActive: true },
      create: { code, name, sortOrder, isSystem: true, isActive: true },
    });

  const upsertModule = (code: string, name: string, sortOrder: number) =>
    prisma.moduleEntity.upsert({
      where: { code },
      update: { name, sortOrder, isActive: true },
      create: { code, name, sortOrder, isActive: true },
    });

  const upsertSubModule = (moduleId: string, code: string, name: string, sortOrder: number) =>
    prisma.subModule.upsert({
      where: { moduleId_code: { moduleId, code } },
      update: { name, sortOrder, isActive: true },
      create: { moduleId, code, name, sortOrder, isActive: true },
    });

  const upsertFunctionality = (
    subModuleId: string,
    code: string,
    name: string,
    action: string,
    sortOrder: number,
    description?: string,
  ) =>
    prisma.functionality.upsert({
      where: { subModuleId_code: { subModuleId, code } },
      update: { name, action, sortOrder, description, isActive: true },
      create: { subModuleId, code, name, action, sortOrder, description, isActive: true },
    });

  const upsertRole = (
    code: string,
    name: string,
    baselineAccessLevelId: string | null,
    category: string,
    organizationType: OrganizationType | null = null,
    description?: string,
  ) =>
    prisma.role.upsert({
      where: { code },
      update: { name, baselineAccessLevelId, category, organizationType, description, isActive: true, isSystem: true },
      create: { code, name, baselineAccessLevelId, category, organizationType, description, isSystem: true, isActive: true },
    });

  const upsertRolePermission = (roleId: string, functionalityId: string, accessLevelId: string | null, values: Flags) => {
    const data = {
      accessLevelId,
      canView: values.canView ?? null,
      canCreate: values.canCreate ?? null,
      canEdit: values.canEdit ?? null,
      canDelete: values.canDelete ?? null,
      canApprove: values.canApprove ?? null,
      canConfigure: values.canConfigure ?? null,
    };
    return prisma.rolePermission.upsert({
      where: { roleId_functionalityId: { roleId, functionalityId } },
      update: data,
      create: { roleId, functionalityId, ...data },
    });
  };

  const viewerLevel = await upsertAccessLevel('VIEWER', 'Viewer', 1);
  const editorLevel = await upsertAccessLevel('EDITOR', 'Editor', 2);
  const adminLevel = await upsertAccessLevel('ADMIN', 'Administrator', 3);
  await upsertAccessLevel('CREATOR', 'Creator', 4);

  const platformModule = await upsertModule('platform', 'Platform', 1);
  const rbacModule = await upsertModule('rbac', 'RBAC', 2);
  const organizationsModule = await upsertModule('organizations', 'Organizations', 3);

  const platformSettings = await upsertSubModule(platformModule.id, 'platform_settings', 'Platform Settings', 1);
  const rbacManagement = await upsertSubModule(rbacModule.id, 'rbac_management', 'RBAC Management', 1);
  const organizationManagement = await upsertSubModule(
    organizationsModule.id,
    'organization_management',
    'Organization Management',
    1,
  );
  const organizationMembers = await upsertSubModule(
    organizationsModule.id,
    'organization_members',
    'Organization Members',
    2,
  );

  const platformOverview = await upsertFunctionality(platformSettings.id, 'platform.overview', 'Platform Overview', 'view', 1);
  const roleManagement = await upsertFunctionality(rbacManagement.id, 'rbac.manage_roles', 'Manage Roles', 'view', 1);
  const moduleManagement = await upsertFunctionality(rbacManagement.id, 'rbac.manage_modules', 'Manage Modules', 'view', 2);
  const accessLevelManagement = await upsertFunctionality(
    rbacManagement.id,
    'rbac.manage_access_levels',
    'Manage Access Levels',
    'view',
    3,
  );

  const orgProfile = await upsertFunctionality(
    organizationManagement.id,
    'organizations.profile',
    'Organization Profile',
    'edit',
    1,
    'View and edit the organization profile.',
  );
  const orgStatus = await upsertFunctionality(
    organizationManagement.id,
    'organizations.status',
    'Organization Status',
    'edit',
    2,
    'Activate, deactivate or suspend an organization.',
  );
  const orgPlatformAccess = await upsertFunctionality(
    organizationManagement.id,
    'organizations.platform_access',
    'Cross-Organization Access',
    'view',
    3,
    'Global roles only: applies the role’s organization permissions to every organization.',
  );
  const orgMembers = await upsertFunctionality(
    organizationMembers.id,
    'organizations.members',
    'Organization Members',
    'edit',
    1,
    'View, invite, suspend and remove members.',
  );
  const orgMemberRoles = await upsertFunctionality(
    organizationMembers.id,
    'organizations.member_roles',
    'Member Role Assignment',
    'edit',
    2,
    'Assign and remove organization roles.',
  );
  const orgOwnership = await upsertFunctionality(
    organizationMembers.id,
    'organizations.ownership',
    'Ownership Transfer',
    'edit',
    3,
    'Transfer organization ownership (owners only).',
  );

  const superAdminRole = await upsertRole('SUPER_ADMIN', 'Super Admin', adminLevel.id, 'system');
  const adminRole = await upsertRole('ADMIN', 'Administrator', adminLevel.id, 'system');
  const userRole = await upsertRole('USER', 'User', viewerLevel.id, 'platform');
  await upsertRole('PROFESSIONAL', 'Professional', viewerLevel.id, 'professional', null, 'Individual professional profile (user-level role).');

  const buyerAdmin = await upsertRole('BUYER_ADMIN', 'Buyer Admin', adminLevel.id, 'organization', 'BUYER', 'Administers a buyer organization.');
  const buyerUser = await upsertRole('BUYER_USER', 'Buyer User', viewerLevel.id, 'organization', 'BUYER', 'Member of a buyer organization.');
  const providerAdmin = await upsertRole('PROVIDER_ADMIN', 'Provider Admin', adminLevel.id, 'organization', 'PROVIDER', 'Administers a provider organization.');
  const providerUser = await upsertRole('PROVIDER_USER', 'Provider User', viewerLevel.id, 'organization', 'PROVIDER', 'Member of a provider organization.');

  for (const functionality of [platformOverview, roleManagement, moduleManagement, accessLevelManagement]) {
    await upsertRolePermission(superAdminRole.id, functionality.id, adminLevel.id, FULL);
  }
  await upsertRolePermission(adminRole.id, roleManagement.id, editorLevel.id, {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canConfigure: false,
  });
  await upsertRolePermission(userRole.id, platformOverview.id, viewerLevel.id, VIEW_ONLY);

  // Platform operations: SUPER_ADMIN reaches every organization through cross-organization access.
  // ADMIN intentionally receives no organization permissions by default.
  for (const functionality of [orgProfile, orgStatus, orgPlatformAccess, orgMembers, orgMemberRoles, orgOwnership]) {
    await upsertRolePermission(superAdminRole.id, functionality.id, adminLevel.id, FULL);
  }

  for (const role of [providerAdmin, buyerAdmin]) {
    await upsertRolePermission(role.id, orgProfile.id, adminLevel.id, { canView: true, canEdit: true, canCreate: false, canDelete: false, canConfigure: false });
    await upsertRolePermission(role.id, orgMembers.id, adminLevel.id, { canView: true, canCreate: true, canEdit: true, canDelete: true, canConfigure: false });
    await upsertRolePermission(role.id, orgMemberRoles.id, adminLevel.id, { canView: true, canCreate: true, canEdit: false, canDelete: true, canConfigure: false });
    await upsertRolePermission(role.id, orgOwnership.id, adminLevel.id, { canView: true, canEdit: true, canCreate: false, canDelete: false, canConfigure: false });
  }

  for (const role of [providerUser, buyerUser]) {
    await upsertRolePermission(role.id, orgProfile.id, viewerLevel.id, VIEW_ONLY);
    await upsertRolePermission(role.id, orgMembers.id, viewerLevel.id, VIEW_ONLY);
    await upsertRolePermission(role.id, orgMemberRoles.id, viewerLevel.id, VIEW_ONLY);
  }

  // ---- Phase 4: marketplace taxonomy, provider profiles, professional profiles ----
  const marketplaceModule = await upsertModule('marketplace', 'Marketplace', 4);
  const providersModule = await upsertModule('providers', 'Providers', 5);
  const professionalsModule = await upsertModule('professionals', 'Professionals', 6);

  const marketplaceServices = await upsertSubModule(marketplaceModule.id, 'marketplace_services', 'Services', 1);
  const marketplaceStandards = await upsertSubModule(marketplaceModule.id, 'marketplace_standards', 'Standards', 2);
  const marketplaceIndustries = await upsertSubModule(marketplaceModule.id, 'marketplace_industries', 'Industries', 3);
  const marketplaceLocations = await upsertSubModule(marketplaceModule.id, 'marketplace_locations', 'Locations', 4);

  const taxonomyCategories = await upsertFunctionality(
    marketplaceServices.id,
    'marketplace.categories',
    'Service Categories',
    'edit',
    1,
    'View, create, edit and deactivate the service category hierarchy.',
  );
  const taxonomyServices = await upsertFunctionality(
    marketplaceServices.id,
    'marketplace.services',
    'Services',
    'edit',
    2,
    'View, create, edit and deactivate marketplace services.',
  );
  const taxonomyStandards = await upsertFunctionality(
    marketplaceStandards.id,
    'marketplace.standards',
    'Standards',
    'edit',
    1,
    'View, create, edit and deactivate standards.',
  );
  const taxonomyIndustries = await upsertFunctionality(
    marketplaceIndustries.id,
    'marketplace.industries',
    'Industries',
    'edit',
    1,
    'View and manage the industry hierarchy.',
  );
  const taxonomyLocations = await upsertFunctionality(
    marketplaceLocations.id,
    'marketplace.locations',
    'Locations',
    'edit',
    1,
    'View and manage locations.',
  );
  const taxonomyFunctionalities = [taxonomyCategories, taxonomyServices, taxonomyStandards, taxonomyIndustries, taxonomyLocations];

  const providerProfileSub = await upsertSubModule(providersModule.id, 'provider_profile', 'Profile', 1);
  const providerServicesSub = await upsertSubModule(providersModule.id, 'provider_services', 'Services', 2);
  const providerStandardsSub = await upsertSubModule(providersModule.id, 'provider_standards', 'Standards', 3);
  const providerIndustriesSub = await upsertSubModule(providersModule.id, 'provider_industries', 'Industries', 4);
  const providerLocationsSub = await upsertSubModule(providersModule.id, 'provider_locations', 'Locations', 5);

  const providerProfile = await upsertFunctionality(
    providerProfileSub.id,
    'providers.profile',
    'Provider Profile',
    'edit',
    1,
    'View, create and edit the provider profile of a PROVIDER organization.',
  );
  const providerServices = await upsertFunctionality(
    providerServicesSub.id,
    'providers.services',
    'Provider Services',
    'edit',
    1,
    'View and manage the services a provider offers.',
  );
  const providerStandards = await upsertFunctionality(
    providerStandardsSub.id,
    'providers.standards',
    'Provider Standards',
    'edit',
    1,
    'View and manage the standards a provider declares (not accreditation).',
  );
  const providerIndustries = await upsertFunctionality(
    providerIndustriesSub.id,
    'providers.industries',
    'Provider Industries',
    'edit',
    1,
    'View and manage the industries a provider serves.',
  );
  const providerLocations = await upsertFunctionality(
    providerLocationsSub.id,
    'providers.locations',
    'Provider Locations',
    'edit',
    1,
    'View and manage provider location coverage.',
  );
  const providerCapabilityFunctionalities = [providerServices, providerStandards, providerIndustries, providerLocations];

  const professionalProfileSub = await upsertSubModule(professionalsModule.id, 'professional_profile', 'Profile', 1);
  const professionalExperienceSub = await upsertSubModule(professionalsModule.id, 'professional_experience', 'Experience', 2);

  const professionalProfile = await upsertFunctionality(
    professionalProfileSub.id,
    'professionals.profile',
    'Professional Profile',
    'edit',
    1,
    'View, create and edit one’s own professional profile.',
  );
  const professionalExperience = await upsertFunctionality(
    professionalExperienceSub.id,
    'professionals.experience',
    'Professional Experience',
    'edit',
    1,
    'View and manage one’s own professional experience.',
  );

  const professionalRole = await prisma.role.findUniqueOrThrow({ where: { code: 'PROFESSIONAL' } });

  const MANAGE: Flags = { canView: true, canCreate: true, canEdit: true, canDelete: true, canConfigure: false };
  const VIEW_CREATE_EDIT: Flags = { canView: true, canCreate: true, canEdit: true, canDelete: false, canConfigure: false };

  // Taxonomy master data: platform roles only. Provider roles never receive these.
  for (const functionality of taxonomyFunctionalities) {
    await upsertRolePermission(superAdminRole.id, functionality.id, adminLevel.id, FULL);
    await upsertRolePermission(adminRole.id, functionality.id, editorLevel.id, VIEW_CREATE_EDIT);
  }

  // Provider profiles: SUPER_ADMIN reaches them through organizations.platform_access; ADMIN does not.
  for (const functionality of [providerProfile, ...providerCapabilityFunctionalities]) {
    await upsertRolePermission(superAdminRole.id, functionality.id, adminLevel.id, FULL);
    await upsertRolePermission(providerUser.id, functionality.id, viewerLevel.id, VIEW_ONLY);
  }
  await upsertRolePermission(providerAdmin.id, providerProfile.id, adminLevel.id, VIEW_CREATE_EDIT);
  for (const functionality of providerCapabilityFunctionalities) {
    await upsertRolePermission(providerAdmin.id, functionality.id, adminLevel.id, MANAGE);
  }

  await upsertRolePermission(professionalRole.id, professionalProfile.id, viewerLevel.id, VIEW_CREATE_EDIT);
  await upsertRolePermission(professionalRole.id, professionalExperience.id, viewerLevel.id, MANAGE);

  return { superAdminRole, adminRole, userRole, buyerAdmin, buyerUser, providerAdmin, providerUser, professionalRole };
}

export async function upsertUser(
  prisma: PrismaClient,
  user: { email: string; firstName: string; lastName: string },
  password = DEMO_PASSWORD,
) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email: user.email },
    update: { firstName: user.firstName, lastName: user.lastName, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
    create: { ...user, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
}

export async function assignGlobalRole(prisma: PrismaClient, userId: string, roleCode: string) {
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    return;
  }
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
}

async function ensureOrganization(prisma: PrismaClient, data: (typeof DEMO_ORGANIZATIONS)[keyof typeof DEMO_ORGANIZATIONS]) {
  const existing = await prisma.organization.findFirst({ where: { legalName: data.legalName } });
  return existing ?? prisma.organization.create({ data: { ...data, status: 'ACTIVE' } });
}

async function ensureMembership(
  prisma: PrismaClient,
  organizationId: string,
  userId: string,
  roleCode: string,
  isOwner = false,
) {
  const now = new Date();
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  const existing = await prisma.organizationUser.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { joinedAt: true },
  });
  const membership = await prisma.organizationUser.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    update: { membershipStatus: 'ACTIVE', isOwner, joinedAt: existing?.joinedAt ?? now },
    create: { organizationId, userId, membershipStatus: 'ACTIVE', isOwner, joinedAt: now },
  });
  await prisma.organizationUserRole.createMany({
    data: [{ organizationUserId: membership.id, roleId: role.id }],
    skipDuplicates: true,
  });
  return membership;
}

/**
 * Phase 3 demo scenario:
 *   ABC Certification (PROVIDER): John = owner + PROVIDER_ADMIN, Rahul = PROVIDER_USER
 *   XYZ Testing Labs  (PROVIDER): Priya = owner + PROVIDER_ADMIN (John is NOT a member)
 *   Acme Industries   (BUYER):    Ananya = owner + BUYER_ADMIN, Rahul = BUYER_ADMIN
 * Rahul belongs to two organizations with different roles, which exercises the switcher.
 */
export async function seedDemoOrganizations(prisma: PrismaClient) {
  const john = await upsertUser(prisma, DEMO_USERS.john);
  const rahul = await upsertUser(prisma, DEMO_USERS.rahul);
  const priya = await upsertUser(prisma, DEMO_USERS.priya);
  const ananya = await upsertUser(prisma, DEMO_USERS.ananya);

  const abc = await ensureOrganization(prisma, DEMO_ORGANIZATIONS.abc);
  const xyz = await ensureOrganization(prisma, DEMO_ORGANIZATIONS.xyz);
  const acme = await ensureOrganization(prisma, DEMO_ORGANIZATIONS.acme);

  await ensureMembership(prisma, abc.id, john.id, 'PROVIDER_ADMIN', true);
  await ensureMembership(prisma, abc.id, rahul.id, 'PROVIDER_USER');
  await ensureMembership(prisma, xyz.id, priya.id, 'PROVIDER_ADMIN', true);
  await ensureMembership(prisma, acme.id, ananya.id, 'BUYER_ADMIN', true);
  await ensureMembership(prisma, acme.id, rahul.id, 'BUYER_ADMIN');

  return { users: { john, rahul, priya, ananya }, organizations: { abc, xyz, acme } };
}
