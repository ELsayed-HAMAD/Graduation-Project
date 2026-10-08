import type { ErrorCode } from "@/constants/error-codes"

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
}

export interface ApiSuccess<T> {
  data: T
  meta?: PaginationMeta
}

export interface ApiError {
  error: {
    code: ErrorCode
    message: string
    details: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginatedResult<T> {
  items: T[]
  meta: PaginationMeta
}
