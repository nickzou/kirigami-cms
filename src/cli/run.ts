import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import {
  BuildError,
  buildSite,
  ConfigError,
  checkSite,
} from "../core/index.js";
import { LocalFolderStore } from "../stores/local-folder.js";

export interface Io {
  cwd: string;
  out: (line: string) => void;
  err: (line: string) => void;
}

const USAGE = `Usage:
  kirigami build <site> [--out <dir>]   Render the site to static HTML (default: <site>/dist)
  kirigami check <site>                 Validate the site without building it
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
    (command !== "build" && command !== "check") ||
    !siteArg ||
    extra.length > 0
  ) {
    io.err(`Expected "build <site>" or "check <site>".\n\n${USAGE}`);
    return 2;
  }
  if (command === "check" && values.out !== undefined) {
    io.err(`--out only applies to "build".\n\n${USAGE}`);
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
    return await build(store, outDir, io);
  } catch (error) {
    if (error instanceof ConfigError || error instanceof BuildError) {
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
