import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

async function main() {
  // Insert seed data here once models exist.
  logger.info("Seed complete")
}

main()
  .catch((err) => {
    logger.error({ err }, "Seed failed")
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
