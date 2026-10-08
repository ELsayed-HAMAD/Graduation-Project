import { prisma } from "@/lib/prisma"
import type { Db } from "./base.repository"

export const healthRepository = {
  ping: (db: Db = prisma) => db.$queryRaw`SELECT 1`,
}
