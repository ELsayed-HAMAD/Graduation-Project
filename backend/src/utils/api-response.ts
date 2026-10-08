import type { Response } from "express"
import type { ApiSuccess, PaginatedResult } from "@/types/api"

export const ok = <T>(res: Response, data: T) => {
  res.status(200).json({ data } satisfies ApiSuccess<T>)
}

export const created = <T>(res: Response, data: T) => {
  res.status(201).json({ data } satisfies ApiSuccess<T>)
}

export const noContent = (res: Response) => {
  res.status(204).end()
}

export const paginated = <T>(res: Response, result: PaginatedResult<T>) => {
  res.status(200).json({ data: result.items, meta: result.meta } satisfies ApiSuccess<T[]>)
}
