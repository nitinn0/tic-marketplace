import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator.js';
import { RbacService } from '../rbac.service.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<{ functionality: string; action: string } | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ user?: { sub?: string } }>();
    if (!req.user?.sub) {
      throw new ForbiddenException('Authentication required');
    }

    const allowed = await this.rbacService.hasPermission(
      { sub: req.user.sub },
      required.functionality,
      required.action,
    );

    if (!allowed) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
