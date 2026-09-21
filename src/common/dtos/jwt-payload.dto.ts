import { UserRole } from '../constants/enums';

/**
 * Claims carried inside the RS256 JWT. `roles` is snapshotted at issue time;
 * when roles change, POST /vendors re-issues a token with the new role.
 */
export class JwtPayloadDto {
  sub: string;
  email: string;
  roles: UserRole[];
  iat?: number;
  exp?: number;
}
