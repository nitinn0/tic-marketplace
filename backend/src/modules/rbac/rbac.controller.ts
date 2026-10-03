import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RequirePermission } from './decorators/require-permission.decorator.js';
import { PermissionGuard } from './guards/permission.guard.js';
import { RbacService } from './rbac.service.js';
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';
import { CreateSubModuleDto } from './dto/create-submodule.dto.js';
import { CreateFunctionalityDto } from './dto/create-functionality.dto.js';
import { CreateAccessLevelDto } from './dto/create-access-level.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@UseGuards(JwtAuthGuard, PermissionGuard)

@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('modules')
  @RequirePermission('rbac.manage_modules', 'view')
  async getModules() {
    return this.rbacService.getModules();
  }

  @Post('modules')
  @RequirePermission('rbac.manage_modules', 'create')
  async createModule(@Body() dto: CreateModuleDto) {
    return this.rbacService.createModule(dto);
  }

  @Patch('modules/:id')
  @RequirePermission('rbac.manage_modules', 'edit')
  async updateModule(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    return this.rbacService.updateModule(id, dto);
  }

  @Delete('modules/:id')
  @RequirePermission('rbac.manage_modules', 'delete')
  async deleteModule(@Param('id') id: string) {
    return this.rbacService.deleteModule(id);
  }

  @Get('submodules')
  @RequirePermission('rbac.manage_modules', 'view')
  async getSubModules() {
    return this.rbacService.getSubModules();
  }

  @Post('submodules')
  @RequirePermission('rbac.manage_modules', 'create')
  async createSubModule(@Body() dto: CreateSubModuleDto) {
    return this.rbacService.createSubModule(dto);
  }

  @Get('functionalities')
  @RequirePermission('rbac.manage_modules', 'view')
  async getFunctionalities() {
    return this.rbacService.getFunctionalities();
  }

  @Post('functionalities')
  @RequirePermission('rbac.manage_modules', 'create')
  async createFunctionality(@Body() dto: CreateFunctionalityDto) {
    return this.rbacService.createFunctionality(dto);
  }

  @Get('access-levels')
  @RequirePermission('rbac.manage_access_levels', 'view')
  async getAccessLevels() {
    return this.rbacService.getAccessLevels();
  }

  @Post('access-levels')
  @RequirePermission('rbac.manage_access_levels', 'create')
  async createAccessLevel(@Body() dto: CreateAccessLevelDto) {
    return this.rbacService.createAccessLevel(dto);
  }

  @Get('roles')
  @RequirePermission('rbac.manage_roles', 'view')
  async getRoles() {
    return this.rbacService.getRoles();
  }

  @Post('roles')
  @RequirePermission('rbac.manage_roles', 'create')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Get('roles/:id')
  @RequirePermission('rbac.manage_roles', 'view')
  async getRole(@Param('id') id: string) {
    return this.rbacService.getRole(id);
  }

  @Patch('roles/:id')
  @RequirePermission('rbac.manage_roles', 'edit')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermission('rbac.manage_roles', 'delete')
  async deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  @Get('roles/:id/permissions')
  @RequirePermission('rbac.manage_roles', 'view')
  async getRolePermissions(@Param('id') id: string) {
    return this.rbacService.getRolePermissions(id);
  }

  @Put('roles/:id/permissions')
  @RequirePermission('rbac.manage_roles', 'edit')
  async putRolePermissions(@Param('id') id: string, @Body() body: unknown) {
    return this.rbacService.setRolePermissions(id, body);
  }

  @Get('access-levels/:id/matrix')
  @RequirePermission('rbac.manage_access_levels', 'view')
  async getAccessMatrix(@Param('id') id: string) {
    return this.rbacService.getAccessMatrix(id);
  }

  @Put('access-levels/:id/matrix')
  @RequirePermission('rbac.manage_access_levels', 'configure')
  async putAccessMatrix(@Param('id') id: string, @Body() body: unknown) {
    return this.rbacService.setAccessLevelMatrix(id, body);
  }

  @Get('users/:userId/roles')
  @RequirePermission('rbac.manage_roles', 'view')
  async getUserRoles(@Param('userId') userId: string) {
    return this.rbacService.getUserRoles(userId);
  }

  @Post('users/:userId/roles')
  @RequirePermission('rbac.manage_roles', 'create')
  async assignRole(@Param('userId') userId: string, @Body() body: { roleId: string }) {
    return this.rbacService.assignRole(userId, body.roleId);
  }

  @Delete('users/:userId/roles/:roleId')
  @RequirePermission('rbac.manage_roles', 'delete')
  async removeRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.rbacService.removeRole(userId, roleId);
  }

  @Get('permissions/check')
  @RequirePermission('rbac.manage_roles', 'view')
  async checkPermission(
    @Req() req: Request,
    @Body() body: { functionalityCode: string; action: string },
  ) {
    return this.rbacService.hasPermission(req.user as { sub: string }, body.functionalityCode, body.action);
  }
}
