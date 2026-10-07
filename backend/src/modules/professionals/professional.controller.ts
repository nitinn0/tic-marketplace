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
import { CreateProfessionalProfileDto, UpdateProfessionalProfileDto } from './dto/professional-profile.dto.js';
import { ProfessionalProfilesService } from './services/professional-profiles.service.js';

/**
 * The caller's own professional profile. User-level (no organization context); access comes from
 * global roles, e.g. the PROFESSIONAL role.
 */
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('professional')
export class ProfessionalController {
  constructor(private readonly profiles: ProfessionalProfilesService) {}

  @Get('profile')
  @RequirePermission(P.profile, 'view')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.get(user.sub);
  }

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(P.profile, 'create')
  createProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProfessionalProfileDto) {
    return this.profiles.create(user.sub, dto);
  }

  @Patch('profile')
  @RequirePermission(P.profile, 'edit')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfessionalProfileDto) {
    return this.profiles.update(user.sub, dto);
  }

  @Get('experience')
  @RequirePermission(P.experience, 'view')
  listExperience(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.listExperience(user.sub);
  }

  @Post('experience')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(P.experience, 'create')
  createExperience(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExperienceDto) {
    return this.profiles.createExperience(user.sub, dto);
  }

  @Patch('experience/:id')
  @RequirePermission(P.experience, 'edit')
  updateExperience(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.profiles.updateExperience(user.sub, id, dto);
  }

  @Delete('experience/:id')
  @RequirePermission(P.experience, 'delete')
  deleteExperience(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.deleteExperience(user.sub, id);
  }
}
