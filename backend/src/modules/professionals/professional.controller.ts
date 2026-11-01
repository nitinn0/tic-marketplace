import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PROFESSIONAL_FUNCTIONALITIES as P } from '../rbac/constants/permission.constants.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { CreateExperienceDto, UpdateExperienceDto } from './dto/professional-experience.dto.js';
import {
  CreateProfessionalProfileDto,
  OnboardProfessionalDto,
  UpdateProfessionalProfileDto,
} from './dto/professional-profile.dto.js';
import { ProfessionalProfilesService } from './services/professional-profiles.service.js';

/**
 * The caller's own professional profile. User-level (no organization context); access comes from
 * global roles, e.g. the PROFESSIONAL role. `/onboard` is the self-serve join path and only needs auth.
 */
@Controller('professional')
export class ProfessionalController {
  constructor(private readonly profiles: ProfessionalProfilesService) {}

  @Post('onboard')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  onboard(@CurrentUser() user: AuthenticatedUser, @Body() dto: OnboardProfessionalDto) {
    return this.profiles.onboard(user.sub, dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(P.profile, 'view')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.get(user.sub);
  }

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(P.profile, 'create')
  createProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProfessionalProfileDto) {
    return this.profiles.create(user.sub, dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(P.profile, 'edit')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfessionalProfileDto) {
    return this.profiles.update(user.sub, dto);
  }

  @Get('experience')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(P.experience, 'view')
  listExperience(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.listExperience(user.sub);
  }

  @Post('experience')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(P.experience, 'create')
  createExperience(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExperienceDto) {
    return this.profiles.createExperience(user.sub, dto);
  }

  @Patch('experience/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(P.experience, 'edit')
  updateExperience(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.profiles.updateExperience(user.sub, id, dto);
  }

  @Delete('experience/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(P.experience, 'delete')
  deleteExperience(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.deleteExperience(user.sub, id);
  }
}
