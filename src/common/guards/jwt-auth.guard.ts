import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT guard (registered via APP_GUARD). Routes opt out with @Public().
 *
 * ARCHITECTURAL DECISION (role upgrade): roles can change mid-session because a
 * buyer becomes a vendor without logging out. Rather than having this guard
 * re-check the DB on every request (stateful), we chose option (a) from the spec:
 * POST /vendors re-issues a fresh token containing the VENDOR role and the
 * frontend swaps it in. That keeps this guard fully stateless.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	constructor(private reflector: Reflector) {
		super();
	}

	canActivate(context: ExecutionContext) {
		const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler());
		if (isPublic) return true;

		return super.canActivate(context);
	}
}
