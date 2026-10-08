# Backend

REST API for the Adaptive Learning Web Platform, built with Node.js, Express and TypeScript.
It follows the layer-based architecture in
[`docs/backend-folder-structure.md`](docs/backend-folder-structure.md):

```text
Route → Controller → Service → Repository → Prisma → PostgreSQL
```

## Stack

| Concern        | Choice                                                  |
| -------------- | ------------------------------------------------------- |
| Runtime / HTTP | Node.js (>= 20.19) + Express 5                          |
| Language       | TypeScript 6 (strict), `@/` path alias for `src/`       |
| ORM / DB       | Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)        |
| Validation     | Zod 4                                                   |
| Security       | helmet, cors, express-rate-limit                        |
| Logging        | pino + pino-http (pretty output in development)         |
| Testing        | Vitest + supertest                                      |
| Tooling        | ESLint 10 (typescript-eslint), Prettier, tsx, tsc-alias |

## Getting started

```bash
cd backend
npm install            # also runs `prisma generate`
cp .env.example .env   # then edit the values (a .env with the defaults already exists)
npm run dev            # http://localhost:5000
```

Check the server is up: `GET http://localhost:5000/api/v1/health`

- `200` with `"database": "up"` when PostgreSQL is reachable
- `503` with `"database": "down"` when the server is up but the database isn't

## Environment variables

All variables are validated in `src/config/env.ts` at startup. If one is invalid, the server
does not start. `process.env` is not read anywhere else; import `config` from `@/config`.

| Variable       | Default                 | Description                                       |
| -------------- | ----------------------- | ------------------------------------------------- |
| `NODE_ENV`     | `development`           | `development`, `test` or `production`             |
| `PORT`         | `5000`                  | HTTP port                                         |
| `LOG_LEVEL`    | `info`                  | pino level (`fatal` … `trace`, or `silent`)       |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins (Vite dev server) |
| `DATABASE_URL` | none (required)         | PostgreSQL connection string                      |

`.env` is gitignored. `.env.example` is committed and lists every variable.

## Scripts

| Script                    | What it does                                           |
| ------------------------- | ------------------------------------------------------ |
| `npm run dev`             | Starts the server with hot reload (tsx watch)          |
| `npm run build`           | Compiles to `dist/` and rewrites `@/` aliases          |
| `npm start`               | Runs the compiled server (`dist/server.js`)            |
| `npm run typecheck`       | Type-checks without emitting                           |
| `npm run lint`            | Runs ESLint (`lint:fix` to auto-fix)                   |
| `npm run format`          | Formats with Prettier (`format:check` to verify)       |
| `npm test`                | Runs the test suite once (`test:watch` for watch mode) |
| `npm run prisma:generate` | Regenerates the Prisma client                          |
| `npm run prisma:migrate`  | Creates and applies a migration (`prisma migrate dev`) |
| `npm run prisma:studio`   | Opens Prisma Studio                                    |
| `npm run db:seed`         | Runs `prisma/seed.ts`                                  |

## Folder structure

```text
backend/
├── docs/                       # architecture docs
├── prisma/
│   ├── schema.prisma           # generator + datasource (no models yet)
│   ├── migrations/
│   └── seed.ts
├── prisma.config.ts            # Prisma 7 config: schema path, DATABASE_URL, seed command
├── src/
│   ├── server.ts               # listen() on PORT + graceful shutdown
│   ├── app.ts                  # builds the Express app (no listen), used by tests
│   ├── config/                 # env.ts (Zod-validated env), cors.ts, index.ts
│   ├── routes/                 # index.ts mounts /api/v1
│   │   ├── public/             #   no auth: health.routes.ts
│   │   ├── account/            #   authenticated users (empty)
│   │   ├── admin/              #   privileged users (empty)
│   │   └── webhooks/           #   raw-body webhooks (empty)
│   ├── controllers/            # mirrors routes/: public/health.controller.ts
│   ├── services/               # business logic: health.service.ts
│   ├── repositories/           # the only Prisma code: base + health repository
│   ├── schemas/                # Zod request schemas: common.schema.ts
│   ├── middlewares/            # request-id, request-logger, validate, rate-limit,
│   │                           # not-found, error-handler
│   ├── lib/                    # singletons: prisma.ts, logger.ts
│   ├── errors/                 # AppError + typed HTTP errors
│   ├── types/                  # api.ts (response envelopes), dto/
│   ├── utils/                  # async-handler, api-response, pagination, slugify
│   ├── constants/              # error-codes, pagination, roles
│   └── generated/prisma/       # generated Prisma client (gitignored)
└── tests/
    ├── unit/{services,utils}/
    ├── integration/{repositories,routes}/
    └── fixtures/
```

The health check goes through every layer
(`health.routes` → `health.controller` → `health.service` → `health.repository` → Prisma),
so you can copy it when adding a feature.

## Request pipeline (`src/app.ts`)

1. `helmet`, `cors`
2. `request-id` (sets and echoes `X-Request-Id`), pino-http logger (off in tests)
3. _(slot for raw-body webhooks, which must come before `express.json`)_
4. `express.json()` (1 MB limit), `express.urlencoded()`
5. Global rate limit on `/api` (300 requests per 15 min per IP)
6. `/api/v1` routes
7. `not-found`
8. `error-handler` (always last)

## Response format

```jsonc
// success
{ "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 134 } }

// error
{ "error": { "code": "NOT_FOUND", "message": "Brand not found", "details": null } }
```

Services throw the errors in `src/errors` (`NotFoundError`, `ConflictError`, …).
`error-handler.ts` turns them into the error envelope. Any other error is logged and returned
as a generic `500` with no internal details. Validation failures from `validate()` return
`400 VALIDATION_ERROR` with one entry per issue in `details`.

## Adding a feature

Follow the order in the architecture doc (bottom-up):

1. Add the model to `prisma/schema.prisma`, then `npm run prisma:migrate`
2. `src/repositories/<feature>.repository.ts`, the only place `prisma.*` is used
3. `src/schemas/<feature>.schema.ts` for Zod schemas and inferred input types
4. `src/services/<feature>.service.ts` for business rules (no Express, no Prisma)
5. `src/controllers/<area>/<feature>.controller.ts`, wrapping handlers with `asyncHandler`
6. `src/routes/<area>/<feature>.routes.ts` with `validate({ body, query, params })`
7. Mount it in `src/routes/<area>/index.ts`
8. Add tests under `tests/`

## Setup notes and differences from the architecture doc

The architecture doc was written for another project (an ECU store), so only its
**structure and conventions** were adopted. Its domain-specific parts were left out:

- **No domain features were created.** Brands, firmware, cart, orders and so on belong to the
  other project. Only a `health` feature exists, to show the layers working end to end.
- **No Clerk, Stripe or Cloudflare R2.** `authenticate.ts`, `require-role.ts`, `upload.ts`,
  `raw-body.ts`, `lib/r2.ts`, `lib/stripe.ts`, `lib/clerk.ts` and `storage.service.ts` are not
  created yet. Add them once the auth and storage choices for this platform are made. The
  `/account` and `/admin` routers are mounted with a `TODO` for `authenticate`.
- **Roles** in `constants/roles.ts` are `STUDENT`, `PARENT`, `TEACHER` (from the root README),
  not `ADMIN` / `CUSTOMER`.
- **Prisma 7** keeps the connection URL in `prisma.config.ts` instead of `schema.prisma`, and
  generates the client into `src/generated/prisma` (import it from
  `@/generated/prisma/client`, not `@prisma/client`). It connects through `@prisma/adapter-pg`.
- **TypeScript is pinned to 6.0.x** because typescript-eslint doesn't support TypeScript 7 yet.
- **Express 5** makes `req.query` a getter, so `validate()` redefines it with the parsed value.
- `npm audit` reports high-severity advisories in **dev-only** tooling (`tsc-alias`'s
  file watcher dependencies and the Prisma CLI). None of these packages ship in the runtime.
