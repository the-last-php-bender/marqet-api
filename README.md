# Marqet API

Backend for **Marqet**, a marketplace where one account can both buy and sell. Sellers list
products with real-world dimensions, upload six photos, and the API generates a 3D model
(Tripo AI) that is automatically rescaled to match the declared dimensions. Products in
NAFDAC-regulated categories (drugs, food, cosmetics) are only accepted when their registration
number verifies against the official NAFDAC Greenbook registry.

Built with NestJS, MongoDB (Mongoose), Redis/BullMQ, and TypeScript.

## Highlights

- **Single-account model** — every registered user can buy and sell; `ADMIN` only gates
  operational routes. No separate buyer/vendor sign-up flows.
- **NAFDAC-verified listings** — a public `POST /products/nafdac/verify` endpoint queries the
  official Greenbook feed; regulated product creation is rejected unless the number is valid,
  and the product name/expiry are auto-filled from the registry.
- **Async 3D pipeline** — image upload enqueues a BullMQ job; a worker creates the Tripo
  multiview task, polls for the mesh, rescales it against the seller's dimensions, and emails
  the seller on completion or failure.
- **Scale correction** — GLB vertex data is rescaled in-process (no external mesh service) and
  re-uploaded; inconsistent proportions are flagged `NEEDS_REVIEW` for a human.
- **Storage abstraction** — the same code runs on Cloudflare R2 or AWS S3, selected by a single
  env var.
- **Fail-fast config** — every environment variable is validated at boot with `class-validator`,
  including base64 PEM checks for the RS256 JWT keys.
- **Consistent API envelope** — all success and error responses share one shape, with a
  per-request correlation id echoed in the `x-request-id` header.

## Tech stack

| Concern        | Choice                                                   |
| -------------- | -------------------------------------------------------- |
| Runtime        | Node.js 20+, NestJS 11                                   |
| Database       | MongoDB via Mongoose 9                                   |
| Queue          | BullMQ on Redis (Upstash, TLS)                           |
| Auth           | JWT (RS256), Passport, bcrypt                            |
| Validation     | class-validator / class-transformer, global `ValidationPipe` |
| Docs           | Swagger / OpenAPI at `/api/docs`                         |
| Storage        | Cloudflare R2 or AWS S3 (`@aws-sdk/client-s3`)           |
| Email          | SMTP (nodemailer) or Plunk REST                          |
| 3D generation  | Tripo AI open API                                        |

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values (see below)
npm run start:dev      # http://localhost:3000, docs at /api/docs
```

Generate the RS256 key pair once and base64-encode it:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
base64 -i private.pem | tr -d '\n'   # -> JWT_PRIVATE_KEY_BASE64
base64 -i public.pem  | tr -d '\n'   # -> JWT_PUBLIC_KEY_BASE64
```

For local development the defaults are enough to boot: `NAFDAC_PROVIDER=mock` returns
deterministic fake records, so no external registry is needed. A MongoDB instance and an
Upstash-compatible Redis URL are required.

## Environment

All variables are validated on startup. The most important ones:

| Variable                | Notes                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| `MONGO_URI`             | MongoDB connection string.                                        |
| `JWT_PRIVATE_KEY_BASE64`, `JWT_PUBLIC_KEY_BASE64`, `JWT_EXPIRES_IN` | RS256 key pair and token lifetime. |
| `UPSTASH_REDIS_URL`     | TCP endpoint (not the REST endpoint); BullMQ requires TLS.        |
| `STORAGE_PROVIDER`      | `r2` or `s3`. Selects the active storage adapter.                 |
| `R2_*` / `S3_*`         | Credentials and bucket settings for the selected provider.        |
| `TRIPO_API_KEY`, `TRIPO_API_BASE_URL` | Tripo AI credentials.                                |
| `NAFDAC_PROVIDER`       | `mock` (offline) or `registry` (live Greenbook).                  |
| `EMAIL_PROVIDER`        | `smtp` or `plunk`, plus the matching credentials.                 |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | Optional; seeds an admin account on boot.     |

See [`.env.example`](./.env.example) for the full annotated list.

## API overview

Full interactive documentation is served at `/api/docs`.

| Method   | Path                       | Auth        | Description                                     |
| -------- | -------------------------- | ----------- | ----------------------------------------------- |
| `GET`    | `/health`                  | Public      | Liveness probe.                                 |
| `POST`   | `/auth/register`           | Public      | Create an account, returns a JWT.               |
| `POST`   | `/auth/login`              | Public      | Log in, returns a JWT.                          |
| `GET`    | `/auth/me`                 | Bearer      | Current user (read live from the DB).           |
| `GET`    | `/categories`              | Public      | List categories (each with `requiresNafdac`).   |
| `POST`   | `/categories`              | Admin       | Create a category.                              |
| `POST`   | `/vendors`                 | Bearer      | Create your store profile (one per account).    |
| `GET`    | `/vendors/me`              | Bearer      | Your store profile.                             |
| `POST`   | `/products`                | Bearer      | Create a draft product (standard or NAFDAC).    |
| `GET`    | `/products`                | Public      | Paginated catalogue with filters.               |
| `GET`    | `/products/mine`           | Bearer      | Seller dashboard, all statuses.                 |
| `POST`   | `/products/nafdac/verify`  | Public      | Verify a NAFDAC number against the registry.    |
| `POST`   | `/products/:id/images`     | Bearer      | Upload the six view images; queues 3D.          |
| `GET`    | `/products/:id/3d-status`  | Public      | Poll 3D generation status.                      |
| `GET`    | `/products/:id`            | Public      | Full product details.                           |
| `PATCH`  | `/products/:id`            | Bearer      | Update editable fields (owner only).            |
| `DELETE` | `/products/:id`            | Bearer      | Soft-delete (owner or admin).                   |
| `POST`   | `/orders`                  | Bearer      | Place an order (prices computed server-side).   |
| `GET`    | `/orders`                  | Bearer      | Role-aware listing (`view=purchases`/`sales`).  |
| `GET`    | `/orders/:id`              | Bearer      | Order details (buyer, seller or admin).         |
| `PATCH`  | `/orders/:id/status`       | Bearer      | Guarded status transition.                      |

### Product lifecycle

```
DRAFT ──(6 images uploaded)──► PENDING_3D ──(worker)──┬─► ACTIVE        (scale within threshold)
                                                     ├─► NEEDS_REVIEW  (inconsistent proportions)
                                                     └─► NEEDS_REVIEW  (generation failed)
```

## Project structure

```
src/
├── auth/            # register/login, RS256 strategy, JWT payload
├── categories/      # taxonomy + requiresNafdac flag
├── common/          # guards, filters, interceptors, middleware, DTOs, utils
├── config/          # environment schema and validation
├── notifications/   # email abstraction (SMTP / Plunk)
├── orders/          # server-priced orders and status transitions
├── products/        # creation strategies, image pipeline, querying
│   └── strategies/  # standard vs NAFDAC creation
├── storage/         # R2 / S3 adapters behind one interface
├── tripo/           # BullMQ producer, worker, GLB rescaling
├── users/
└── vendors/
```

## Scripts

```bash
npm run start:dev    # watch mode
npm run build        # compile to dist/
npm run start:prod   # run the compiled build
npm run lint         # eslint --fix
npm run format       # prettier
```

## Deployment

The repository includes a `render.yaml` blueprint. Secrets (`MONGO_URI`, JWT keys, storage and
email credentials, `TRIPO_API_KEY`, `UPSTASH_REDIS_URL`) are configured in the hosting
dashboard rather than committed.

## License

UNLICENSED — proprietary.
