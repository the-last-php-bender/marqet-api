import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterRequestDto {
	@ApiProperty({ description: 'Unique account email.', example: 'ada@example.com', format: 'email' })
	@IsEmail({}, { message: 'Please provide a valid email address.' })
	email: string;

	@ApiProperty({ description: 'Account password (plaintext over HTTPS; stored bcrypt-hashed).', example: 'Str0ngP@ss!', minLength: 8, maxLength: 72 })
	@IsString()
	@MinLength(8, { message: 'Password must be at least 8 characters long.' })
	@MaxLength(72)
	password: string;

	@ApiProperty({ description: 'Display name of the account owner.', example: 'Ada Obi', maxLength: 120 })
	@IsString()
	@MinLength(2, { message: 'Full name must be at least 2 characters long.' })
	@MaxLength(120)
	fullName: string;
}
