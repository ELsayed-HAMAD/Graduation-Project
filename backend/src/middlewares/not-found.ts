import type { RequestHandler } from "express"
import { NotFoundError } from "@/errors"

/** 404 for unmatched routes. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`))
}
