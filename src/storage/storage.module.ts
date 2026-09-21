import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { R2StorageProvider } from './providers/r2-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

/**
 * Selects the storage backend from STORAGE_PROVIDER:
 * r2 -> R2StorageProvider, s3 -> S3StorageProvider. Consumers inject the
 * abstract StorageProvider.
 */
@Global()
@Module({
  providers: [
    {
      provide: StorageProvider,
      useFactory: (configService: ConfigService): StorageProvider =>
        configService.get<string>('STORAGE_PROVIDER') === 's3'
          ? new S3StorageProvider(configService)
          : new R2StorageProvider(configService),
      inject: [ConfigService],
    },
  ],
  exports: [StorageProvider],
})
export class StorageModule {}
