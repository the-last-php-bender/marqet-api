import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { LengthUnit } from '../../common/constants/enums';

/**
 * Editable product fields ONLY.
 * Regulatory fields (nafdacNumber, expiryDate, nafdacVerified) and the
 * auto-filled productName are deliberately absent — they can never be
 * patched by clients, enforced by the type system itself.
 */
export class UpdateProductDto {
	@ApiPropertyOptional({ example: 'Updated description with more detail.', maxLength: 3000 })
	@IsOptional()
	@IsString()
	@MinLength(10)
	@MaxLength(3000)
	description?: string;

	@ApiPropertyOptional({ example: 19999, minimum: 0 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: 'price must be a number.' })
	@Min(0)
	price?: number;

	@ApiPropertyOptional({ description: 'Real-world width in `sizeUnit`.', example: 6.5, minimum: 0 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	widthValue?: number;

	@ApiPropertyOptional({ description: 'Real-world height in `sizeUnit`.', example: 4.8, minimum: 0 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	heightValue?: number;

	@ApiPropertyOptional({ enum: LengthUnit, example: LengthUnit.CM })
	@IsOptional()
	@IsEnum(LengthUnit)
	sizeUnit?: LengthUnit;
}
