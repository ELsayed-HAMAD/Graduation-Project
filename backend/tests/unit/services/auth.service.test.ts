import { afterEach, describe, expect, it, vi } from "vitest"
import { clerkClient } from "@/lib/clerk"
import { userRepository, type UserWithProfile } from "@/repositories/user.repository"
import { authService } from "@/services/auth.service"

const CLERK_ID = "user_123"

const fakeClerkUser = (email: string | null, verified = true) =>
  ({
    primaryEmailAddress: email
      ? { emailAddress: email, verification: { status: verified ? "verified" : "unverified" } }
      : null,
    twoFactorEnabled: false,
  }) as never

const parentRow = {
  userId: "11111111-1111-1111-1111-111111111111",
  clerkUserId: CLERK_ID,
  role: "PARENT",
  passwordHash: null,
  createdAt: new Date("2026-10-29T10:00:00.000Z"),
  parent: {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "mom@example.com",
    isEmailVerified: true,
    mfaEnabled: false,
  },
  specialist: null,
} as UserWithProfile

afterEach(() => vi.restoreAllMocks())

describe("authService.signUp", () => {
  it("creates a parent with the email read from Clerk", async () => {
    vi.spyOn(userRepository, "findByClerkUserId").mockResolvedValueOnce(null)
    vi.spyOn(clerkClient.users, "getUser").mockResolvedValueOnce(fakeClerkUser("Mom@Example.com"))
    vi.spyOn(userRepository, "emailExists").mockResolvedValueOnce(false)
    const create = vi.spyOn(userRepository, "createWithProfile").mockResolvedValueOnce(parentRow)

    const result = await authService.signUp(CLERK_ID, { role: "PARENT" })

    expect(create).toHaveBeenCalledWith({
      role: "PARENT",
      clerkUserId: CLERK_ID,
      email: "mom@example.com",
      isEmailVerified: true,
      mfaEnabled: false,
    })
    expect(result).toEqual({
      userId: parentRow.userId,
      role: "PARENT",
      createdAt: "2026-10-29T10:00:00.000Z",
      profile: {
        type: "PARENT",
        email: "mom@example.com",
        isEmailVerified: true,
        mfaEnabled: false,
      },
    })
  })

  it("rejects a Clerk user who is already registered", async () => {
    vi.spyOn(userRepository, "findByClerkUserId").mockResolvedValueOnce(parentRow)

    await expect(authService.signUp(CLERK_ID, { role: "PARENT" })).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it("rejects an email already used by another account", async () => {
    vi.spyOn(userRepository, "findByClerkUserId").mockResolvedValueOnce(null)
    vi.spyOn(clerkClient.users, "getUser").mockResolvedValueOnce(fakeClerkUser("dr@example.com"))
    vi.spyOn(userRepository, "emailExists").mockResolvedValueOnce(true)

    await expect(
      authService.signUp(CLERK_ID, { role: "DOCTOR", licenseNumber: "LIC-001" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "An account with this email already exists",
    })
  })

  it("rejects a doctor license number that is already registered", async () => {
    vi.spyOn(userRepository, "findByClerkUserId").mockResolvedValueOnce(null)
    vi.spyOn(clerkClient.users, "getUser").mockResolvedValueOnce(fakeClerkUser("dr@example.com"))
    vi.spyOn(userRepository, "emailExists").mockResolvedValueOnce(false)
    vi.spyOn(userRepository, "licenseNumberExists").mockResolvedValueOnce(true)

    await expect(
      authService.signUp(CLERK_ID, { role: "DOCTOR", licenseNumber: "LIC-001" }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it("returns 422 when the OAuth account shared no email", async () => {
    vi.spyOn(userRepository, "findByClerkUserId").mockResolvedValueOnce(null)
    vi.spyOn(clerkClient.users, "getUser").mockResolvedValueOnce(fakeClerkUser(null))

    await expect(authService.signUp(CLERK_ID, { role: "PARENT" })).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it("maps a unique-constraint race to 409", async () => {
    vi.spyOn(userRepository, "findByClerkUserId").mockResolvedValueOnce(null)
    vi.spyOn(clerkClient.users, "getUser").mockResolvedValueOnce(fakeClerkUser("t@example.com"))
    vi.spyOn(userRepository, "emailExists").mockResolvedValueOnce(false)
    vi.spyOn(userRepository, "createWithProfile").mockRejectedValueOnce({ code: "P2002" })

    await expect(authService.signUp(CLERK_ID, { role: "TEACHER" })).rejects.toMatchObject({
      statusCode: 409,
    })
  })
})

describe("authService.getCurrentUser", () => {
  it("returns the linked account", async () => {
    vi.spyOn(userRepository, "findByClerkUserId").mockResolvedValueOnce(parentRow)

    const result = await authService.getCurrentUser(CLERK_ID)

    expect(result.role).toBe("PARENT")
  })

  it("throws ACCOUNT_NOT_REGISTERED when no account is linked", async () => {
    vi.spyOn(userRepository, "findByClerkUserId").mockResolvedValueOnce(null)

    await expect(authService.getCurrentUser(CLERK_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: "ACCOUNT_NOT_REGISTERED",
    })
  })
})
