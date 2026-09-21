import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestContextMiddleware } from './common/middlewares/request-context.middleware';
import { validateEnv } from './config/env.validation';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { StorageModule } from './storage/storage.module';
import { TripoModule } from './tripo/tripo.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // ===== Environment (fail-fast on boot) =====
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),

    // ===== MongoDB =====
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),
        autoIndex: configService.get('NODE_ENV') !== 'production', // build indexes at startup outside prod
      }),
      inject: [ConfigService],
    }),

    // ===== Redis / BullMQ (Upstash, TLS) =====
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.getOrThrow<string>('UPSTASH_REDIS_URL'),
          tls: {},
          maxRetriesPerRequest: null, // required by BullMQ
        },
      }),
      inject: [ConfigService],
    }),

    // ===== Rate limiting =====
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ===== Feature modules =====
    AuthModule,
    UsersModule,
    CategoriesModule,
    VendorsModule,
    StorageModule,
    ProductsModule,
    TripoModule,
    NotificationsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    // Global guards: rate limit -> auth -> roles (order matters).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
