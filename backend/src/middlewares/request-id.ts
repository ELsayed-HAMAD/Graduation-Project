import { randomUUID } from "node:crypto"
import type { RequestHandler } from "express"

const HEADER = "x-request-id"

/** Attaches an id to each request (reusing an incoming one) for log correlation. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header(HEADER)
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID()
  req.id = id
  res.setHeader(HEADER, id)
  next()
}
