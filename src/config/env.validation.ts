import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

export const STORAGE_PROVIDERS = ['r2', 's3'] as const;
export type StorageProviderKind = (typeof STORAGE_PROVIDERS)[number];

export const NAFDAC_PROVIDERS = ['mock', 'registry'] as const;
export type NafdacProviderKind = (typeof NAFDAC_PROVIDERS)[number];

const NODE_ENVS = ['development', 'production', 'test', 'staging'] as const;

export class EnvironmentVariables {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsOptional()
  @IsIn([...NODE_ENVS])
  NODE_ENV: string = 'development';

  // ===== MongoDB =====
  @IsString()
  MONGO_URI!: string;

  // ===== JWT (RS256) =====
  @IsString()
  JWT_PRIVATE_KEY_BASE64!: string;

  @IsString()
  JWT_PUBLIC_KEY_BASE64!: string;

  @IsString()
  JWT_EXPIRES_IN!: string;

  // ===== Redis / BullMQ =====
  @IsString()
  UPSTASH_REDIS_URL!: string;

  // ===== Storage =====
  @IsIn([...STORAGE_PROVIDERS])
  STORAGE_PROVIDER: StorageProviderKind = 'r2';

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 'r2', {
    message: 'R2_ACCOUNT_ID is required when STORAGE_PROVIDER=r2',
  })
  @IsString()
  R2_ACCOUNT_ID!: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 'r2', {
    message: 'R2_ACCESS_KEY_ID is required when STORAGE_PROVIDER=r2',
  })
  @IsString()
  R2_ACCESS_KEY_ID!: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 'r2', {
    message: 'R2_SECRET_ACCESS_KEY is required when STORAGE_PROVIDER=r2',
  })
  @IsString()
  R2_SECRET_ACCESS_KEY!: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 'r2', {
    message: 'R2_BUCKET_NAME is required when STORAGE_PROVIDER=r2',
  })
  @IsString()
  R2_BUCKET_NAME!: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 'r2', {
    message: 'R2_PUBLIC_BUCKET_DOMAIN is required when STORAGE_PROVIDER=r2',
  })
  @IsString()
  R2_PUBLIC_BUCKET_DOMAIN!: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 's3', {
    message: 'S3_REGION is required when STORAGE_PROVIDER=s3',
  })
  @IsString()
  S3_REGION!: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 's3', {
    message: 'S3_ACCESS_KEY_ID is required when STORAGE_PROVIDER=s3',
  })
  @IsString()
  S3_ACCESS_KEY_ID!: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 's3', {
    message: 'S3_SECRET_ACCESS_KEY is required when STORAGE_PROVIDER=s3',
  })
  @IsString()
  S3_SECRET_ACCESS_KEY!: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === 's3', {
    message: 'S3_BUCKET_NAME is required when STORAGE_PROVIDER=s3',
  })
  @IsString()
  S3_BUCKET_NAME!: string;

  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string;

  // ===== Tripo AI =====
  @IsString()
  TRIPO_API_KEY!: string;

  @IsString()
  TRIPO_API_BASE_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(500)
  TRIPO_POLL_INTERVAL_MS: number = 5000;

  @Type(() => Number)
  @IsInt()
  @Min(10_000)
  TRIPO_POLL_TIMEOUT_MS: number = 900_000;

  // ===== NAFDAC =====
  @IsIn([...NAFDAC_PROVIDERS])
  NAFDAC_PROVIDER: NafdacProviderKind = 'mock';

  @ValidateIf((o: EnvironmentVariables) => o.NAFDAC_PROVIDER === 'registry', {
    message:
      'NAFDAC_REGISTRY_BASE_URL is required when NAFDAC_PROVIDER=registry',
  })
  @IsString()
  NAFDAC_REGISTRY_BASE_URL!: string;

  @IsOptional()
  @IsString()
  NAFDAC_REGISTRY_API_KEY?: string;

  // ===== Email notifications =====
  @IsIn(['smtp', 'plunk'])
  EMAIL_PROVIDER: 'smtp' | 'plunk' = 'smtp';

  @IsString()
  EMAIL_FROM_ADDRESS!: string;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === 'plunk', {
    message: 'EMAIL_PROVIDER_API_KEY is required when EMAIL_PROVIDER=plunk',
  })
  @IsString()
  EMAIL_PROVIDER_API_KEY?: string;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === 'smtp', {
    message: 'SMTP_HOST is required when EMAIL_PROVIDER=smtp',
  })
  @IsString()
  SMTP_HOST!: string;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === 'smtp', {
    message: 'SMTP_PORT is required when EMAIL_PROVIDER=smtp',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  SMTP_PORT!: number;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === 'smtp', {
    message: 'SMTP_USER is required when EMAIL_PROVIDER=smtp',
  })
  @IsString()
  SMTP_USER!: string;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === 'smtp', {
    message: 'SMTP_PASSWORD is required when EMAIL_PROVIDER=smtp',
  })
  @IsString()
  SMTP_PASSWORD!: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  SMTP_SECURE?: string;

  // ===== Optional bootstrap admin seed =====
  @IsOptional()
  @IsString()
  ADMIN_SEED_EMAIL?: string;

  @ValidateIf((o: EnvironmentVariables) => !!o.ADMIN_SEED_EMAIL, {
    message: 'ADMIN_SEED_PASSWORD is required when ADMIN_SEED_EMAIL is set',
  })
  @IsString()
  ADMIN_SEED_PASSWORD?: string;
}

function assertValidRs256Key(base64Key: string, name: string): void {
  let pem: string;
  try {
    pem = Buffer.from(base64Key, 'base64').toString('utf8');
  } catch {
    throw new Error(`${name} is not valid base64.`);
  }
  if (!pem.includes('-----BEGIN')) {
    throw new Error(
      `${name} does not decode to a PEM key. Base64-encode the full .pem file contents.`,
    );
  }
}

/**
 * ConfigModule.validate hook — fails startup fast when required vars are missing.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const parsed = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
    enableImplicitConversion: false,
  });

  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map(
        (error) =>
          `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('\n  ');
    throw new Error(`Environment validation failed:\n  ${details}`);
  }

  assertValidRs256Key(parsed.JWT_PRIVATE_KEY_BASE64, 'JWT_PRIVATE_KEY_BASE64');
  assertValidRs256Key(parsed.JWT_PUBLIC_KEY_BASE64, 'JWT_PUBLIC_KEY_BASE64');

  return { ...config, ...parsed };
}
