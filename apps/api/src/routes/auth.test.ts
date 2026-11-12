import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("authentication input contracts", () => {
  const signup = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128)
  });
  it("accepts a valid signup payload", () => {
    expect(signup.safeParse({ name: "Alex", email: "alex@example.com", password: "correct-horse-12" }).success).toBe(true);
  });
  it("rejects weak passwords and malformed emails", () => {
    expect(signup.safeParse({ name: "A", email: "not-an-email", password: "123" }).success).toBe(false);
  });
});