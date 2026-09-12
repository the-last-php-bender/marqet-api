import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageProvider, UploadedObject, UploadInput } from '../interfaces/storage-provider.interface';

/**
 * Cloudflare R2 adapter — speaks the S3 API against the account-scoped endpoint.
 * Public reads are served from the bucket's public r2.dev domain.
 */
@Injectable()
export class R2StorageProvider extends StorageProvider {
	private readonly client: S3Client;
	private readonly bucketName: string;
	private readonly publicDomain: string;

	constructor(configService: ConfigService) {
		super();
		const accountId = configService.getOrThrow<string>('R2_ACCOUNT_ID');
		this.bucketName = configService.getOrThrow<string>('R2_BUCKET_NAME');
		this.publicDomain = configService.getOrThrow<string>('R2_PUBLIC_BUCKET_DOMAIN').replace(/\/+$/, '');

		this.client = new S3Client({
			region: 'auto',
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
				secretAccessKey: configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
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
		await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
	}

	publicUrl(key: string): string {
		return `${this.publicDomain}/${key}`;
	}
}
