import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service.js';
import {
  ACTION_TO_FLAG,
  PERMISSION_ACTIONS,
  PERMISSION_FLAGS,
  type PermissionAction,
  type PermissionFlags,
} from '../constants/permission.constants.js';

export type EffectivePermissions = Map<string, PermissionFlags>;

export type EffectivePermissionEntry = { functionalityCode: string } & PermissionFlags;

type NullableFlags = { [K in keyof PermissionFlags]?: boolean | null };

type FunctionalityRef = {
  code: string;
  isActive: boolean;
  subModule: { isActive: boolean; module: { isActive: boolean } };
};

const functionalitySelect = {
  select: {
    code: true,
    isActive: true,
    subModule: { select: { isActive: true, module: { select: { isActive: true } } } },
  },
} as const;

const flagSelect = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
  canConfigure: true,
} as const;

function isFunctionalityActive(functionality: FunctionalityRef) {
  return (
    functionality.isActive && functionality.subModule.isActive && functionality.subModule.module.isActive
  );
}

function emptyFlags(): PermissionFlags {
  return {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canConfigure: false,
  };
}

/**
 * Computes effective permissions for a set of roles using the Phase 2 model:
 *   role baseline access level -> access_level_permissions (per functionality)
 *   role_permissions override per functionality; a null flag inherits from the access level
 *   referenced by the override (or the role baseline when none is referenced).
 * Multiple roles combine as a union. Inactive roles, access levels and functionalities
 * (including inactive parent submodules/modules) never grant anything.
 */
@Injectable()
export class PermissionResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForRoles(roleIds: string[]): Promise<EffectivePermissions> {
    const result: EffectivePermissions = new Map();
    const uniqueRoleIds = [...new Set(roleIds)];
    if (uniqueRoleIds.length === 0) {
      return result;
    }

    const roles = await this.prisma.role.findMany({
      where: { id: { in: uniqueRoleIds }, isActive: true },
      select: {
        id: true,
        baselineAccessLevelId: true,
        permissions: {
          select: { accessLevelId: true, ...flagSelect, functionality: functionalitySelect },
        },
      },
    });

    const accessLevelIds = new Set<string>();
    for (const role of roles) {
      if (role.baselineAccessLevelId) {
        accessLevelIds.add(role.baselineAccessLevelId);
      }
      for (const permission of role.permissions) {
        if (permission.accessLevelId) {
          accessLevelIds.add(permission.accessLevelId);
        }
      }
    }

    const levelMatrix = new Map<string, Map<string, PermissionFlags>>();
    if (accessLevelIds.size > 0) {
      const levelPermissions = await this.prisma.accessLevelPermission.findMany({
        where: { accessLevelId: { in: [...accessLevelIds] }, accessLevel: { isActive: true } },
        select: { accessLevelId: true, ...flagSelect, functionality: functionalitySelect },
      });

      for (const entry of levelPermissions) {
        if (!isFunctionalityActive(entry.functionality)) {
          continue;
        }
        const matrix = levelMatrix.get(entry.accessLevelId) ?? new Map<string, PermissionFlags>();
        matrix.set(entry.functionality.code, PermissionResolverService.pickFlags(entry));
        levelMatrix.set(entry.accessLevelId, matrix);
      }
    }

    for (const role of roles) {
      const baseline = role.baselineAccessLevelId ? levelMatrix.get(role.baselineAccessLevelId) : undefined;
      const rolePermissions = new Map<string, PermissionFlags>(baseline ?? []);

      for (const override of role.permissions) {
        if (!isFunctionalityActive(override.functionality)) {
          continue;
        }
        const code = override.functionality.code;
        const inherited = override.accessLevelId
          ? levelMatrix.get(override.accessLevelId)?.get(code)
          : baseline?.get(code);
        rolePermissions.set(code, PermissionResolverService.applyOverride(inherited, override));
      }

      for (const [code, flags] of rolePermissions) {
        result.set(code, PermissionResolverService.union(result.get(code), flags));
      }
    }

    return result;
  }

  static allows(permissions: EffectivePermissions, functionalityCode: string, action: string) {
    const flag = ACTION_TO_FLAG[action.toLowerCase() as PermissionAction];
    if (!flag) {
      return false;
    }
    return permissions.get(functionalityCode)?.[flag] ?? false;
  }

  static merge(...sets: EffectivePermissions[]): EffectivePermissions {
    const merged: EffectivePermissions = new Map();
    for (const set of sets) {
      for (const [code, flags] of set) {
        merged.set(code, PermissionResolverService.union(merged.get(code), flags));
      }
    }
    return merged;
  }

  /** True when every permission granted by `candidate` is also granted by `holder`. */
  static isSubset(candidate: EffectivePermissions, holder: EffectivePermissions) {
    for (const [code, flags] of candidate) {
      for (const action of PERMISSION_ACTIONS) {
        const flag = ACTION_TO_FLAG[action];
        if (flags[flag] && !holder.get(code)?.[flag]) {
          return false;
        }
      }
    }
    return true;
  }

  static toList(permissions: EffectivePermissions): EffectivePermissionEntry[] {
    return [...permissions.entries()]
      .filter(([, flags]) => PERMISSION_FLAGS.some((flag) => flags[flag]))
      .map(([functionalityCode, flags]) => ({ functionalityCode, ...flags }))
      .sort((a, b) => a.functionalityCode.localeCompare(b.functionalityCode));
  }

  private static pickFlags(source: NullableFlags): PermissionFlags {
    const flags = emptyFlags();
    for (const flag of PERMISSION_FLAGS) {
      flags[flag] = source[flag] ?? false;
    }
    return flags;
  }

  private static applyOverride(inherited: PermissionFlags | undefined, override: NullableFlags) {
    const flags = emptyFlags();
    for (const flag of PERMISSION_FLAGS) {
      flags[flag] = override[flag] ?? inherited?.[flag] ?? false;
    }
    return flags;
  }

  private static union(current: PermissionFlags | undefined, next: PermissionFlags): PermissionFlags {
    if (!current) {
      return { ...next };
    }
    const flags = emptyFlags();
    for (const flag of PERMISSION_FLAGS) {
      flags[flag] = current[flag] || next[flag];
    }
    return flags;
  }
}
