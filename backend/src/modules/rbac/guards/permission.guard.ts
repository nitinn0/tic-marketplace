import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';

import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator.js';
import {
  ORGANIZATION_HEADER,
  ORGANIZATION_SCOPE_KEY,
  type OrganizationScopeOptions,
} from '../decorators/organization-scoped.decorator.js';
import { RbacService } from '../rbac.service.js';
import {
  OrganizationAccessService,
  type OrganizationAccessContext,
} from '../services/organization-access.service.js';

type GuardRequest = {
  user?: { sub?: string };
  params?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
  organizationContext?: OrganizationAccessContext;
};

/**
 * Authentication -> permission -> (organization membership -> organization roles ->
 * effective permission -> scope validation) -> controller.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const required = this.reflector.getAllAndOverride<{ functionality: string; action: string } | undefined>(
      REQUIRE_PERMISSION_KEY,
      targets,
    );
    const scope = this.reflector.getAllAndOverride<OrganizationScopeOptions | undefined>(
      ORGANIZATION_SCOPE_KEY,
      targets,
    );

    if (!required && !scope) {
      return true;
    }

    const req = context.switchToHttp().getRequest<GuardRequest>();
    if (!req.user?.sub) {
      throw new ForbiddenException('Authentication required');
    }

    if (scope) {
      const organizationId = this.extractOrganizationId(req, scope);
      const organizationContext = await this.organizationAccess.resolve(req.user.sub, organizationId, {
        requireMembership: scope.requireMembership,
      });

      const allowedTypes = scope.organizationTypes;
      if (allowedTypes?.length && !allowedTypes.includes(organizationContext.organization.organizationType)) {
        throw new ForbiddenException(
          `This feature is only available to ${allowedTypes.join(' or ')} organizations`,
        );
      }

      if (required) {
        this.organizationAccess.assertCan(organizationContext, required.functionality, required.action);
      }

      req.organizationContext = organizationContext;
      return true;
    }

    const allowed = await this.rbacService.hasPermission(
      { sub: req.user.sub },
      required!.functionality,
      required!.action,
    );

    if (!allowed) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }

  private extractOrganizationId(req: GuardRequest, scope: OrganizationScopeOptions) {
    const fromParam = scope.param ? req.params?.[scope.param] : undefined;
    const rawHeader = req.headers[ORGANIZATION_HEADER];
    const fromHeader = scope.allowHeader === false ? undefined : Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const organizationId = fromParam ?? fromHeader;

    if (!organizationId) {
      throw new BadRequestException('Organization context is required (X-Organization-Id header)');
    }
    if (!isUUID(organizationId)) {
      throw new BadRequestException('Invalid organization id');
    }
    return organizationId;
  }
}
