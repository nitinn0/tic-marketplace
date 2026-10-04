import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getModules() {
    return this.prisma.moduleEntity.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        subModules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            functionalities: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  async createModule(dto: { name: string; code: string; description?: string; icon?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.moduleEntity.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateModule(id: string, dto: { name?: string; code?: string; description?: string; icon?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.moduleEntity.update({
      where: { id },
      data: dto,
    });
  }

  async deleteModule(id: string) {
    await this.prisma.moduleEntity.delete({ where: { id } });
    return { success: true };
  }

  async getSubModules() {
    return this.prisma.subModule.findMany({
      orderBy: [{ moduleId: 'asc' }, { sortOrder: 'asc' }],
      include: { module: true },
    });
  }

  async createSubModule(dto: { moduleId: string; name: string; code: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.subModule.create({
      data: {
        moduleId: dto.moduleId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getFunctionalities() {
    return this.prisma.functionality.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { subModule: true },
    });
  }

  async createFunctionality(dto: { subModuleId: string; name: string; code: string; description?: string; action: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.functionality.create({
      data: {
        subModuleId: dto.subModuleId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        action: dto.action,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getAccessLevels() {
    return this.prisma.accessLevel.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createAccessLevel(dto: { name: string; code: string; description?: string; sortOrder?: number; isSystem?: boolean; isActive?: boolean }) {
    return this.prisma.accessLevel.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isSystem: dto.isSystem ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        baselineAccessLevel: true,
        userRoles: {
          orderBy: { assignedAt: 'asc' },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, status: true },
            },
          },
        },
      },
    });

    return roles.map(({ userRoles, ...role }) => ({
      ...role,
      users: userRoles.map(({ user, assignedAt }) => ({ ...user, assignedAt })),
    }));
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        baselineAccessLevel: true,
        permissions: {
          include: { functionality: true, accessLevel: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async createRole(dto: { name: string; code: string; description?: string; category?: string; organizationType?: string; baselineAccessLevelId?: string; isSystem?: boolean; isActive?: boolean }) {
    return this.prisma.role.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        category: dto.category,
        organizationType: dto.organizationType,
        baselineAccessLevelId: dto.baselineAccessLevelId ?? null,
        isSystem: dto.isSystem ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRole(id: string, dto: { name?: string; code?: string; description?: string; category?: string; organizationType?: string; baselineAccessLevelId?: string; isActive?: boolean }) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem && dto.code && dto.code !== role.code) {
      throw new BadRequestException('Protected system roles cannot be renamed');
    }

    return this.prisma.role.update({
      where: { id },
      data: dto,
    });
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Protected system roles cannot be deleted');
    }

    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  async getRolePermissions(roleId: string) {
    const permissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { functionality: true, accessLevel: true },
    });

    return permissions;
  }

  async setRolePermissions(roleId: string, body: unknown) {
    const payload = body as {
      permissions?: Array<{
        functionalityId: string;
        accessLevelId?: string;
        canView?: boolean | null;
        canCreate?: boolean | null;
        canEdit?: boolean | null;
        canDelete?: boolean | null;
        canApprove?: boolean | null;
        canConfigure?: boolean | null;
      }>;
    };

    if (!payload.permissions) {
      throw new BadRequestException('Invalid permissions payload');
    }

    const permissions = payload.permissions;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId,
            functionalityId: permission.functionalityId,
            accessLevelId: permission.accessLevelId ?? null,
            canView: permission.canView ?? null,
            canCreate: permission.canCreate ?? null,
            canEdit: permission.canEdit ?? null,
            canDelete: permission.canDelete ?? null,
            canApprove: permission.canApprove ?? null,
            canConfigure: permission.canConfigure ?? null,
          })),
        });
      }
    });

    return { success: true };
  }

  async getAccessMatrix(accessLevelId: string) {
    return this.prisma.accessLevelPermission.findMany({
      where: { accessLevelId },
      include: { functionality: { include: { subModule: { include: { module: true } } } } },
    });
  }

  async setAccessLevelMatrix(accessLevelId: string, body: unknown) {
    const payload = body as {
      permissions?: Array<{
        functionalityId: string;
        canView?: boolean;
        canCreate?: boolean;
        canEdit?: boolean;
        canDelete?: boolean;
        canApprove?: boolean;
        canConfigure?: boolean;
      }>;
    };

    if (!payload.permissions) {
      throw new BadRequestException('Invalid access matrix payload');
    }

    const permissions = payload.permissions;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.accessLevelPermission.deleteMany({ where: { accessLevelId } });

      if (permissions.length > 0) {
        await tx.accessLevelPermission.createMany({
          data: permissions.map((permission) => ({
            accessLevelId,
            functionalityId: permission.functionalityId,
            canView: permission.canView ?? false,
            canCreate: permission.canCreate ?? false,
            canEdit: permission.canEdit ?? false,
            canDelete: permission.canDelete ?? false,
            canApprove: permission.canApprove ?? false,
            canConfigure: permission.canConfigure ?? false,
          })),
        });
      }
    });

    return { success: true };
  }

  async createUserWithRole(dto: { email: string; password: string; roleId: string }) {
    const email = dto.email.toLowerCase();

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: email.split('@')[0],
          lastName: '',
          status: 'ACTIVE',
        },
      });
      await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
      return created;
    });

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      role: { id: role.id, name: role.name, code: role.code },
    };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { email: 'asc' }],
      select: { id: true, email: true, firstName: true, lastName: true, status: true },
    });
  }

  async setRoleUsers(roleId: string, userIds: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const desired = new Set(userIds);
    const current = await this.prisma.userRole.findMany({ where: { roleId }, select: { userId: true } });
    const currentIds = new Set(current.map((entry) => entry.userId));
    const toRemove = [...currentIds].filter((id) => !desired.has(id));
    const toAdd = [...desired].filter((id) => !currentIds.has(id));

    if (role.isSystem && toRemove.length > 0) {
      throw new BadRequestException('Protected system roles cannot be removed from users');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { roleId, userId: { in: toRemove } } }),
      this.prisma.userRole.createMany({
        data: toAdd.map((userId) => ({ userId, roleId })),
        skipDuplicates: true,
      }),
    ]);

    return { success: true, added: toAdd.length, removed: toRemove.length };
  }

  async getUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
  }

  async assignRole(userId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.userRole.create({
      data: { userId, roleId },
    });
  }

  async removeRole(userId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Protected system roles cannot be removed from users');
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    return { success: true };
  }

  async hasPermission(userContext: { sub: string }, functionalityCode: string, action: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userContext.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                baselineAccessLevel: true,
                permissions: { include: { functionality: true, accessLevel: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    const actionName = action.toLowerCase();
    const permissionMatrix: Array<{
      canView?: boolean | null;
      canCreate?: boolean | null;
      canEdit?: boolean | null;
      canDelete?: boolean | null;
      canApprove?: boolean | null;
      canConfigure?: boolean | null;
      functionality: { code: string };
    }> = [];

    for (const userRole of user.roles) {
      const role = userRole.role;

      const baselinePermissionMap = await this.prisma.accessLevelPermission.findMany({
        where: { accessLevelId: role.baselineAccessLevelId ?? undefined },
        include: { functionality: true },
      });

      for (const entry of baselinePermissionMap) {
        permissionMatrix.push({
          canView: entry.canView,
          canCreate: entry.canCreate,
          canEdit: entry.canEdit,
          canDelete: entry.canDelete,
          canApprove: entry.canApprove,
          canConfigure: entry.canConfigure,
          functionality: entry.functionality,
        });
      }

      for (const entry of role.permissions) {
        const idx = permissionMatrix.findIndex((item) => item.functionality.code === entry.functionality.code);
        const permissionValues = {
          canView: entry.canView ?? null,
          canCreate: entry.canCreate ?? null,
          canEdit: entry.canEdit ?? null,
          canDelete: entry.canDelete ?? null,
          canApprove: entry.canApprove ?? null,
          canConfigure: entry.canConfigure ?? null,
          functionality: entry.functionality,
        };

        if (idx >= 0) {
          permissionMatrix[idx] = permissionValues;
        } else {
          permissionMatrix.push(permissionValues);
        }
      }
    }

    const permission = permissionMatrix.find((entry) => entry.functionality.code === functionalityCode);
    if (!permission) {
      return false;
    }

    const actionFlags = {
      view: permission.canView ?? false,
      create: permission.canCreate ?? false,
      edit: permission.canEdit ?? false,
      delete: permission.canDelete ?? false,
      approve: permission.canApprove ?? false,
      configure: permission.canConfigure ?? false,
    };

    return actionFlags[actionName as keyof typeof actionFlags] ?? false;
  }
}
