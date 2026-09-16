import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from '../categories/categories.module';
import { VendorsModule } from '../vendors/vendors.module';
import { TripoQueueModule } from '../tripo/tripo-queue.module';
import { NafdacProviderKind } from '../config/env.validation';
import { ProductController } from './controller/product.controller';
import {
  NafdacProduct,
  NafdacProductSchema,
} from './schemas/nafdac-product.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { MockNafdacLookupService } from './service/mock-nafdac-lookup.service';
import { NafdacLookupService } from './service/nafdac-lookup.service';
import { ProductCreationService } from './service/product-creation.service';
import { ProductImageService } from './service/product-image.service';
import { ProductService } from './service/product.service';
import { RegistryNafdacLookupService } from './service/registry-nafdac-lookup.service';
import { NafdacProductCreationStrategy } from './service/strategies/nafdac-product-creation.strategy';
import { StandardProductCreationStrategy } from './service/strategies/standard-product-creation.strategy';

/**
 * Products module — creation branching, image pipeline and querying.
 * The NAFDAC lookup implementation is bound here once (env-driven) so every
 * consumer receives the same substitutable dependency.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
        discriminators: [
          { name: NafdacProduct.name, schema: NafdacProductSchema },
        ],
      },
    ]),
    CategoriesModule,
    VendorsModule,
    TripoQueueModule,
    HttpModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    StandardProductCreationStrategy,
    NafdacProductCreationStrategy,
    ProductCreationService,
    ProductImageService,
    {
      provide: NafdacLookupService,
      useFactory: (
        httpService: HttpService,
        configService: ConfigService,
      ): NafdacLookupService =>
        configService.get<NafdacProviderKind>('NAFDAC_PROVIDER') === 'registry'
          ? new RegistryNafdacLookupService(httpService, configService)
          : new MockNafdacLookupService(),
      inject: [HttpService, ConfigService],
    },
  ],
  exports: [ProductService, ProductImageService],
})
export class ProductsModule {}
