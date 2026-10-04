import { createParamDecorator, ExecutionContext, InternalServerErrorException, SetMetadata } from '@nestjs/common';

import type { OrganizationAccessContext } from '../services/organization-access.service.js';

export const ORGANIZATION_SCOPE_KEY = 'organization_scope';
export const ORGANIZATION_HEADER = 'x-organization-id';

export type OrganizationScopeOptions = {
  /** Route parameter holding the organization id. Defaults to `organizationId`. */
  param?: string;
  /**
   * Fall back to the `X-Organization-Id` header when the route has no organization parameter.
   * Defaults to true. A route parameter always takes precedence over the header.
   */
  allowHeader?: boolean;
  /** Require an ACTIVE membership; platform-level access is not sufficient. */
  requireMembership?: boolean;
};

/**
 * Marks a handler (or controller) as organization-scoped. Combined with @RequirePermission the
 * PermissionGuard evaluates the permission against the user's roles in that organization instead
 * of their global roles, after verifying membership.
 */
export const OrganizationScoped = (options: OrganizationScopeOptions = {}) =>
  SetMetadata(ORGANIZATION_SCOPE_KEY, { param: 'organizationId', allowHeader: true, ...options });

export const CurrentOrganization = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ organizationContext?: OrganizationAccessContext }>();
  if (!request.organizationContext) {
    throw new InternalServerErrorException('Organization context was not resolved for this route');
  }
  return request.organizationContext;
});
