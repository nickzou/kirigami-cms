import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import {
  BuildError,
  buildSite,
  ConfigError,
  checkSite,
  isSourcePath,
} from "../core/index.js";
import { PortInUseError, startDevServer } from "../server/dev.js";
import { createLiveSite } from "../server/live-site.js";
import { watchFolder } from "../server/watch.js";
import { LocalFolderStore } from "../stores/local-folder.js";

export interface Io {
  cwd: string;
  out: (line: string) => void;
  err: (line: string) => void;
  /** Stops a running `dev` server. Without it, `dev` runs until the process ends. */
  signal?: AbortSignal;
}

const USAGE = `Usage:
  kirigami build <site> [--out <dir>]   Render the site to static HTML (default: <site>/dist)
  kirigami check <site>                 Validate the site without building it
  kirigami dev <site> [--port <n>]      Preview the site locally (default port: 3000)
  kirigami --help

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
    !siteArg ||
    extra.length > 0
  ) {
    io.err(
      `Expected "build <site>", "check <site>" or "dev <site>".\n\n${USAGE}`,
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

  const site = resolve(io.cwd, siteArg);
  const outDir = resolve(io.cwd, values.out ?? join(siteArg, "dist"));
  const unsafe = checkOutDir(site, outDir);
  if (command === "build" && unsafe) {
    io.err(unsafe);
    return 2;
  }

  // Skip the output folder when it sits directly inside the site.
  const outName = relative(site, outDir);
  const ignore = [
    ".git",
    "node_modules",
    ...(outName && !outName.includes(sep) ? [outName] : []),
  ];
  const store = new LocalFolderStore(site, ignore);

  try {
    if (command === "check") return await check(store, io);
    if (command === "dev") return await dev(store, site, ignore, port, io);
    return await build(store, outDir, io);
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

async function check(store: LocalFolderStore, io: Io): Promise<number> {
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
  store: LocalFolderStore,
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
  store: LocalFolderStore,
  site: string,
  ignore: string[],
  port: number,
  io: Io,
): Promise<number> {
  const live = await createLiveSite(store, {
    onBuilt: (files, recovered) => {
      const pages = files.length - 1;
      io.out(
        `${recovered ? "Fixed. " : ""}Rebuilt ${pages} page${pages === 1 ? "" : "s"}`,
      );
    },
    onProblem: (message) =>
      io.err(`${message}\nStill serving the last good build.`),
  });
  const server = await startDevServer(live.files, port);
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
