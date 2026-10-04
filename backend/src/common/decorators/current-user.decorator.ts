import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export type AuthenticatedUser = { sub: string; email?: string };

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
  if (!request.user?.sub) {
    throw new UnauthorizedException('Authentication required');
  }
  return request.user;
});
