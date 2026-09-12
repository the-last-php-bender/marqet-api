import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginRequestDto {
	@ApiProperty({ example: 'ada@example.com', format: 'email' })
	@IsEmail({}, { message: 'Please provide a valid email address.' })
	email: string;

	@ApiProperty({ example: 'Str0ngP@ss!' })
	@IsString()
	@MaxLength(72)
	password: string;
}
