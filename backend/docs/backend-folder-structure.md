# Backend Folder Structure

REST API for the ECU Safe Zone store. It is the backend-only counterpart of the
Next.js app described in `folder-structure.md`: same domain, same
layer-based thinking, but the UI, hooks and Server Actions are gone. Their job
is now done by HTTP routes and controllers, and a **repository layer** is added
so that business logic and database access are separated.

## Stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Runtime / HTTP | Node.js + **Express**                    |
| Language       | **TypeScript** (strict)                  |
| ORM / DB       | **Prisma** + PostgreSQL                  |
| Object storage | **Cloudflare R2** (S3-compatible API)    |
| Validation     | Zod                                      |
| Auth           | Clerk (JWT verified in middleware)       |
| Payments       | Stripe Checkout + webhook                |

> Clerk and Stripe are kept because the original app uses them. If the backend
> will own its own auth or use another payment provider, only `lib/`,
> `middlewares/authenticate.ts` and `payment.service.ts` change. The layer
> structure does not.

---

## Overview

The project follows a **Layer-Based Architecture**. Every feature is built
from the same five layers, and a request only ever travels downward through
them.

```text
HTTP Request
↓
Route            (URL + method + middleware chain)
↓
Controller       (HTTP in / HTTP out)
↓
Service          (business rules, transactions, orchestration)
↓
Repository       (the only code that talks to Prisma)
↓
Prisma
↓
Database
```

Compared with the Next.js app:

| Next.js app               | Express backend                      |
| ------------------------- | ------------------------------------ |
| `app/` pages + route handlers | `routes/`                        |
| `actions/`                | `controllers/`                       |
| `hooks/`, `components/`   | *(not applicable — no UI)*           |
| `services/` (touched Prisma) | `services/` (logic only) + `repositories/` (Prisma only) |
| `schemas/`                | `schemas/` (unchanged)               |
| Cloudflare R2 via `lib/`  | `lib/r2.ts` + `storage.service.ts`   |

---

# Project Structure

```text
backend/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   ├── server.ts                  # starts the HTTP server, graceful shutdown
│   ├── app.ts                     # builds the Express app (no listen())
│   │
│   ├── config/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── schemas/
│   ├── middlewares/
│   ├── lib/
│   ├── errors/
│   ├── types/
│   ├── utils/
│   └── constants/
│
├── tests/                         # mirrors src/ one-to-one
│
├── .env.example
├── .eslintrc / eslint.config.mjs
├── .prettierrc
├── package.json
└── tsconfig.json
```

`app.ts` and `server.ts` are split on purpose: tests import `app` and fire
requests at it with supertest without opening a port.

---

# config/

Environment and static configuration. Nothing here does work; it only reads
and validates.

```text
config/
│
├── env.ts          # Zod-parsed process.env — the ONLY place process.env is read
├── cors.ts         # allowed origins
└── index.ts        # re-exports a typed `config` object
```

### Rules

- The server **refuses to start** if `env.ts` fails validation.
- No other file reads `process.env`. Import `config` instead.
- Secrets (Stripe key, R2 secret, Clerk secret) live only in `.env`, never in code.

---

# routes/

URL map. Routes declare *which* path, *which* method, *which* middleware, and
*which* controller method. They contain no logic.

```text
routes/
│
├── index.ts                       # mounts everything under /api/v1
│
├── public/                        # no authentication
│   ├── search.routes.ts           #   GET /search
│   ├── catalog.routes.ts          #   GET /products, /products/:slug
│   ├── vehicle-catalog.routes.ts  #   GET /vehicles
│   ├── ecu-catalog.routes.ts      #   GET /ecu-types
│   ├── modification-catalog.routes.ts
│   ├── hardware-catalog.routes.ts #   GET /hardware/ics, /hardware/controllers
│   ├── programmer-catalog.routes.ts
│   ├── pinout-catalog.routes.ts
│   ├── online-service-catalog.routes.ts
│   └── media.routes.ts            #   GET /media/products/:filename, /media/pinouts/:filename
│
├── account/                       # authenticated customer
│   ├── cart.routes.ts
│   ├── hardware-cart.routes.ts
│   ├── checkout.routes.ts         #   POST /checkout, /checkout/buy-now
│   ├── customer-order.routes.ts   #   /account/my-orders
│   ├── online-order.routes.ts
│   ├── customer-hardware-order.routes.ts
│   ├── download.routes.ts         #   /account/downloads
│   └── account-settings.routes.ts
│
├── admin/                         # authenticated + admin role
│   ├── dashboard.routes.ts
│   ├── brand.routes.ts
│   ├── vehicle-model.routes.ts
│   ├── controller.routes.ts
│   ├── modification-type.routes.ts
│   ├── online-service-type.routes.ts
│   ├── firmware.routes.ts
│   ├── product.routes.ts
│   ├── service.routes.ts
│   ├── hardware.routes.ts
│   ├── programmer.routes.ts
│   ├── pinout.routes.ts
│   ├── order.routes.ts
│   ├── hardware-order.routes.ts
│   ├── customer.routes.ts
│   └── admin-settings.routes.ts
│
└── webhooks/
    └── stripe.routes.ts           #   POST /webhooks/stripe  (raw body!)
```

### URL conventions

```text
/api/v1/<area>/<resource>

/api/v1/products                    public
/api/v1/account/downloads           customer
/api/v1/admin/brands                admin
/api/v1/webhooks/stripe             signature-verified
```

### Example route file

```ts
// routes/admin/brand.routes.ts
import { Router } from "express"
import { brandController } from "@/controllers/admin/brand.controller"
import { validate } from "@/middlewares/validate"
import { brandSchemas } from "@/schemas/brand.schema"

export const brandRoutes = Router()

brandRoutes.get("/",    validate({ query: brandSchemas.list }),                brandController.list)
brandRoutes.get("/:id", validate({ params: brandSchemas.idParam }),            brandController.getById)
brandRoutes.post("/",   validate({ body: brandSchemas.create }),               brandController.create)
brandRoutes.patch("/:id", validate({ params: brandSchemas.idParam, body: brandSchemas.update }), brandController.update)
brandRoutes.delete("/:id", validate({ params: brandSchemas.idParam }),         brandController.remove)
```

Authentication and the admin role check are applied **once** where the area is
mounted in `routes/index.ts`, not repeated in every file:

```ts
// routes/index.ts
router.use("/",         publicRouter)
router.use("/account",  authenticate, accountRouter)
router.use("/admin",    authenticate, requireRole("ADMIN"), adminRouter)
```

### Responsibilities

- Path + HTTP method
- Attach middleware (validation, uploads, rate limits)
- Point at a controller method

**Never** put logic, Prisma calls, or `try/catch` in a route file.

---

# controllers/

The HTTP boundary. A controller reads the request, calls **one** service
method, and shapes the response. It is the backend equivalent of a Server
Action.

```text
controllers/
│
├── public/
│   ├── search.controller.ts
│   ├── catalog.controller.ts
│   ├── hardware-catalog.controller.ts
│   └── media.controller.ts
│
├── account/
│   ├── cart.controller.ts
│   ├── checkout.controller.ts
│   ├── customer-order.controller.ts
│   ├── download.controller.ts
│   └── account-settings.controller.ts
│
├── admin/
│   ├── brand.controller.ts
│   ├── firmware.controller.ts
│   ├── product.controller.ts
│   ├── hardware.controller.ts
│   └── ...
│
└── webhooks/
    └── stripe.controller.ts
```

The folders mirror `routes/` exactly, so a route file and its controller are
always in the same relative place.

### Example controller

```ts
// controllers/admin/brand.controller.ts
import { asyncHandler } from "@/utils/async-handler"
import { brandService } from "@/services/brand.service"
import { ok, created, noContent } from "@/utils/api-response"

export const brandController = {
  list: asyncHandler(async (req, res) => {
    const result = await brandService.list(req.query)
    ok(res, result)
  }),

  create: asyncHandler(async (req, res) => {
    const brand = await brandService.create(req.body, req.auth.userId)
    created(res, brand)
  }),

  remove: asyncHandler(async (req, res) => {
    await brandService.remove(req.params.id)
    noContent(res)
  }),
}
```

### Responsibilities

- Read `req.body`, `req.params`, `req.query`, `req.auth`, `req.file`
- Call a service
- Pick the status code and send the response

### Controllers must not

- Contain business rules (price calculation, order status transitions…)
- Import Prisma or a repository
- Import another controller
- Catch errors (the `asyncHandler` forwards them to the error middleware)

---

# services/

The **business logic layer**. Everything the application *means* lives here.

```text
services/
│
├── brand.service.ts
├── vehicle-model.service.ts
├── controller.service.ts
├── modification-type.service.ts
├── online-service-type.service.ts
├── firmware.service.ts
├── product.service.ts
├── service.service.ts              # airbag / K code / PIN code price list
│
├── hardware.service.ts             # ADMIN: CRUD for ICS / controller units
├── hardware-catalog.service.ts     # STOREFRONT: browse + filter
├── programmer.service.ts
├── pinout.service.ts
│
├── search.service.ts
├── cart.service.ts
├── hardware-cart.service.ts
├── order.service.ts                # status state machine, grants/revokes access
├── customer-order.service.ts       # customer-facing order reads + checkout
├── customer-hardware-order.service.ts
├── online-order.service.ts
├── download.service.ts             # spends allowance atomically, presigns R2
│
├── payment.service.ts              # Stripe session + webhook handling
├── storage.service.ts              # upload / delete / presign on R2
├── customer.service.ts             # accounts mirrored from Clerk
├── dashboard.service.ts
└── admin-settings.service.ts
```

> **Naming rule carried over from the Next.js app:** when the admin side and
> the storefront both need the same table, the admin layer owns the bare name
> (`hardware.service.ts`) and the storefront gets a qualified name
> (`hardware-catalog.service.ts`, `customer-hardware-order.service.ts`).

### Example service

```ts
// services/brand.service.ts
import { brandRepository } from "@/repositories/brand.repository"
import { storageService } from "@/services/storage.service"
import { ConflictError, NotFoundError } from "@/errors"
import { slugify } from "@/utils/slugify"

export const brandService = {
  async create(input: CreateBrandInput) {
    const slug = slugify(input.name)

    if (await brandRepository.findBySlug(slug)) {
      throw new ConflictError("A brand with this name already exists")
    }

    return brandRepository.create({ ...input, slug })
  },

  async remove(id: string) {
    const brand = await brandRepository.findById(id)
    if (!brand) throw new NotFoundError("Brand not found")

    await brandRepository.delete(id)
    if (brand.logoKey) await storageService.delete(brand.logoKey)
  },
}
```

### Responsibilities

- Business rules and invariants
- Uniqueness checks the database cannot express
- Orchestrating several repositories
- Transactions (`prisma.$transaction`, see below)
- Calling external providers through `lib/` clients (Stripe, R2)
- Mapping repository records into response DTOs

### Services must not

- Import `express` (`Request`, `Response`) — a service knows nothing about HTTP
- Import `PrismaClient` or call `prisma.*` directly — go through a repository
- Import a controller

Services **may** call other services. Keep the graph acyclic: if
`order.service` needs `download.service`, `download.service` must not need
`order.service`.

---

# repositories/

The **data access layer**. This is the only place in the codebase where
`prisma.*` is written.

```text
repositories/
│
├── base.repository.ts          # shared helpers: pagination, soft filters, tx pick
│
├── brand.repository.ts
├── vehicle-model.repository.ts
├── controller.repository.ts
├── modification-type.repository.ts
├── online-service-type.repository.ts
├── firmware.repository.ts
├── product.repository.ts
├── service.repository.ts
│
├── hardware.repository.ts
├── hardware-catalog.repository.ts
├── programmer.repository.ts
├── pinout.repository.ts
│
├── cart.repository.ts
├── hardware-cart.repository.ts
├── order.repository.ts
├── hardware-order.repository.ts
├── online-order.repository.ts
├── download.repository.ts
├── user.repository.ts
└── dashboard.repository.ts     # aggregate / count queries
```

### Example repository

```ts
// repositories/brand.repository.ts
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Db = Prisma.TransactionClient | typeof prisma

export const brandRepository = {
  findById: (id: string, db: Db = prisma) =>
    db.brand.findUnique({ where: { id } }),

  findBySlug: (slug: string, db: Db = prisma) =>
    db.brand.findUnique({ where: { slug } }),

  findMany: (args: Prisma.BrandFindManyArgs, db: Db = prisma) =>
    db.brand.findMany(args),

  create: (data: Prisma.BrandCreateInput, db: Db = prisma) =>
    db.brand.create({ data }),

  update: (id: string, data: Prisma.BrandUpdateInput, db: Db = prisma) =>
    db.brand.update({ where: { id }, data }),

  delete: (id: string, db: Db = prisma) =>
    db.brand.delete({ where: { id } }),
}
```

### Transactions

Repositories never *start* a transaction. The **service** starts it and
passes the `tx` client into every repository call that must be part of it:

```ts
// services/download.service.ts
await prisma.$transaction(async (tx) => {
  const entitlement = await downloadRepository.spendAllowance(id, tx)
  await downloadRepository.logDownload(userId, productId, tx)
})
```

That is why every repository method takes an optional trailing `db`
parameter.

### Responsibilities

- Prisma queries (`findMany`, `create`, `aggregate`, raw SQL)
- `select` / `include` shapes
- Translating filter objects into `where` clauses

### Repositories must not

- Contain business rules or throw domain errors (`ConflictError`, …). They
  return `null` or a row; the service decides what that means.
- Call other repositories
- Call R2, Stripe or Clerk
- Import `express`

---

# schemas/

Zod schemas for everything that crosses the HTTP boundary.

```text
schemas/
│
├── common.schema.ts            # idParam, pagination, sort, slug
├── brand.schema.ts
├── firmware.schema.ts
├── product.schema.ts
├── hardware.schema.ts
├── cart.schema.ts
├── checkout.schema.ts
├── order.schema.ts
└── ...
```

One file per entity. Each file exports the request schemas **and** the inferred
input types:

```ts
// schemas/brand.schema.ts
import { z } from "zod"

export const brandSchemas = {
  idParam: z.object({ id: z.string().cuid() }),
  list:    paginationSchema.extend({ search: z.string().optional() }),
  create:  z.object({ name: z.string().min(2), isActive: z.boolean().default(true) }),
  update:  z.object({ name: z.string().min(2).optional(), isActive: z.boolean().optional() }),
}

export type CreateBrandInput = z.infer<typeof brandSchemas.create>
```

Schemas are applied by the `validate()` middleware **before** the controller
runs, so controllers and services can trust their input.

---

# middlewares/

Express middleware. Cross-cutting concerns only.

```text
middlewares/
│
├── authenticate.ts         # verifies the Clerk JWT, sets req.auth
├── require-role.ts         # requireRole("ADMIN") — role check
├── validate.ts             # validate({ body, query, params }) using Zod
├── upload.ts               # multer (memory storage) with size + mime limits
├── raw-body.ts             # express.raw() for the Stripe webhook only
├── rate-limit.ts           # per-route limiters (checkout, downloads, search)
├── request-id.ts           # attaches an id to each request for log correlation
├── not-found.ts            # 404 for unmatched routes
└── error-handler.ts        # the ONE place errors become responses
```

### Order in `app.ts`

```text
1. helmet, cors
2. request-id, logger
3. /webhooks/stripe  (raw body — mounted BEFORE express.json)
4. express.json()
5. rate-limit
6. /api/v1 routes
7. not-found
8. error-handler            (always last)
```

**The Stripe webhook must be mounted before `express.json()`.** Signature
verification needs the unparsed bytes; once the body has been parsed as JSON
the signature check will always fail.

### File uploads

`upload.ts` uses multer with **memory storage**. The file buffer is handed to
the controller → service → `storage.service.ts`, which sends it to R2. Nothing
is ever written to the server's disk.

---

# lib/

Shared clients and initialised SDKs. Singletons only.

```text
lib/
│
├── prisma.ts       # single PrismaClient instance
├── r2.ts           # S3Client configured for Cloudflare R2
├── stripe.ts       # Stripe client
├── clerk.ts        # Clerk client
└── logger.ts       # pino instance
```

```ts
// lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3"
import { config } from "@/config"

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
})
```

`lib/` creates clients. It contains **no business logic**. What to *do* with
the R2 client (key naming, presigning, deleting) lives in
`services/storage.service.ts`.

---

# Cloudflare R2 rules

```text
Buckets
│
├── <app>-private       # firmware binaries, pinout PDFs, product images
└── (optional public bucket behind a custom domain for non-sensitive artwork)
```

- **Store the object key in the database, never a URL.** Build URLs when
  responding, so the bucket or domain can change without a data migration.
- **Key convention:** `<kind>/<entityId>/<uuid>-<safe-filename>`
  e.g. `firmware/clx123/9f2c…-bosch-edc17.bin`
- **Firmware downloads** are always **presigned GET URLs** with a short expiry
  (60–300 s), generated only *after* the download allowance has been spent in
  the same request. See `download.service.ts`.
- **Images and PDFs from a private bucket** are streamed through
  `GET /api/v1/media/...` (as the Next.js app does with `/api/images/...` and
  `/api/pinouts/...`), because `<img>` tags and pasted links carry no session.
- **Only `storage.service.ts` imports `lib/r2.ts`.** Every other service asks
  `storageService` for what it needs: `upload`, `delete`, `getPresignedUrl`,
  `stream`.
- Deleting a database row and deleting its R2 object are two steps. Delete the
  row first, then the object; a failed object delete leaves a harmless orphan
  that a cleanup job can sweep, whereas the reverse leaves a broken record.
- Compute and store a **checksum** (SHA-256) on firmware upload, as the
  existing `products-feature` does.

---

# errors/

Typed errors thrown by services and turned into responses by
`middlewares/error-handler.ts`.

```text
errors/
│
├── app-error.ts            # base class: statusCode, code, message, details
├── http-errors.ts          # BadRequestError, UnauthorizedError, ForbiddenError,
│                           # NotFoundError, ConflictError, UnprocessableError
└── index.ts
```

```ts
throw new NotFoundError("Brand not found")        // → 404
throw new ConflictError("Slug already exists")    // → 409
```

Anything that is not an `AppError` is logged and returned as a generic `500`
with no internal details.

### Standard response shapes

```jsonc
// success
{ "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 134 } }

// error
{ "error": { "code": "CONFLICT", "message": "Slug already exists", "details": null } }
```

Controllers use the helpers in `utils/api-response.ts` so every response has
the same envelope.

---

# types/

Global TypeScript types.

```text
types/
│
├── express.d.ts            # augments Request with `auth` and `file`
├── api.ts                  # ApiResponse, PaginatedResult
└── dto/
    ├── brand.dto.ts        # shapes returned to clients (never raw Prisma rows)
    ├── order.dto.ts
    └── ...
```

Responses are **DTOs, not Prisma rows**. A service maps the row into a DTO so
secrets, internal flags and storage keys never leak by accident.

---

# utils/

Pure helpers. No Express, no Prisma, no network.

```text
utils/
│
├── async-handler.ts        # wraps controllers, forwards rejections to next()
├── api-response.ts         # ok(), created(), noContent(), paginated()
├── slugify.ts
├── pagination.ts           # page/pageSize → skip/take, meta builder
├── checksum.ts             # sha256 of a buffer
├── money.ts                # Decimal-safe price helpers
└── file-name.ts            # sanitise uploaded file names
```

---

# constants/

```text
constants/
│
├── roles.ts                # ADMIN, CUSTOMER
├── pagination.ts           # default and max page size
├── order-status.ts         # status list + allowed transitions
├── hardware.ts             # HARDWARE_TYPE_META registry
├── storage.ts              # R2 key prefixes, allowed mime types, size limits
└── error-codes.ts
```

`order-status.ts` is the single source of truth for the status state machine
described in `orders-feature.md`; `order.service.ts` reads it, nothing else
re-implements it.

---

# prisma/

```text
prisma/
│
├── schema.prisma
├── migrations/
└── seed.ts
```

Schema, migrations and seed data (see `database-seeding.md`). The generated
client is imported **only** by `lib/prisma.ts` and, for types, by
repositories.

---

# tests/

```text
tests/
│
├── unit/
│   ├── services/           # repositories mocked
│   └── utils/
├── integration/
│   ├── repositories/       # real test database
│   └── routes/             # supertest against `app`
└── fixtures/
```

The layering makes this straightforward: services are tested with fake
repositories, repositories against a real database, routes end to end.

---

# Architecture Rules

**Dependency direction — a layer may only import from the layer below it.**

```text
routes → controllers → services → repositories → lib/prisma
                          ↓
                      lib/stripe, storage.service → lib/r2
```

| Layer        | May import                                         | Must NOT import                         |
| ------------ | -------------------------------------------------- | --------------------------------------- |
| routes       | controllers, middlewares, schemas                  | services, repositories, Prisma          |
| controllers  | services, utils, types                             | repositories, Prisma, other controllers |
| services     | repositories, other services, lib (non-Prisma), errors, constants | `express`, `prisma` directly |
| repositories | `lib/prisma`, Prisma types                         | services, controllers, R2, Stripe       |
| schemas      | `zod`, constants                                   | everything else                         |

More rules:

- Controllers never talk to Prisma. **Only repositories talk to Prisma.**
- Business logic belongs only inside services.
- Validation belongs inside `schemas/` and runs in middleware.
- A service method takes plain data and returns plain data — never `req`/`res`.
- A repository method does **one** query (or one tightly related query).
- Errors are thrown, never returned as `{ success: false }`; one error handler
  formats them.
- `process.env` is read only in `config/env.ts`.
- `R2` is touched only through `storage.service.ts`.
- Use the `@/` path alias for all cross-folder imports; use relative imports
  only inside the same folder.

### Documented exceptions

- **Dashboard.** `dashboard.service.ts` is read-only and aggregates across
  many tables. It uses `dashboard.repository.ts` for the queries but is allowed
  to call several other repositories read-only, instead of going through every
  feature's service.
- **Stripe webhook.** `stripe.controller.ts` has no session. It authenticates by
  verifying the signature over the raw body, then delegates immediately to
  `payment.service.ts`. All rules about what a paid order *means* live in that
  service, never in the controller.
- **Media streaming.** `media.controller.ts` pipes an R2 stream to the response
  instead of returning JSON; it still gets the stream from
  `storageService.stream()`.

---

# File Naming

| Kind        | Pattern                          | Example                           |
| ----------- | -------------------------------- | --------------------------------- |
| Route       | `<feature>.routes.ts`            | `brand.routes.ts`                 |
| Controller  | `<feature>.controller.ts`        | `brand.controller.ts`             |
| Service     | `<feature>.service.ts`           | `brand.service.ts`                |
| Repository  | `<feature>.repository.ts`        | `brand.repository.ts`             |
| Schema      | `<feature>.schema.ts`            | `brand.schema.ts`                 |
| DTO         | `<feature>.dto.ts`               | `brand.dto.ts`                    |
| Middleware  | `<verb-or-noun>.ts`              | `require-role.ts`                 |
| Test        | `<file>.test.ts`                 | `brand.service.test.ts`           |

- Files and folders: `kebab-case`.
- Types and classes: `PascalCase`. Functions and variables: `camelCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Exported objects are named after the file: `brandService`,
  `brandRepository`, `brandController`.
- One feature = the **same base name** in every layer. Searching for `brand`
  finds its route, controller, service, repository, schema and test.

---

# Adding a New Feature

Every feature follows the same implementation order, bottom-up:

```text
1. Update prisma/schema.prisma + create a migration
   ↓
2. Create the repository          repositories/<feature>.repository.ts
   ↓
3. Create the Zod schemas         schemas/<feature>.schema.ts
   ↓
4. Create the service             services/<feature>.service.ts
   ↓
5. Create the controller          controllers/<area>/<feature>.controller.ts
   ↓
6. Create the route               routes/<area>/<feature>.routes.ts
   ↓
7. Mount it in the area router    routes/<area>/index.ts
   ↓
8. Write tests                    service (mocked repo) → repository → route
   ↓
9. Refactor
```

### Feature example — Firmware upload (admin)

```text
POST /api/v1/admin/firmware

routes/admin/firmware.routes.ts
│   upload.single("file") → validate({ body }) → firmwareController.create
│
controllers/admin/firmware.controller.ts
│   reads req.body + req.file, calls firmwareService.create
│
services/firmware.service.ts
│   checks uniqueness → sha256(file) → storageService.upload()
│   → firmwareRepository.create({ ..., fileKey, checksum })
│
├── services/storage.service.ts   →  lib/r2.ts  →  Cloudflare R2
└── repositories/firmware.repository.ts  →  lib/prisma.ts  →  PostgreSQL
```

### Feature example — Download (customer)

```text
GET /api/v1/account/downloads/:productId/link

download.controller   → downloadService.createLink(userId, productId)
download.service      → $transaction:
                          downloadRepository.spendAllowance(…, tx)
                          downloadRepository.log(…, tx)
                        then storageService.getPresignedUrl(fileKey, 120)
download.controller   → ok(res, { url, expiresIn })
```

---

# Benefits

- Each layer has one reason to change: URLs, HTTP shape, business rules, or
  queries.
- Database access is isolated, so a query can be optimised or the ORM swapped
  without touching business logic.
- Services are testable without a database; repositories are testable without
  HTTP.
- The same base name across layers makes any feature easy to find.
- R2, Stripe and Clerk each have exactly one entry point.
- The structure mirrors the existing Next.js app, so every domain document
  (`brands-feature.md`, `firmware-feature.md`, `payments-feature.md`, …) maps
  onto it directly.
