import { ERROR_CODES } from "@/constants/error-codes"
import { AppError } from "./app-error"

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details: unknown = null) {
    super(400, ERROR_CODES.BAD_REQUEST, message, details)
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = "Request validation failed") {
    super(400, ERROR_CODES.VALIDATION_ERROR, message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, ERROR_CODES.UNAUTHORIZED, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, ERROR_CODES.FORBIDDEN, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, ERROR_CODES.NOT_FOUND, message)
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(409, ERROR_CODES.CONFLICT, message)
  }
}

export class UnprocessableError extends AppError {
  constructor(message = "Unprocessable entity", details: unknown = null) {
    super(422, ERROR_CODES.UNPROCESSABLE, message, details)
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(429, ERROR_CODES.TOO_MANY_REQUESTS, message)
  }
}
