import { rateLimit, type Options } from "express-rate-limit"
import { TooManyRequestsError } from "@/errors"

const build = (options: Partial<Options>) =>
  rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError()),
    ...options,
  })

/** Applied to the whole API in app.ts. */
export const globalRateLimit = build({ windowMs: 15 * 60 * 1000, limit: 300 })

/** Stricter limiter for sensitive routes (e.g. login). Attach per route. */
export const strictRateLimit = build({ windowMs: 15 * 60 * 1000, limit: 20 })
