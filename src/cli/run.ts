import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  BuildError,
  buildSite,
  ConfigError,
  type ContentStore,
  checkSite,
  isSourcePath,
} from "../core/index.js";
import { createAdminApp } from "../server/admin.js";
import { createApiApp } from "../server/api.js";
import { PortInUseError, startDevServer } from "../server/dev.js";
import { createEventHub } from "../server/events.js";
import { createLiveSite } from "../server/live-site.js";
import { findShadowedPages } from "../server/reserved.js";
import { watchFolder } from "../server/watch.js";
import { type OpenedContent, openContent } from "../stores/open.js";
import { resolveProject } from "./project.js";

/** Where `pnpm build` puts the admin app, next to the compiled CLI. */
const ADMIN_DIR = fileURLToPath(new URL("../admin", import.meta.url));

export interface Io {
  cwd: string;
  out: (line: string) => void;
  err: (line: string) => void;
  /** Stops a running `dev` server. Without it, `dev` runs until the process ends. */
  signal?: AbortSignal;
}

const USAGE = `Usage:
  kirigami build [site] [--out <dir>]   Render the site to static HTML
  kirigami check [site]                 Validate the site without building it
  kirigami dev [site] [--port <n>]      Preview the site locally (default port: 3000)
  kirigami --help

[site] is the folder of markdown files. Without it, the content is where
kirigami.config.yaml says (found in this folder or one above it), or ./content
when there is no such file. With it, the build goes to <site>/dist unless --out
says otherwise.

Exit codes: 0 success, 1 the site has problems, 2 bad usage.`;

/** Runs the CLI and returns the process exit code. */
export async function run(argv: string[], io: Io): Promise<number> {
  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(argv);
  } catch (error) {
    io.err(
      `${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`,
    );
    return 2;
  }
  const { positionals, values } = parsed;

  if (values.help || positionals.length === 0) {
    (values.help ? io.out : io.err)(USAGE);
    return values.help ? 0 : 2;
  }

  const [command, siteArg, ...extra] = positionals;
  if (
    (command !== "build" && command !== "check" && command !== "dev") ||
    extra.length > 0
  ) {
    io.err(
      `Expected "build [site]", "check [site]" or "dev [site]".\n\n${USAGE}`,
    );
    return 2;
  }
  if (command !== "build" && values.out !== undefined) {
    io.err(`--out only applies to "build".\n\n${USAGE}`);
    return 2;
  }
  if (command !== "dev" && values.port !== undefined) {
    io.err(`--port only applies to "dev".\n\n${USAGE}`);
    return 2;
  }
  const port = values.port === undefined ? 3000 : Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    io.err(`--port must be a number from 0 to 65535.\n\n${USAGE}`);
    return 2;
  }

  try {
    const project = await resolveProject(io.cwd, siteArg, values.out);
    const content = openContent(
      project.content,
      project.baseDir,
      project.outDir,
    );
    const unsafe = checkOutDir(content.dir, project.outDir);
    if (command === "build" && unsafe) {
      io.err(unsafe);
      return 2;
    }
    if (project.source) {
      io.out(
        `Content: ${relative(io.cwd, content.dir) || "."} (${project.source})`,
      );
    }
    if (command === "check") return await check(content.store, io);
    if (command === "dev")
      return await dev(content, project.source !== undefined, port, io);
    return await build(content.store, project.outDir, io);
  } catch (error) {
    if (
      error instanceof ConfigError ||
      error instanceof BuildError ||
      error instanceof PortInUseError
    ) {
      io.err(error.message);
      return 1;
    }
    throw error;
  }
}

function parse(argv: string[]) {
  return parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      port: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
}

/** The output folder must not be the site itself or hold it. */
function checkOutDir(site: string, outDir: string): string | undefined {
  const fromOutToSite = relative(outDir, site);
  if (
    fromOutToSite === "" ||
    (!fromOutToSite.startsWith("..") && !isAbsolute(fromOutToSite))
  ) {
    return `Refusing to write into ${outDir}: the output folder cannot be the site folder or contain it.`;
  }
  return undefined;
}

async function check(store: ContentStore, io: Io): Promise<number> {
  const { pages, problems } = await checkSite(store);
  if (problems.length === 0) {
    io.out(`OK: ${pages} page${pages === 1 ? "" : "s"}, config valid.`);
    return 0;
  }
  io.err(
    [
      `Found ${problems.length} problem${problems.length === 1 ? "" : "s"}:`,
      ...problems.map(
        (p) => `  ${p.file}${p.path ? ` (${p.path})` : ""}: ${p.message}`,
      ),
    ].join("\n"),
  );
  return 1;
}

async function build(
  store: ContentStore,
  outDir: string,
  io: Io,
): Promise<number> {
  const files = await buildSite(store);
  await Promise.all(
    files.map(async (file) => {
      const target = join(outDir, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }),
  );
  const pages = files.length - 1;
  io.out(`Built ${pages} page${pages === 1 ? "" : "s"} to ${outDir}`);
  return 0;
}

/**
 * Serves the site and rebuilds it when pages or `site.yaml` change. Returns
 * once listening; the server and watcher keep the process alive.
 */
async function dev(
  content: OpenedContent,
  chosen: boolean,
  port: number,
  io: Io,
): Promise<number> {
  const { store, dir: site, ignore } = content;
  // A folder named on the command line that is not there is a mistake worth
  // seeing. One chosen by the config (or the default) is made, since the admin
  // creates the first page in it.
  if (
    chosen &&
    !(await stat(site).then(
      (s) => s.isDirectory(),
      () => false,
    ))
  ) {
    await mkdir(site, { recursive: true });
    io.out(`Made ${relative(io.cwd, site) || "."}, which did not exist yet.`);
  }
  const hub = createEventHub();
  const warnShadowed = (files: Parameters<typeof findShadowedPages>[0]) => {
    for (const url of findShadowedPages(files)) {
      io.err(
        `Warning: ${url} is reserved by the dev server, so this page is hidden here. It works in the built site.`,
      );
    }
  };
  const live = await createLiveSite(store, {
    onBuilt: (files, recovered) => {
      hub.publish({ type: "reload" });
      warnShadowed(files);
      const pages = files.length - 1;
      io.out(
        `${recovered ? "Fixed. " : ""}Rebuilt ${pages} page${pages === 1 ? "" : "s"}`,
      );
    },
    onProblem: (message) => {
      hub.publish({ type: "error", message });
      io.err(`${message}\nStill serving the last good build.`);
    },
  });
  warnShadowed(live.files());
  const server = await startDevServer(live.files, port, {
    hub,
    api: createApiApp(store),
    admin: createAdminApp(ADMIN_DIR),
  });
  const watcher = watchFolder(site, {
    ignore,
    relevant: isSourcePath,
    onChange: () => void live.rebuild(),
    onError: (error) => io.err(`Cannot watch ${site}: ${error.message}`),
  });
  io.out(`Serving at ${server.url} (press Ctrl+C to stop)`);
  io.signal?.addEventListener(
    "abort",
    () => {
      watcher.close();
      void server.close();
    },
    { once: true },
  );
  return 0;
}
