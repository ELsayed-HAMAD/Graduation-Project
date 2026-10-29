import { allowedOrigins, corsOptions } from "./cors"
import { env } from "./env"

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  cors: corsOptions,
  clerk: {
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
    // Only session tokens issued for our own frontends are accepted.
    authorizedParties: allowedOrigins,
  },
} as const
