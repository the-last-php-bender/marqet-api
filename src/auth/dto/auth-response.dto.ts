import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/constants/enums';

/** Shape returned by /auth/register and /auth/login (also used for Swagger docs). */
export class AuthUserDto {
	@ApiProperty({ description: 'MongoDB ObjectId of the user.', example: '66e1a4c9f3b1a2b3c4d5e6f7' })
	_id: string;

	@ApiProperty({ example: 'ada@example.com' })
	email: string;

	@ApiProperty({ example: 'Ada Obi' })
	fullName: string;

	@ApiProperty({ enum: UserRole, isArray: true, example: [UserRole.USER] })
	roles: UserRole[];

	@ApiProperty({ format: 'date-time' })
	createdAt: Date;
}

export class AuthResponseDto {
	@ApiProperty({ description: 'RS256-signed JWT. Send as `Authorization: Bearer <token>`.', example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' })
	accessToken: string;

	@ApiProperty({ type: AuthUserDto })
	user: AuthUserDto;
}
