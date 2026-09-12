import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
	@ApiProperty({ description: 'Unique category name.', example: 'Drugs', minLength: 2, maxLength: 80 })
	@IsString()
	@MinLength(2)
	@MaxLength(80)
	name: string;

	@ApiProperty({
		description: 'Whether products in this category must pass a NAFDAC number check before listing.',
		example: true,
		default: false,
	})
	@IsBoolean()
	requiresNafdac: boolean;

	@ApiPropertyOptional({ description: 'Short human-readable description.', example: 'Medicines and supplements.', maxLength: 300 })
	@IsOptional()
	@IsString()
	@MaxLength(300)
	description?: string;
}
