import type * as ClerkExpress from "@clerk/express"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { app } from "@/app"
import { authService } from "@/services/auth.service"

// Stand in for a verified Clerk session; everything else in @clerk/express stays real.
const session = vi.hoisted(() => ({ userId: null as string | null }))
vi.mock("@clerk/express", async (importOriginal) => {
  const actual = await importOriginal<typeof ClerkExpress>()
  return {
    ...actual,
    getAuth: () => ({ isAuthenticated: session.userId !== null, userId: session.userId }),
  }
})

const userDto = {
  userId: "11111111-1111-1111-1111-111111111111",
  role: "DOCTOR" as const,
  createdAt: "2026-10-29T10:00:00.000Z",
  profile: {
    type: "DOCTOR" as const,
    email: "dr@example.com",
    organization: null,
    licenseNumber: "LIC-001",
    clinic: null,
    specialty: null,
  },
}

beforeEach(() => {
  session.userId = "user_123"
})
afterEach(() => vi.restoreAllMocks())

describe("auth routes without a Clerk session", () => {
  it.each(["/api/v1/auth/sign-up", "/api/v1/auth/sign-in"])("POST %s returns 401", async (path) => {
    session.userId = null

    const res = await request(app).post(path).send({ role: "PARENT" })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe("UNAUTHORIZED")
  })
})

describe("POST /api/v1/auth/sign-up", () => {
  it("creates the account and returns 201", async () => {
    const signUp = vi.spyOn(authService, "signUp").mockResolvedValueOnce(userDto)

    const res = await request(app)
      .post("/api/v1/auth/sign-up")
      .send({ role: "DOCTOR", licenseNumber: " LIC-001 " })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ data: userDto })
    expect(signUp).toHaveBeenCalledWith("user_123", { role: "DOCTOR", licenseNumber: "LIC-001" })
  })

  it("rejects a doctor without a license number", async () => {
    const res = await request(app).post("/api/v1/auth/sign-up").send({ role: "DOCTOR" })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe("VALIDATION_ERROR")
  })

  it("rejects the LEARNER role", async () => {
    const res = await request(app).post("/api/v1/auth/sign-up").send({ role: "LEARNER" })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe("VALIDATION_ERROR")
  })
})

describe("POST /api/v1/auth/sign-in", () => {
  it("returns the linked account", async () => {
    vi.spyOn(authService, "getCurrentUser").mockResolvedValueOnce(userDto)

    const res = await request(app).post("/api/v1/auth/sign-in")

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: userDto })
  })
})
