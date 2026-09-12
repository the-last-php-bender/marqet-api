import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/guards/roles.guard';
import { CreateOrderDto, QueryOrdersDto } from '../dto/order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrderService } from '../service/order.service';
import { Order } from '../schemas/order.schema';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrderController {
	constructor(private readonly orderService: OrderService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: 'Place an order',
		description:
			'Purchases products. Prices and totals are computed SERVER-SIDE from current DB values — whatever the client ' +
			'sends for quantities only; prices are never trusted. Products must be ACTIVE.',
	})
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Order created.', type: Order })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'A product is not purchasable yet.' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'One or more products do not exist.' })
	async create(@CurrentUser('userId') userId: string, @Body() dto: CreateOrderDto) {
		return this.orderService.create(userId, dto);
	}

	@Get()
	@ApiOperation({
		summary: 'List your orders (role-aware)',
		description:
			'Default (`view=purchases`) lists what you bought. `view=sales` lists orders containing items you sell ' +
			'(requires a store profile). Admins see all orders.',
	})
	@ApiResponse({ status: HttpStatus.OK, description: 'Paginated orders.' })
	async list(@CurrentUser() user: { userId: string; roles: UserRole[] }, @Query() query: QueryOrdersDto) {
		return this.orderService.findListForUser(user, query);
	}

	@Get(':id')
	@ApiParam({ name: 'id', description: 'Order id' })
	@ApiOperation({
		summary: 'Get an order',
		description: 'Visible to the buyer, any seller with an item on the order, and admins.',
	})
	@ApiResponse({ status: HttpStatus.OK, description: 'The order.', type: Order })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not your order and you do not sell on it.' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found.' })
	async getById(@CurrentUser() user: { userId: string; roles: UserRole[] }, @Param('id') orderId: string) {
		return this.orderService.findByIdForUser(orderId, user);
	}

	@Patch(':id/status')
	@ApiBearerAuth('access-token')
	@Roles(UserRole.USER, UserRole.ADMIN)
	@ApiParam({ name: 'id', description: 'Order id' })
	@ApiOperation({
		summary: 'Update order status (seller of an item on this order, or admin)',
		description: 'Lifecycle: PENDING → PROCESSING → SHIPPED → DELIVERED, with CANCELLED allowed until shipped.',
	})
	@ApiResponse({ status: HttpStatus.OK, description: 'Updated order.', type: Order })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid status transition.' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'You do not sell on this order.' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found.' })
	async updateStatus(
		@CurrentUser() user: { userId: string; roles: UserRole[] },
		@Param('id') orderId: string,
		@Body() dto: UpdateOrderStatusDto,
	) {
		return this.orderService.updateStatus(orderId, user, dto.status);
	}
}
