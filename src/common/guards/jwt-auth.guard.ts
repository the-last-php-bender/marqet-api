import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT guard (registered via APP_GUARD). Routes opt out with @Public().
 *
 * Roles can change mid-session (e.g. a buyer becomes a vendor). Instead of
 * re-reading the DB per request, POST /vendors re-issues a token with the new
 * role, keeping this guard stateless.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );
    if (isPublic) return true;

    return super.canActivate(context);
  }
}
