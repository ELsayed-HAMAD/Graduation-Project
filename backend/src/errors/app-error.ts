import type { ErrorCode } from "@/constants/error-codes"

/** Base class for every error that should become an HTTP response. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message)
    this.name = new.target.name
  }
}
