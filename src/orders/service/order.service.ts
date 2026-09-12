import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatus, ProductStatus, UserRole } from '../../common/constants/enums';
import { PaginatedResult, paginate } from '../../common/utils/pagination.utils';
import { Product, ProductDocument } from '../../products/schemas/product.schema';
import { VendorService } from '../../vendors/service/vendor.service';
import { CreateOrderDto } from '../dto/order.dto';
import { QueryOrdersDto } from '../dto/order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { Order, OrderDocument, OrderItem } from '../schemas/order.schema';

/** Allowed lifecycle transitions — anything else is a 400. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	[OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
	[OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
	[OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
	[OrderStatus.DELIVERED]: [],
	[OrderStatus.CANCELLED]: [],
};

interface RequestingUser {
	userId: string;
	roles: UserRole[];
}

/**
 * Order use-cases: purchase creation (server-priced), role-aware listing and
 * guarded status transitions. Money math NEVER trusts the client — totals are
 * recomputed from DB prices at creation time.
 */
@Injectable()
export class OrderService {
	constructor(
		@InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
		@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
		private readonly vendorService: VendorService,
	) {}

	async create(buyerId: string, dto: CreateOrderDto): Promise<OrderDocument> {
		const productIds = dto.items.map((item) => new Types.ObjectId(item.productId));
		const products = await this.productModel.find({ _id: { $in: productIds }, isDeleted: false }).exec();

		if (products.length !== new Set(dto.items.map((item) => item.productId)).size) {
			throw new NotFoundException('One or more products do not exist.');
		}

		const unavailable = products.find((product) => product.status !== ProductStatus.ACTIVE);
		if (unavailable) {
			throw new BadRequestException(`Product "${unavailable.productName}" is not available for purchase yet.`);
		}

		const items: OrderItem[] = dto.items.map((item) => {
			const product = products.find((candidate) => candidate._id.toString() === item.productId)!;
			return {
				product: product._id,
				vendor: product.vendor,
				productName: product.productName,
				unitPrice: product.price,
				quantity: item.quantity,
			};
		});

		const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

		return this.orderModel.create({
			buyer: new Types.ObjectId(buyerId),
			items,
			totalAmount,
			status: OrderStatus.PENDING,
		});
	}

	async findByIdForUser(orderId: string, user: RequestingUser): Promise<OrderDocument> {
		const order = await this.findByIdOrThrow(orderId);
		await this.assertCanView(order, user);
		return order;
	}

	async findListForUser(user: RequestingUser, query: QueryOrdersDto): Promise<PaginatedResult<Order>> {
		const filter: Record<string, unknown> = {};

		if (!user.roles.includes(UserRole.ADMIN)) {
			if (query.view === 'sales') {
				const vendor = await this.vendorService.findByUserIdOrThrow(user.userId);
				filter['items.vendor'] = vendor._id;
			} else {
				filter.buyer = new Types.ObjectId(user.userId);
			}
		}
		if (query.status) filter.status = query.status;

		return paginate({
			model: this.orderModel,
			filter,
			params: query,
			populate: [
				{ path: 'buyer', select: 'fullName email' },
				{ path: 'items.product', select: 'productName images model3dUrl model3dStatus status' },
			],
		});
	}

	async updateStatus(
		orderId: string,
		user: RequestingUser,
		nextStatus: UpdateOrderStatusDto['status'],
	): Promise<OrderDocument> {
		const order = await this.findByIdOrThrow(orderId);

		if (!user.roles.includes(UserRole.ADMIN)) {
			await this.assertSellsOnOrder(order, user);
		}

		const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
		if (!allowed.includes(nextStatus)) {
			throw new BadRequestException(`Cannot move an order from ${order.status} to ${nextStatus}.`);
		}

		order.set({ status: nextStatus });
		await order.save();
		return order;
	}

	private async findByIdOrThrow(orderId: string): Promise<OrderDocument> {
		const order = await this.orderModel.findById(orderId).populate('buyer', 'fullName email').exec();
		if (!order) throw new NotFoundException('Order not found.');
		return order;
	}

	private async assertCanView(order: OrderDocument, user: RequestingUser): Promise<void> {
		if (user.roles.includes(UserRole.ADMIN)) return;
		const buyerRef = (order.buyer as unknown as { _id: Types.ObjectId })._id;
		if (buyerRef && buyerRef.toString() === user.userId) return;
		await this.assertSellsOnOrder(order, user);
	}

	private async assertSellsOnOrder(order: OrderDocument, user: RequestingUser): Promise<void> {
		try {
			const vendor = await this.vendorService.findByUserIdOrThrow(user.userId);
			if (order.items.some((item) => item.vendor.toString() === vendor._id.toString())) return;
		} catch {
			// caller has no store profile — definitely not the seller
		}
		throw new ForbiddenException('You do not have access to this order.');
	}
}
