import { getAuth } from "@clerk/express"
import type { Request, RequestHandler } from "express"
import { UnauthorizedError } from "@/errors"

/** Rejects requests without a valid Clerk session. Requires clerkMiddleware() (see app.ts). */
export const authenticate: RequestHandler = (req, _res, next) => {
  const { isAuthenticated } = getAuth(req)
  if (!isAuthenticated) return next(new UnauthorizedError())
  next()
}

/** The signed-in Clerk user id. Use only behind `authenticate`. */
export const getClerkUserId = (req: Request): string => {
  const { userId } = getAuth(req)
  if (!userId) throw new UnauthorizedError()
  return userId
}
