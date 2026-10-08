import type { RequestHandler } from "express"
import type { ZodType } from "zod"
import { ValidationError } from "@/errors"

interface ValidationSchemas {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

/**
 * validate({ body, query, params }) — parses each part of the request with Zod
 * and replaces it with the parsed (typed, defaulted, coerced) value.
 */
export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req, _res, next) => {
    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key]
      if (!schema) continue

      const result = schema.safeParse(req[key])
      if (!result.success) {
        throw new ValidationError(
          result.error.issues.map((issue) => ({
            location: key,
            path: issue.path.join("."),
            message: issue.message,
          })),
        )
      }

      // Express 5 exposes req.query as a getter, so redefine it as a plain property.
      Object.defineProperty(req, key, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      })
    }
    next()
  }
