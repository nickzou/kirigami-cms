import { describe, expect, it } from "vitest";
import { findShadowedPages } from "./reserved.js";

const file = (path: string) => ({ path, content: "" });

describe("findShadowedPages", () => {
  it("finds pages under the reserved addresses, as URLs", () => {
    expect(
      findShadowedPages([
        file("index.html"),
        file("admin/index.html"),
        file("api/docs/index.html"),
        file("__kirigami/x/index.html"),
        file("blog/api/index.html"),
        file("style.css"),
      ]),
    ).toEqual(["/admin/", "/api/docs/", "/__kirigami/x/"]);
  });

  it("finds nothing in an ordinary site", () => {
    expect(
      findShadowedPages([file("index.html"), file("about/index.html")]),
    ).toEqual([]);
  });
});
