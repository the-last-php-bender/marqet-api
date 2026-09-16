import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { UserRole } from '../constants/enums';

export const ROLES_KEY = 'roles';

/**
 * Role gate metadata. Variadic for readable call sites:
 *   @Roles(UserRole.USER)   // any authenticated account
 *   @Roles(UserRole.ADMIN)  // operational routes only
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Checks the authenticated principal's role claims. There is deliberately no
 * BUYER/VENDOR split — every USER buys and sells with one account; only ADMIN
 * gates operational routes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { roles?: UserRole[] } | undefined;

    if (!user?.roles?.length) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    const hasRequiredRole = requiredRoles.some((role) =>
      user.roles!.includes(role),
    );
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
