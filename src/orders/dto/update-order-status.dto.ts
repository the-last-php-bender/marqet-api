import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../common/constants/enums';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    description:
      'Target status. Valid moves: PENDING→PROCESSING|CANCELLED, PROCESSING→SHIPPED|CANCELLED, SHIPPED→DELIVERED.',
    example: OrderStatus.PROCESSING,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
