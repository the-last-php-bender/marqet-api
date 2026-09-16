import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        privateKey: Buffer.from(
          configService.getOrThrow<string>('JWT_PRIVATE_KEY_BASE64'),
          'base64',
        ).toString('utf8'),
        publicKey: Buffer.from(
          configService.getOrThrow<string>('JWT_PUBLIC_KEY_BASE64'),
          'base64',
        ).toString('utf8'),
        signOptions: { algorithm: 'RS256' },
        verifyOptions: { algorithms: ['RS256'] },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
