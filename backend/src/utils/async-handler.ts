import type { NextFunction, Request, RequestHandler, Response } from "express"

/**
 * Wraps an async controller and forwards any rejection to `next()`,
 * so controllers never need their own try/catch.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }
