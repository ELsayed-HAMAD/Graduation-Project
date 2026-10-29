import { clerkMiddleware } from "@clerk/express"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import { config } from "@/config"
import { clerkClient } from "@/lib/clerk"
import { errorHandler } from "@/middlewares/error-handler"
import { notFound } from "@/middlewares/not-found"
import { globalRateLimit } from "@/middlewares/rate-limit"
import { requestId } from "@/middlewares/request-id"
import { requestLogger } from "@/middlewares/request-logger"
import { router } from "@/routes"

/** Builds the Express app without calling listen(), so tests can use it directly. */
export const createApp = () => {
  const app = express()

  app.disable("x-powered-by")
  app.set("trust proxy", 1)

  // 1. security headers, CORS
  app.use(helmet())
  app.use(cors(config.cors))

  // 2. request id, logger
  app.use(requestId)
  if (!config.isTest) app.use(requestLogger)

  // 3. raw-body routes (e.g. payment webhooks) go here, BEFORE express.json

  // 4. body parsing
  app.use(express.json({ limit: "1mb" }))
  app.use(express.urlencoded({ extended: true }))

  // 5. rate limiting
  app.use("/api", globalRateLimit)

  // 6. auth: attaches the Clerk session (if any) to req.auth; routes decide whether it is required
  app.use(clerkMiddleware({ ...config.clerk, clerkClient }))

  // 7. API routes
  app.use("/api/v1", router)

  // 8. 404 — 9. error handler (always last)
  app.use(notFound)
  app.use(errorHandler)

  return app
}

export const app = createApp()
