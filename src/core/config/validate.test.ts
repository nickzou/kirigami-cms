import { describe, expect, it } from "vitest";
import { fontStackProblem, hasNoBreakout } from "./validate.js";

describe("hasNoBreakout", () => {
  it.each(["Georgia, serif", '"Helvetica Neue", sans-serif', "inherit"])(
    "allows %s",
    (value) => expect(hasNoBreakout(value)).toBe(true),
  );

  it.each(["a; b", "a { b", "a } b", "a <b", "a > b", "a \\ b", "a /* b */"])(
    "refuses %s",
    (value) => expect(hasNoBreakout(value)).toBe(false),
  );
});

describe("fontStackProblem", () => {
  it("is undefined for a font list", () => {
    expect(
      fontStackProblem('Georgia, "Times New Roman", serif'),
    ).toBeUndefined();
  });

  it("asks for one when empty", () => {
    expect(fontStackProblem("")).toContain("Enter");
  });

  it("explains what is not allowed", () => {
    expect(fontStackProblem("a; color: red")).toContain("without");
  });
});
