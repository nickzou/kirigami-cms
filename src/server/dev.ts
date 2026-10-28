import { serve } from "@hono/node-server";
import type { OutputFile } from "../core/index.js";
import type { SiteAppOptions } from "./app.js";
import { createSiteApp } from "./app.js";

export interface DevServer {
  url: string;
  close(): Promise<void>;
}

export class PortInUseError extends Error {
  constructor(readonly port: number) {
    super(
      `Port ${port} is already in use. Stop whatever is using it, or choose another with --port.`,
    );
    this.name = "PortInUseError";
  }
}

/** Serves the files on localhost. Port 0 picks any free port. */
export function startDevServer(
  getFiles: () => readonly OutputFile[],
  port: number,
  options: SiteAppOptions = {},
): Promise<DevServer> {
  return new Promise((resolve, reject) => {
    const server = serve(
      {
        fetch: createSiteApp(getFiles, options).fetch,
        port,
        hostname: "127.0.0.1",
      },
      (info) =>
        resolve({
          url: `http://localhost:${info.port}/`,
          close: () =>
            new Promise<void>((done, fail) => {
              server.close((error) => (error ? fail(error) : done()));
              if ("closeAllConnections" in server) server.closeAllConnections();
            }),
        }),
    );
    server.on("error", (error: NodeJS.ErrnoException) =>
      reject(error.code === "EADDRINUSE" ? new PortInUseError(port) : error),
    );
  });
}
