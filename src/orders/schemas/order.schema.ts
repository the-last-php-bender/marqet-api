import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from '../../common/constants/enums';

export type OrderDocument = HydratedDocument<Order>;

/** Line item snapshot — prices are frozen at purchase time (server-computed). */
@Schema({ _id: false })
export class OrderItem {
	@Prop({ type: Types.ObjectId, ref: 'Product', required: true })
	product: Types.ObjectId;

	@Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
	vendor: Types.ObjectId;

	@Prop({ required: true })
	productName: string;

	@Prop({ required: true, min: 0 })
	unitPrice: number;

	@Prop({ required: true, min: 1 })
	quantity: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

/**
 * An order can span multiple sellers; `items[].vendor` powers the
 * seller-side "sales" listing and per-seller access checks.
 */
@Schema({ timestamps: true })
export class Order {
	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	buyer: Types.ObjectId;

	@Prop({ type: [OrderItemSchema], required: true })
	items: OrderItem[];

	@Prop({ required: true, min: 0 })
	totalAmount: number;

	@Prop({ enum: OrderStatus, default: OrderStatus.PENDING })
	status: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Role-aware listing paths.
OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ 'items.vendor': 1, createdAt: -1 });
OrderSchema.index({ status: 1 });

OrderSchema.set('toJSON', {
	transform: (_doc, ret) => {
		const output = ret as unknown as Record<string, unknown>;
		delete output.__v;
		return output;
	},
});
