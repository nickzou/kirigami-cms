import * as real from "node:crypto";
import { describe, expect, it } from "vitest";
import * as shim from "./storybook-crypto.js";

// The shim must give what `node:crypto` gives: the stories sign in with it and
// the same code signs in for real on the server.
const inputs = [
  "",
  "a",
  "abc",
  "kirigami session key",
  "é ✓ \u{1F600}",
  "x".repeat(55),
  "x".repeat(56),
  "x".repeat(64),
  "x".repeat(65),
  "y".repeat(1000),
];

describe("storybook-crypto", () => {
  it("hashes as sha256 does", () => {
    for (const input of inputs) {
      expect(shim.createHash("sha256").update(input).digest("hex")).toBe(
        real.createHash("sha256").update(input).digest("hex"),
      );
    }
  });

  it("hashes text given in pieces", () => {
    expect(
      shim.createHash("sha256").update("ab").update("c").digest("hex"),
    ).toBe(real.createHash("sha256").update("abc").digest("hex"));
  });

  it("signs as hmac-sha256 does, with short, long and empty keys", () => {
    for (const key of ["", "secret", "k".repeat(64), "k".repeat(200)]) {
      for (const input of inputs) {
        expect(shim.createHmac("sha256", key).update(input).digest("hex")).toBe(
          real.createHmac("sha256", key).update(input).digest("hex"),
        );
      }
    }
  });

  it("signs with a key that is bytes, as the sign-in code does", () => {
    const key = real.createHmac("sha256", "pw").update("k").digest();
    expect(
      shim.createHmac("sha256", new Uint8Array(key)).update("x").digest("hex"),
    ).toBe(real.createHmac("sha256", key).update("x").digest("hex"));
  });

  it("compares bytes", () => {
    const a = shim.createHash("sha256").update("a").digest();
    const b = shim.createHash("sha256").update("b").digest();
    expect(shim.timingSafeEqual(a, a)).toBe(true);
    expect(shim.timingSafeEqual(a, b)).toBe(false);
    expect(() => shim.timingSafeEqual(a, new Uint8Array(3))).toThrow();
  });
});
