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
 * Verifies RS256-signed tokens with the PUBLIC key only.
 * The private key never leaves the auth module — other services could verify
 * tokens with just this public key and could never mint valid ones.
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
