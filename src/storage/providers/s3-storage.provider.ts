import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  StorageProvider,
  UploadedObject,
  UploadInput,
} from '../interfaces/storage-provider.interface';

/**
 * Native AWS S3 adapter. Drop-in swap for R2 — same contract, different client
 * configuration (region-based endpoint, optional custom endpoint for MinIO/LocalStack).
 */
@Injectable()
export class S3StorageProvider extends StorageProvider {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly customEndpoint?: string;

  constructor(configService: ConfigService) {
    super();
    this.bucketName = configService.getOrThrow<string>('S3_BUCKET_NAME');
    this.region = configService.getOrThrow<string>('S3_REGION');
    const endpoint = configService.get<string>('S3_ENDPOINT');
    this.customEndpoint = endpoint ? endpoint.replace(/\/+$/, '') : undefined;

    this.client = new S3Client({
      region: this.region,
      ...(this.customEndpoint
        ? {
            endpoint: this.customEndpoint,
            forcePathStyle: true,
          }
        : {}),
      credentials: {
        accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>(
          'S3_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async upload(input: UploadInput): Promise<UploadedObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { key: input.key, url: this.publicUrl(input.key) };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  publicUrl(key: string): string {
    if (this.customEndpoint)
      return `${this.customEndpoint}/${this.bucketName}/${key}`;
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
