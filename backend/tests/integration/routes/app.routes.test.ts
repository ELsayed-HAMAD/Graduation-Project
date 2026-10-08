import request from "supertest"
import { describe, expect, it, vi } from "vitest"
import { app } from "@/app"
import { healthRepository } from "@/repositories/health.repository"

describe("GET /api/v1/health", () => {
  it("returns 200 when the database is reachable", async () => {
    vi.spyOn(healthRepository, "ping").mockResolvedValueOnce([])

    const res = await request(app).get("/api/v1/health")

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ status: "ok", database: "up" })
    expect(res.headers["x-request-id"]).toBeDefined()
  })

  it("returns 503 when the database is down", async () => {
    vi.spyOn(healthRepository, "ping").mockRejectedValueOnce(new Error("connection refused"))

    const res = await request(app).get("/api/v1/health")

    expect(res.status).toBe(503)
    expect(res.body.data).toMatchObject({ status: "degraded", database: "down" })
  })
})

describe("unknown routes", () => {
  it("returns the standard error envelope", async () => {
    const res = await request(app).get("/api/v1/does-not-exist")

    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route GET /api/v1/does-not-exist not found",
        details: null,
      },
    })
  })
})

describe("malformed JSON", () => {
  it("returns 400 instead of 500", async () => {
    const res = await request(app)
      .post("/api/v1/health")
      .set("Content-Type", "application/json")
      .send("{ not json")

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe("BAD_REQUEST")
  })
})
