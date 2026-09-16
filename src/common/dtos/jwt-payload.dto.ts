import { UserRole } from '../constants/enums';

/**
 * Claims carried inside the RS256 JWT.
 *
 * NOTE: `roles` is snapshotted at issue time. Because roles can change mid-session
 * (buyer upgrades to vendor without logging out), the server re-issues a fresh token
 * immediately after POST /vendors and the frontend swaps it in — see auth.service.ts.
 */
export class JwtPayloadDto {
  sub: string;
  email: string;
  roles: UserRole[];
  iat?: number;
  exp?: number;
}
