import { z } from "zod"
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/constants/pagination"

export const idParamSchema = z.object({ id: z.string().min(1) })

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc")

export const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug")

export type PaginationInput = z.infer<typeof paginationSchema>
