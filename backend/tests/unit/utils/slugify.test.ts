import { describe, expect, it } from "vitest"
import { slugify } from "@/utils/slugify"

describe("slugify", () => {
  it("lowercases and joins words with dashes", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world")
  })

  it("strips accents and symbols", () => {
    expect(slugify("Café & Crème!")).toBe("cafe-creme")
  })
})
