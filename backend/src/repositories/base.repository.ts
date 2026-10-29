import type { Prisma } from "@/generated/prisma/client"
import type { prisma } from "@/lib/prisma"

/**
 * Every repository method takes an optional trailing `db` argument so a service
 * can run it inside `prisma.$transaction(async (tx) => ...)`.
 */
export type Db = Prisma.TransactionClient | typeof prisma

/** True for Prisma's unique-constraint violation (P2002), so services can map it to a 409. */
export const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" && err !== null && "code" in err && err.code === "P2002"
