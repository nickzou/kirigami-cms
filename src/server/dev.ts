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

export const LOOPBACK = "127.0.0.1";

/** Whether an address to listen on reaches only this machine. */
export const isLoopback = (host: string): boolean =>
  host === LOOPBACK || host === "localhost" || host === "::1";

/**
 * Serves the files, on this machine only unless a `host` is given (an address
 * to listen on, such as 0.0.0.0 for every one). Port 0 picks any free port.
 */
export function startDevServer(
  getFiles: () => readonly OutputFile[],
  port: number,
  options: SiteAppOptions = {},
  host: string = LOOPBACK,
): Promise<DevServer> {
  return new Promise((resolve, reject) => {
    const server = serve(
      {
        fetch: createSiteApp(getFiles, options).fetch,
        port,
        hostname: host,
      },
      (info) =>
        resolve({
          // Listening on every address, you still open it as localhost from here.
          url: `http://${host === LOOPBACK || host === "0.0.0.0" || host === "::" ? "localhost" : host}:${info.port}/`,
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
