import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the authenticated principal or one of its fields:
 *   handler(@CurrentUser() user: AuthenticatedPrincipal)
 *   handler(@CurrentUser('userId') userId: string)
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: Record<string, unknown> }>();
    const user = request.user;
    return field && user ? user[field] : user;
  },
);
