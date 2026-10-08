import { PrismaPg } from "@prisma/adapter-pg"
import { config } from "@/config"
import { PrismaClient } from "@/generated/prisma/client"

/** The single PrismaClient instance. Only repositories import this. */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.databaseUrl }),
})
