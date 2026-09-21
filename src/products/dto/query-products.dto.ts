import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Model3dStatus, ProductStatus } from '../../common/constants/enums';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';

export class QueryProductsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category id.',
    example: '665f1c9e8b3e2a0012345678',
  })
  @IsOptional()
  @IsMongoId({ message: 'category must be a valid id.' })
  category?: string;

  @ApiPropertyOptional({
    description: 'Minimum price in Naira.',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price in Naira.',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Only NAFDAC-verified products when true.',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  nafdacVerified?: boolean;

  @ApiPropertyOptional({
    enum: ProductStatus,
    description:
      'Filter by lifecycle status (public listings default to ACTIVE).',
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    enum: Model3dStatus,
    description: 'Filter by 3D generation status.',
  })
  @IsOptional()
  @IsEnum(Model3dStatus)
  model3dStatus?: Model3dStatus;
}
