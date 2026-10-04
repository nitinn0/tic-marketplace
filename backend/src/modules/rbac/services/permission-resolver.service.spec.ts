import type { PrismaService } from '../../../database/prisma.service.js';
import type { PermissionFlags } from '../constants/permission.constants.js';
import { PermissionResolverService, type EffectivePermissions } from './permission-resolver.service.js';

type Flags = Partial<{ [K in keyof PermissionFlags]: boolean | null }>;

const activeFunctionality = (code: string, overrides: Partial<{ fn: boolean; sub: boolean; mod: boolean }> = {}) => ({
  code,
  isActive: overrides.fn ?? true,
  subModule: { isActive: overrides.sub ?? true, module: { isActive: overrides.mod ?? true } },
});

const flags = (value: Flags) => ({
  canView: null,
  canCreate: null,
  canEdit: null,
  canDelete: null,
  canApprove: null,
  canConfigure: null,
  ...value,
});

type RoleFixture = {
  id: string;
  isActive?: boolean;
  baselineAccessLevelId: string | null;
  permissions: Array<{ accessLevelId: string | null; functionality: ReturnType<typeof activeFunctionality> } & Flags>;
};

type LevelFixture = {
  accessLevelId: string;
  levelActive?: boolean;
  functionality: ReturnType<typeof activeFunctionality>;
} & Flags;

function createResolver(roles: RoleFixture[], levels: LevelFixture[]) {
  const prisma = {
    role: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        roles
          .filter((role) => where.id.in.includes(role.id) && (role.isActive ?? true))
          .map((role) => ({
            ...role,
            permissions: role.permissions.map((permission) => ({ ...flags({}), ...permission })),
          })),
      ),
    },
    accessLevelPermission: {
      findMany: vi.fn(async ({ where }: { where: { accessLevelId: { in: string[] } } }) =>
        levels
          .filter((level) => where.accessLevelId.in.includes(level.accessLevelId) && (level.levelActive ?? true))
          .map((level) => ({ ...flags({}), ...level })),
      ),
    },
  };
  return new PermissionResolverService(prisma as unknown as PrismaService);
}

describe('PermissionResolverService', () => {
  it('returns nothing for an empty role list', async () => {
    const resolver = createResolver([], []);
    expect((await resolver.resolveForRoles([])).size).toBe(0);
  });

  it('inherits baseline access level permissions', async () => {
    const resolver = createResolver(
      [{ id: 'r1', baselineAccessLevelId: 'viewer', permissions: [] }],
      [{ accessLevelId: 'viewer', functionality: activeFunctionality('orgs.profile'), canView: true }],
    );

    const perms = await resolver.resolveForRoles(['r1']);
    expect(PermissionResolverService.allows(perms, 'orgs.profile', 'view')).toBe(true);
    expect(PermissionResolverService.allows(perms, 'orgs.profile', 'edit')).toBe(false);
  });

  it('applies role overrides and inherits null flags from the baseline', async () => {
    const resolver = createResolver(
      [
        {
          id: 'r1',
          baselineAccessLevelId: 'viewer',
          permissions: [
            { accessLevelId: null, functionality: activeFunctionality('orgs.profile'), canEdit: true, canView: null },
          ],
        },
      ],
      [{ accessLevelId: 'viewer', functionality: activeFunctionality('orgs.profile'), canView: true }],
    );

    const perms = await resolver.resolveForRoles(['r1']);
    expect(PermissionResolverService.allows(perms, 'orgs.profile', 'view')).toBe(true);
    expect(PermissionResolverService.allows(perms, 'orgs.profile', 'edit')).toBe(true);
  });

  it('lets an explicit false override revoke a baseline grant', async () => {
    const resolver = createResolver(
      [
        {
          id: 'r1',
          baselineAccessLevelId: 'viewer',
          permissions: [{ accessLevelId: null, functionality: activeFunctionality('orgs.profile'), canView: false }],
        },
      ],
      [{ accessLevelId: 'viewer', functionality: activeFunctionality('orgs.profile'), canView: true }],
    );

    const perms = await resolver.resolveForRoles(['r1']);
    expect(PermissionResolverService.allows(perms, 'orgs.profile', 'view')).toBe(false);
  });

  it('combines multiple roles as a union instead of letting the last role win', async () => {
    const resolver = createResolver(
      [
        {
          id: 'editor',
          baselineAccessLevelId: null,
          permissions: [{ accessLevelId: null, functionality: activeFunctionality('orgs.profile'), canEdit: true }],
        },
        {
          id: 'viewer',
          baselineAccessLevelId: null,
          permissions: [{ accessLevelId: null, functionality: activeFunctionality('orgs.profile'), canView: true }],
        },
      ],
      [],
    );

    const perms = await resolver.resolveForRoles(['editor', 'viewer']);
    expect(PermissionResolverService.allows(perms, 'orgs.profile', 'view')).toBe(true);
    expect(PermissionResolverService.allows(perms, 'orgs.profile', 'edit')).toBe(true);
  });

  it('ignores inactive roles, access levels, functionalities and parent modules', async () => {
    const resolver = createResolver(
      [
        {
          id: 'inactive-role',
          isActive: false,
          baselineAccessLevelId: null,
          permissions: [{ accessLevelId: null, functionality: activeFunctionality('a'), canView: true }],
        },
        {
          id: 'r2',
          baselineAccessLevelId: 'inactive-level',
          permissions: [
            { accessLevelId: null, functionality: activeFunctionality('b', { fn: false }), canView: true },
            { accessLevelId: null, functionality: activeFunctionality('c', { sub: false }), canView: true },
            { accessLevelId: null, functionality: activeFunctionality('d', { mod: false }), canView: true },
          ],
        },
      ],
      [{ accessLevelId: 'inactive-level', levelActive: false, functionality: activeFunctionality('e'), canView: true }],
    );

    const perms = await resolver.resolveForRoles(['inactive-role', 'r2']);
    for (const code of ['a', 'b', 'c', 'd', 'e']) {
      expect(PermissionResolverService.allows(perms, code, 'view')).toBe(false);
    }
  });

  it('rejects unknown actions', () => {
    const perms: EffectivePermissions = new Map([
      ['x', { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true, canConfigure: true }],
    ]);
    expect(PermissionResolverService.allows(perms, 'x', 'destroy')).toBe(false);
  });

  describe('isSubset', () => {
    const grant = (value: Partial<PermissionFlags>): PermissionFlags => ({
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canConfigure: false,
      ...value,
    });

    it('is true when the holder covers every candidate grant', () => {
      const candidate: EffectivePermissions = new Map([['x', grant({ canView: true })]]);
      const holder: EffectivePermissions = new Map([['x', grant({ canView: true, canEdit: true })]]);
      expect(PermissionResolverService.isSubset(candidate, holder)).toBe(true);
    });

    it('is false when the candidate grants something the holder lacks', () => {
      const candidate: EffectivePermissions = new Map([['x', grant({ canEdit: true })]]);
      const holder: EffectivePermissions = new Map([['x', grant({ canView: true })]]);
      expect(PermissionResolverService.isSubset(candidate, holder)).toBe(false);
      expect(PermissionResolverService.isSubset(new Map([['y', grant({ canView: true })]]), holder)).toBe(false);
    });
  });
});
