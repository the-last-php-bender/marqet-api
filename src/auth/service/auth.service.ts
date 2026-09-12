import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserDocument } from '../../users/schemas/user.schema';
import { UserService } from '../../users/service/user.service';
import { LoginRequestDto } from '../dto/login-request.dto';
import { RegisterRequestDto } from '../dto/register-request.dto';
import { JwtPayloadDto } from '../../common/dtos/jwt-payload.dto';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Authentication use-cases. Token issuing is centralised here so the signing
 * algorithm and claims live in exactly one place.
 */
@Injectable()
export class AuthService {
	constructor(
		private readonly userService: UserService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {}

	async register(dto: RegisterRequestDto): Promise<{ user: UserDocument; accessToken: string }> {
		const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
		const user = await this.userService.create({
			email: dto.email,
			passwordHash,
			fullName: dto.fullName.trim(),
		});
		return { user, accessToken: this.issueToken(user) };
	}

	async login(dto: LoginRequestDto): Promise<{ user: UserDocument; accessToken: string }> {
		const user = await this.userService.findByEmail(dto.email);
		// Same generic message for unknown email and wrong password (no account enumeration).
		if (!user) throw new UnauthorizedException('Invalid email or password.');

		const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
		if (!passwordMatches) throw new UnauthorizedException('Invalid email or password.');

		return { user, accessToken: this.issueToken(user) };
	}

	async getProfile(userId: string): Promise<UserDocument> {
		return this.userService.findByIdOrThrow(userId);
	}

	private issueToken(user: UserDocument): string {
		const payload: Pick<JwtPayloadDto, 'sub' | 'email' | 'roles'> = {
			sub: user._id.toString(),
			email: user.email,
			roles: user.roles,
		};
		return this.jwtService.sign(payload, {
			algorithm: 'RS256',
			expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRES_IN') as JwtSignOptions['expiresIn'],
		});
	}
}
