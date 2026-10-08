import { app } from "@/app"
import { config } from "@/config"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

const server = app.listen(config.port, () => {
  logger.info(`Server listening on http://localhost:${config.port} (${config.env})`)
})

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`)

  server.close(async (err) => {
    await prisma.$disconnect()
    if (err) {
      logger.error({ err }, "Error while closing the HTTP server")
      process.exit(1)
    }
    process.exit(0)
  })

  // Force exit if open connections do not drain in time.
  setTimeout(() => {
    logger.error("Forced shutdown after timeout")
    process.exit(1)
  }, 10_000).unref()
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection")
})
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception")
  process.exit(1)
})
