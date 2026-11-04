import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "./password.js";

describe("passwordProblem", () => {
  it("accepts a password of the minimum length", () => {
    expect(passwordProblem("x".repeat(MIN_PASSWORD_LENGTH))).toBeUndefined();
  });

  it("refuses a shorter one, and an empty one", () => {
    expect(passwordProblem("x".repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(
      /at least 8 characters/,
    );
    expect(passwordProblem("")).toMatch(/at least 8 characters/);
  });
});
