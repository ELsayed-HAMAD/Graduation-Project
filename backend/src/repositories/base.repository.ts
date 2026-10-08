import type { Prisma } from "@/generated/prisma/client"
import type { prisma } from "@/lib/prisma"

/**
 * Every repository method takes an optional trailing `db` argument so a service
 * can run it inside `prisma.$transaction(async (tx) => ...)`.
 */
export type Db = Prisma.TransactionClient | typeof prisma
