import type { PaginationMeta } from "@/types/api"

/** page/pageSize → Prisma skip/take */
export const toSkipTake = (page: number, pageSize: number) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
})

export const buildMeta = (page: number, pageSize: number, total: number): PaginationMeta => ({
  page,
  pageSize,
  total,
})
