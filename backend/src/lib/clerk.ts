import { createClerkClient } from "@clerk/express"
import { config } from "@/config"

/** The single Clerk Backend API client. Used by clerkMiddleware (app.ts) and services. */
export const clerkClient = createClerkClient({
  publishableKey: config.clerk.publishableKey,
  secretKey: config.clerk.secretKey,
})
