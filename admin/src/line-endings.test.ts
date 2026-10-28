import { describe, expect, it } from "vitest";
import { detectLineEndings, forDisplay, forSaving } from "./line-endings.js";

describe("line endings", () => {
  it("shows every line break as \\n", () => {
    expect(forDisplay("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });

  it("detects LF, CRLF and no line breaks at all", () => {
    expect(detectLineEndings("a\nb\n")).toEqual({ eol: "\n", mixed: false });
    expect(detectLineEndings("a\r\nb\r\n")).toEqual({
      eol: "\r\n",
      mixed: false,
    });
    expect(detectLineEndings("one line")).toEqual({ eol: "\n", mixed: false });
    expect(detectLineEndings("")).toEqual({ eol: "\n", mixed: false });
  });

  it("flags mixed endings and lone carriage returns", () => {
    expect(detectLineEndings("a\r\nb\nc")).toEqual({
      eol: "\r\n",
      mixed: true,
    });
    expect(detectLineEndings("a\nb\r")).toEqual({ eol: "\n", mixed: true });
  });

  it("puts the page's own endings back when saving", () => {
    expect(forSaving("a\nb\n", { eol: "\r\n", mixed: false })).toBe(
      "a\r\nb\r\n",
    );
    expect(forSaving("a\nb\n", { eol: "\n", mixed: false })).toBe("a\nb\n");
  });

  it("round-trips an untouched page of uniform endings", () => {
    for (const text of ["a\r\nb  \r\n\r\n<b>x</b>\r\n", "a\nb  \n\n"]) {
      const endings = detectLineEndings(text);
      expect(forSaving(forDisplay(text), endings)).toBe(text);
    }
  });
});
