import type { ErrorRequestHandler } from "express"
import { ERROR_CODES } from "@/constants/error-codes"
import { AppError } from "@/errors"
import { logger } from "@/lib/logger"
import type { ApiError } from "@/types/api"

/** The ONE place errors become responses. Must be registered last. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    } satisfies ApiError)
    return
  }

  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      error: { code: ERROR_CODES.BAD_REQUEST, message: "Malformed JSON body", details: null },
    } satisfies ApiError)
    return
  }

  // Anything else is unexpected: log it, return a generic 500 with no internals.
  const log = req.log ?? logger
  log.error({ err }, "Unhandled error")
  res.status(500).json({
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Internal server error", details: null },
  } satisfies ApiError)
}
