-- Clerk (Google / Apple) sign-in support for the `users` table.
-- Generated with `prisma migrate diff` from the schema change in schema.prisma.
-- The database is not managed by Prisma Migrate yet, so apply this by hand
-- (Neon SQL editor or psql) before using /api/v1/auth/*.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clerk_user_id" VARCHAR,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");
