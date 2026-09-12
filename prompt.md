# BUILD PROMPT — Marketplace API (NestJS)

Paste everything below to your coding AI as-is. It is written as an instruction set, not just a spec.

---

## 0. FIRST STEP — BEFORE WRITING ANY CODE

I have an existing project called **Flex**. Before generating anything:

1. Scan the Flex project's folder structure, module conventions, naming patterns, lint/formatting rules (`.eslintrc`, `.prettierrc`), and how existing modules are wired into `app.module.ts`.
2. Match that project's conventions (file naming, import ordering, response-shape conventions, existing base classes/decorators/guards) wherever they don't conflict with anything explicit below.
3. If Flex already has shared infra I should reuse (a `common/` folder, a base exception filter, a logger module, an existing auth setup) — reuse it instead of creating a parallel version. Tell me explicitly if you find a conflict between Flex's existing pattern and an instruction below, rather than silently picking one.

Only after that scan, start building this marketplace API as a new module set inside (or alongside, if instructed) Flex.

---

## 1. Tech Stack

- NestJS (TypeScript)
- MongoDB via Mongoose
- Redis via **Upstash** (for BullMQ)
- Cloudflare R2 (S3-compatible) for image storage
- Tripo AI for 3D model generation
- JWT auth using **RS256** (private/public key pair) — not HS256
- class-validator / class-transformer for all DTOs
- Swagger for API docs
- No password-reset flow (out of scope, do not build it)

---

## 2. Packages to Install

```bash
# core
npm i @nestjs/config @nestjs/mongoose mongoose

# auth
npm i @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm i -D @types/passport-jwt @types/bcrypt

# validation & swagger
npm i class-validator class-transformer @nestjs/swagger

# queue (Upstash Redis + BullMQ)
npm i @nestjs/bullmq bullmq ioredis

# storage & external APIs
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm i @nestjs/axios axios

# rate limiting
npm i @nestjs/throttler

# env validation
npm i joi

# file uploads
npm i -D @types/multer
```

---

## 3. Auth Model — Single Login, Role Upgrade (NOT separate buyer/seller login)

There is **one** login flow. A user registers/logs in once as a `User`. There is no separate "vendor login" screen or separate credentials.

```ts
export enum UserRole {
  BUYER = 'BUYER',
  VENDOR = 'VENDOR',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true }) email: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ required: true }) fullName: string;
  @Prop({ type: [String], enum: UserRole, default: [UserRole.BUYER] })
  roles: UserRole[]; // array, not single enum — a user can be BOTH buyer and vendor at once
}
```

Flow:
1. User registers/logs in normally → gets a JWT with `roles: ['BUYER']`.
2. On the frontend, there's a "Start Selling" / "Upload Product" button always visible. Clicking it (or hitting the vendor-creation endpoint) does **not** require a new login — it calls `POST /vendors` for the *already-authenticated* user, attaches vendor profile info (store name, etc.), and appends `VENDOR` to their `roles` array.
3. From then on their JWT (re-issued or just re-checked against the DB roles on each request — see note below) allows access to vendor-only routes (`/products` create, etc.) via a `RolesGuard`.

**Important implementation note:** since roles can change mid-session (buyer becomes vendor without logging out), don't bake `roles` into the JWT permanently and trust it forever for role-gated actions — either (a) re-issue a fresh JWT immediately after the `POST /vendors` upgrade and have the frontend swap it in, or (b) have `RolesGuard` re-check the DB roles rather than trusting only the token claims for vendor-gated routes. Pick (a) — it's simpler and keeps the guard stateless. Document this decision in a code comment where the guard is defined.

```ts
// POST /vendors — upgrade existing user to vendor, returns a NEW token
@UseGuards(JwtAuthGuard)
@Post('vendors')
async becomeVendor(@CurrentUser() user: User, @Body() dto: CreateVendorDto) {
  const vendor = await this.vendorsService.createProfile(user.id, dto);
  const newToken = this.authService.reissueToken(user.id); // now includes VENDOR role
  return { vendor, accessToken: newToken };
}
```

### JWT — RS256, not HS256

Generate a key pair once and store both as env vars (base64-encoded to survive `.env` newline issues):

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
base64 -i private.pem | tr -d '\n' > private.b64
base64 -i public.pem | tr -d '\n' > public.b64
```

```env
JWT_PRIVATE_KEY_BASE64=...
JWT_PUBLIC_KEY_BASE64=...
JWT_EXPIRES_IN=1d
```

```ts
// auth/auth.module.ts
JwtModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    privateKey: Buffer.from(config.get('JWT_PRIVATE_KEY_BASE64'), 'base64').toString('utf8'),
    publicKey: Buffer.from(config.get('JWT_PUBLIC_KEY_BASE64'), 'base64').toString('utf8'),
    signOptions: { algorithm: 'RS256', expiresIn: config.get('JWT_EXPIRES_IN') },
    verifyOptions: { algorithms: ['RS256'] },
  }),
  inject: [ConfigService],
})
```

```ts
// auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: Buffer.from(config.get('JWT_PUBLIC_KEY_BASE64'), 'base64').toString('utf8'),
      algorithms: ['RS256'],
    });
  }
  async validate(payload: JwtPayload) {
    return { userId: payload.sub, roles: payload.roles };
  }
}
```

Why RS256 over HS256 here, worth stating in your README: HS256 uses one shared secret for signing *and* verifying — anything that can verify a token can also forge one. RS256 signs with a private key and verifies with a public key, so if you ever split this into microservices (e.g. a separate notifications service that only needs to verify tokens, never issue them), it only needs the public key and can never mint valid tokens itself. Good practice even at hackathon scale, and an easy thing to explain when asked.

---

## 4. Module & File Convention (apply to EVERY module — products, vendors, categories, orders, nafdac, tripo, images, notifications)

```
src/products/
  controller/
    product.controller.ts
  service/
    product.service.ts
    product-creation.service.ts      # strategy logic (NAFDAC vs standard branch)
  dto/
    create-standard-product.dto.ts
    create-nafdac-product.dto.ts
    query-products.dto.ts
    update-product.dto.ts
  schemas/
    product.schema.ts
    nafdac-product.schema.ts
  interfaces/
    product-creation-strategy.interface.ts
  products.module.ts
```

Rules to enforce across all modules, for SOLID/DRY/clean-code compliance:

- **Single Responsibility:** `ProductController` only translates HTTP ⇄ DTOs and calls services — zero business logic. `ProductService` only does persistence/query logic. `ProductCreationService` only handles the create-time branching. Don't merge these into one fat service.
- **Open/Closed:** category-to-NAFDAC-requirement is data-driven (`Category.requiresNafdac`), not a hardcoded switch — adding a new regulated category never requires touching `ProductCreationService`.
- **Liskov substitution:** `NafdacLookupService` and `NotificationService` are abstract classes/interfaces with one production and one mock implementation each, both fully substitutable via DI (`useClass` in the module, driven by an env flag) — no `if (env === 'mock')` scattered in business code.
- **Interface segregation:** don't force one giant `CreateProductDto` to cover both NAFDAC and standard products with a wall of `@IsOptional()`. Two DTOs, one per branch.
- **Dependency Inversion:** services depend on interfaces (`NafdacLookupService`, `NotificationService`, a `MeshTransformer` interface for the 3D scale step) — never directly on a concrete SDK client inside business logic. SDK clients live in a thin provider/adapter class.
- **DRY:** shared cross-module logic (unit conversion, pagination, ownership checks, the standard error-response shape) goes in `common/`, imported everywhere — not copy-pasted per module.
- **No magic strings:** all enums (`UserRole`, `ProductImageView`, `LengthUnit`, order/product status) are real TypeScript enums, referenced everywhere, never raw string literals in conditionals.

Middleware: use Nest's native `MiddlewareConsumer` (functional or class-based middleware registered in `AppModule.configure()`) for cross-cutting concerns that need to run before routing/guards (e.g. request-id injection, request logging) — reserve Guards for auth/roles and Interceptors for response shaping/timing, don't conflate the three. A modern pattern: a small `RequestContextMiddleware` that attaches a correlation id to each request for log tracing, consumed by a structured logger (`nestjs-pino` or similar if Flex already uses one — check step 0).

---

## 5. Domain Model (full, current version)

### Category
```ts
@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true }) name: string;
  @Prop({ required: true, default: false }) requiresNafdac: boolean;
  @Prop() description?: string;
}
```

### Product (base) + NafdacProduct (discriminator)
```ts
export enum LengthUnit { CM = 'CM', INCH = 'INCH', FEET = 'FEET' }
export enum ProductImageView { FRONT='FRONT', BACK='BACK', LEFT='LEFT', RIGHT='RIGHT', TOP='TOP', BOTTOM='BOTTOM' }
export enum ProductStatus { DRAFT='DRAFT', PENDING_3D='PENDING_3D', NEEDS_REVIEW='NEEDS_REVIEW', ACTIVE='ACTIVE', REJECTED='REJECTED' }
export enum Model3dStatus { PENDING='PENDING', PROCESSING='PROCESSING', COMPLETE='COMPLETE', FAILED='FAILED' }

@Schema({ timestamps: true, discriminatorKey: 'kind' })
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true }) vendor: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true }) category: Types.ObjectId;
  @Prop({ required: true }) productName: string;
  @Prop({ required: true }) description: string;
  @Prop({ required: true, min: 0 }) price: number;

  // real-world dimensions — used to scale-correct the generated 3D mesh
  @Prop({ required: true }) widthValue: number;
  @Prop({ required: true }) heightValue: number;
  @Prop({ required: true, enum: LengthUnit, default: LengthUnit.CM }) sizeUnit: LengthUnit;

  @Prop({ enum: ProductStatus, default: ProductStatus.DRAFT }) status: ProductStatus;
  @Prop({ type: [ImageRefSchema], validate: [validateSixViews, '6 images, one per view, required'] })
  images: ImageRef[];

  @Prop() model3dUrl?: string;
  @Prop({ enum: Model3dStatus, default: Model3dStatus.PENDING }) model3dStatus: Model3dStatus;
}

@Schema()
export class NafdacProduct extends Product {
  @Prop({ required: true, unique: true }) nafdacNumber: string;
  @Prop({ required: true }) expiryDate: Date;             // from lookup
  @Prop({ default: true }) nameAutoFilled: boolean;
  @Prop({ required: true, default: false }) nafdacVerified: boolean; // true only if lookup.isValid === true
}
```

### Scale-correction (runs after Tripo completes)
```ts
const CM_PER_UNIT: Record<LengthUnit, number> = { CM: 1, INCH: 2.54, FEET: 30.48 };
export const toCm = (value: number, unit: LengthUnit) => value * CM_PER_UNIT[unit];

async applyScaleCorrection(productId: string) {
  const product = await this.productModel.findById(productId);
  const bounds = await this.meshInspector.getBounds(product.model3dUrl);

  const scaleFromHeight = toCm(product.heightValue, product.sizeUnit) / bounds.height;
  const scaleFromWidth  = toCm(product.widthValue, product.sizeUnit) / bounds.width;
  const delta = Math.abs(scaleFromHeight - scaleFromWidth) / scaleFromHeight;

  if (delta > 0.2) {
    await this.productModel.updateOne({ _id: productId }, { status: ProductStatus.NEEDS_REVIEW });
    return;
  }
  const finalScale = (scaleFromHeight + scaleFromWidth) / 2;
  const scaledUrl = await this.meshTransformer.applyScale(product.model3dUrl, finalScale);
  await this.productModel.updateOne(
    { _id: productId },
    { model3dUrl: scaledUrl, model3dStatus: Model3dStatus.COMPLETE, status: ProductStatus.ACTIVE },
  );
}
```

### ImageRef
```ts
@Schema({ _id: false })
export class ImageRef {
  @Prop({ required: true, enum: ProductImageView }) view: ProductImageView;
  @Prop({ required: true }) url: string; // R2 public URL
  @Prop({ required: true }) key: string; // R2 object key, for deletion
}
```

### NafdacLookupService (interface + mock)
```ts
export interface NafdacLookupResult {
  productName: string;
  expiryDate: Date;
  manufacturer?: string;
  isValid: boolean;
}
export abstract class NafdacLookupService {
  abstract lookup(nafdacNumber: string): Promise<NafdacLookupResult | null>;
}
```
Bind via `useClass: MockNafdacLookupService` or `NafdacRegistryLookupService` based on `NAFDAC_PROVIDER` env var.

### NotificationService (interface + email implementation)
```ts
export enum NotificationEvent { PRODUCT_3D_READY = 'PRODUCT_3D_READY', PRODUCT_NEEDS_REVIEW = 'PRODUCT_NEEDS_REVIEW' }
export abstract class NotificationService {
  abstract notify(userId: string, event: NotificationEvent, payload: Record<string, unknown>): Promise<void>;
}
```
Implement `EmailNotificationService` only (Resend/Nodemailer/SendGrid — pick whichever Flex already has configured, per step 0). Do not build in-app/in-house notifications now — leave the interface as the extension point.

Called from the Tripo processor after a successful generation; wrap in try/catch and log-only on failure — never fail the 3D job because an email didn't send.

---

## 6. Filtering / Query

```ts
export class QueryProductsDto {
  @IsOptional() @IsMongoId() category?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() nafdacVerified?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
```
Index `category`, `price`, `nafdacVerified`, and `status` on the `products` collection — these back the primary listing/filter queries.

---

## 7. Upstash Redis + BullMQ

```env
UPSTASH_REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:<port>
```

```ts
// tripo/tripo-queue.module.ts
BullModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    connection: {
      url: config.get('UPSTASH_REDIS_URL'), // ioredis accepts a full rediss:// URL directly
      tls: {}, // Upstash requires TLS — empty object enables it with default settings
    },
  }),
  inject: [ConfigService],
}),
BullModule.registerQueue({ name: 'tripo-generation' }),
```

Note for whoever configures Upstash: use the **TCP/Redis endpoint** they issue (not the REST API endpoint) — BullMQ needs a real Redis protocol connection, the REST API won't work here.

```ts
@Processor('tripo-generation')
export class TripoProcessor extends WorkerHost {
  constructor(
    private readonly tripoClient: TripoClientService,
    private readonly productsService: ProductsService,
    private readonly scaleCorrectionService: ScaleCorrectionService,
    private readonly notificationService: NotificationService,
  ) { super(); }

  async process(job: Job<{ productId: string; images: ImageRef[] }>) {
    const { productId, images } = job.data;
    const result = await this.tripoClient.createMultiviewTask(orderByView(images));
    await this.productsService.attachRawModel(productId, result.modelUrl);
    await this.scaleCorrectionService.applyScaleCorrection(productId);

    const product = await this.productsService.findByIdOrThrow(productId);
    try {
      await this.notificationService.notify(
        product.vendor.toString(),
        product.status === ProductStatus.NEEDS_REVIEW
          ? NotificationEvent.PRODUCT_NEEDS_REVIEW
          : NotificationEvent.PRODUCT_3D_READY,
        { productId, productName: product.productName },
      );
    } catch (err) {
      this.logger.error(`Notification failed for product ${productId}`, err);
    }
  }
}
```

---

## 8. Swagger

```ts
// main.ts
const config = new DocumentBuilder()
  .setTitle('Marketplace API')
  .setDescription('Vendor product listing with NAFDAC validation and AI-generated 3D models')
  .setVersion('1.0')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Requirements for every controller/DTO:
- `@ApiTags('products')` on every controller.
- `@ApiOperation({ summary: '...' })` and `@ApiResponse({ status, description, type })` on every route, including error responses (`400`, `401`, `403`, `404`, `422`).
- `@ApiBearerAuth('access-token')` on every guarded route.
- Every DTO field decorated with `@ApiProperty({ example, description })` (or `@ApiPropertyOptional` for optional fields) — not left undocumented, so `/api/docs` is fully usable without reading source.
- Use `@ApiExtraModels` + `refs` for the two product-creation DTOs so Swagger shows both shapes clearly under `POST /products`.

---

## 9. Endpoints (current, full list)

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | Single flow, default role `BUYER` |
| POST | `/auth/login` | — | Returns RS256 JWT |
| GET | `/auth/me` | JWT | |
| POST | `/vendors` | JWT | Upgrades current user to also have `VENDOR` role, re-issues token |
| GET | `/categories` | — | Includes `requiresNafdac` per category |
| POST | `/categories` | JWT + admin | |
| POST | `/products` | JWT + VENDOR | Branches internally on category.requiresNafdac |
| POST | `/products/:id/images` | JWT + VENDOR (owner) | 6 files, one per `ProductImageView` |
| GET | `/products/:id/3d-status` | — | Poll status/url |
| GET | `/products` | — | `QueryProductsDto` filters: category, price range, nafdacVerified, pagination |
| GET | `/products/:id` | — | |
| PATCH | `/products/:id` | JWT + VENDOR (owner) | Editable fields only — never `nafdacNumber`/`expiryDate`/`productName` on a NafdacProduct |
| DELETE | `/products/:id` | JWT + VENDOR (owner) / admin | Soft delete |
| POST | `/nafdac/verify` | JWT + VENDOR | Pre-check before full submit |
| POST | `/orders` | JWT + BUYER | |
| GET | `/orders/:id` | JWT (owner) | |
| PATCH | `/orders/:id/status` | JWT + VENDOR/admin | |
| GET | `/orders` | JWT | Role-aware: buyer sees purchases, vendor sees sales |

**Explicitly not built:** `/auth/forgot-password`, `/auth/reset-password`, any separate vendor-login endpoint.

---

## 10. Environment Variables (full)

```env
MONGO_URI=
JWT_PRIVATE_KEY_BASE64=
JWT_PUBLIC_KEY_BASE64=
JWT_EXPIRES_IN=1d
UPSTASH_REDIS_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BUCKET_DOMAIN=
TRIPO_API_KEY=
TRIPO_API_BASE_URL=
NAFDAC_PROVIDER=mock
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM_ADDRESS=
```

Validate all of these on boot via a Joi schema in `config/env.validation.ts` — fail fast, don't let a missing var surface as a runtime error mid-demo.

---

## 11. Build Order

1. Scan Flex (step 0), align conventions.
2. Global setup: config validation, Swagger, global `ValidationPipe`, global exception filter, RS256 JWT auth + roles guard, single-login + vendor-upgrade flow.
3. Categories module.
4. Products module — standard branch only first, end-to-end.
5. NAFDAC module (mock implementation) — wire into the NAFDAC branch.
6. Images module (R2) — wire the 6-view upload, flip status to `PENDING_3D`.
7. Upstash + BullMQ + Tripo processor (stub Tripo client response first) — wire scale-correction and status transitions.
8. Notification module (email only) — call from the processor.
9. Orders module.
10. Filters/pagination on `GET /products`.
11. Full Swagger annotation pass.
12. README: document every architectural decision above (RS256 vs HS256, discriminators, pluggable NAFDAC/notification services, scale-correction + NEEDS_REVIEW fallback, single-login/role-upgrade model, no reset-password).