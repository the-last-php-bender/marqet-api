import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto';

/**
 * Injects the authenticated principal or one of its fields:
 *   handler(@CurrentUser() user: AuthenticatedPrincipal)
 *   handler(@CurrentUser('userId') userId: string)
 */
export const CurrentUser = createParamDecorator((field: string | undefined, ctx: ExecutionContext) => {
	const request = ctx.switchToHttp().getRequest();
	const user = request.user;
	return field && user ? user[field] : user;
});
