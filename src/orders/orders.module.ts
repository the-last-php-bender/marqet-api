import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorsModule } from '../vendors/vendors.module';
import { Order, OrderSchema } from './schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { OrderController } from './controller/order.controller';
import { OrderService } from './service/order.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Order.name, schema: OrderSchema },
			{ name: Product.name, schema: ProductSchema },
		]),
		VendorsModule,
	],
	controllers: [OrderController],
	providers: [OrderService],
	exports: [OrderService],
})
export class OrdersModule {}
