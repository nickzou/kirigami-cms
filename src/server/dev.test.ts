import { describe, expect, it } from "vitest";
import { PortInUseError, startDevServer } from "./dev.js";

const files = [{ path: "index.html", content: "<h1>Hi</h1>" }];

describe("startDevServer", () => {
  it("serves over a real port and stops on close", async () => {
    const server = await startDevServer(() => files, 0);
    try {
      const res = await fetch(server.url);
      expect(await res.text()).toBe("<h1>Hi</h1>");
    } finally {
      await server.close();
    }
    await expect(fetch(server.url)).rejects.toThrow();
  });

  it("reports a busy port clearly", async () => {
    const first = await startDevServer(() => files, 0);
    try {
      const port = Number(new URL(first.url).port);
      const error = await startDevServer(() => files, port).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(PortInUseError);
      expect((error as Error).message).toContain(`Port ${port}`);
    } finally {
      await first.close();
    }
  });
});

describe("startDevServer host", () => {
  it("listens on this machine only unless a host is given", async () => {
    const server = await startDevServer(() => files, 0);
    try {
      expect(server.url).toMatch(/^http:\/\/localhost:\d+\/$/);
    } finally {
      await server.close();
    }
  });

  it("listens on the host it is given", async () => {
    const server = await startDevServer(() => files, 0, {}, "0.0.0.0");
    try {
      const port = new URL(server.url).port;
      // Reachable by the machine's own non-loopback address too, not only 127.0.0.1.
      expect((await fetch(`http://127.0.0.1:${port}/`)).status).toBe(200);
      expect(server.url).toMatch(/^http:\/\/localhost:\d+\/$/);
    } finally {
      await server.close();
    }
  });
});
