import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../../common/constants/enums';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Product to purchase.',
    example: '665f1c9e8b3e2a0012345679',
  })
  @IsMongoId({ message: 'productId must be a valid id.' })
  productId: string;

  @ApiProperty({ description: 'Units to buy.', example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Items being purchased.',
    type: [CreateOrderItemDto],
    example: [{ productId: '665f1c9e8b3e2a0012345679', quantity: 2 }],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required.' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class QueryOrdersDto {
  @ApiPropertyOptional({
    description:
      'Which side of the marketplace to list. `purchases` = things you bought (default), `sales` = orders containing your products.',
    enum: ['purchases', 'sales'],
    default: 'purchases',
  })
  @IsOptional()
  @IsEnum(['purchases', 'sales'])
  view?: 'purchases' | 'sales' = 'purchases';

  @ApiPropertyOptional({ enum: OrderStatus, description: 'Filter by status.' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Page number (1-based).',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page.',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
