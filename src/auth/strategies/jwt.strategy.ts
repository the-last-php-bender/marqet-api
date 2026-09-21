import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadDto } from '../../common/dtos/jwt-payload.dto';

export interface AuthenticatedPrincipal {
  userId: string;
  email: string;
  roles: JwtPayloadDto['roles'];
}

/**
 * Verifies RS256-signed tokens using the public key only.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: Buffer.from(
        configService.getOrThrow<string>('JWT_PUBLIC_KEY_BASE64'),
        'base64',
      ).toString('utf8'),
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayloadDto): AuthenticatedPrincipal {
    if (!payload.sub) throw new UnauthorizedException('Invalid token payload.');
    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}
