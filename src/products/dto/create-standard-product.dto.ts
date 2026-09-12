import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { LengthUnit } from '../../common/constants/enums';

/**
 * Shape for products in NON-regulated categories (requiresNafdac === false).
 * Kept separate from the NAFDAC DTO (Interface Segregation) — no wall of @IsOptional().
 */
export class CreateStandardProductDto {
	@ApiProperty({ description: 'Category the product belongs to.', example: '665f1c9e8b3e2a0012345678' })
	@IsMongoId({ message: 'categoryId must be a valid id.' })
	categoryId: string;

	@ApiProperty({ example: 'Wireless Earbuds Pro', minLength: 2, maxLength: 150 })
	@IsString()
	@MinLength(2)
	@MaxLength(150)
	productName: string;

	@ApiProperty({ example: 'Noise-cancelling earbuds with 30h battery life.', maxLength: 3000 })
	@IsString()
	@MinLength(10)
	@MaxLength(3000)
	description: string;

	@ApiProperty({ description: 'Selling price in Naira.', example: 25000, minimum: 0 })
	@Type(() => Number)
	@IsNumber({}, { message: 'price must be a number.' })
	@Min(0)
	price: number;

	@ApiProperty({ description: 'Real-world width — used to scale the 3D model.', example: 6.5, minimum: 0 })
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	widthValue: number;

	@ApiProperty({ description: 'Real-world height — used to scale the 3D model.', example: 4.8, minimum: 0 })
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	heightValue: number;

	@ApiPropertyOptional({ enum: LengthUnit, default: LengthUnit.CM, example: LengthUnit.CM })
	@IsOptional()
	@IsEnum(LengthUnit)
	sizeUnit?: LengthUnit = LengthUnit.CM;
}
