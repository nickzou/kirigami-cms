import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
  type ContentConfig,
  PROJECT_CONFIG_FILE,
  type ProjectConfig,
  parseProjectConfig,
} from "../core/index.js";
import { expandHome } from "./home.js";

export interface FoundProject {
  /** The path of the config file. */
  file: string;
  /** The folder it is in: the project root, which its relative paths are relative to. */
  dir: string;
  config: ProjectConfig;
}

const isMissing = (error: unknown): boolean =>
  error instanceof Error &&
  ["ENOENT", "ENOTDIR", "EISDIR"].includes(
    (error as NodeJS.ErrnoException).code ?? "",
  );

/**
 * Looks for `kirigami.config.yaml` in `startDir` and then in each folder
 * above it, the way other tools find their project. Throws `ConfigError` if
 * the file it finds is not valid.
 */
export async function findProjectConfig(
  startDir: string,
): Promise<FoundProject | undefined> {
  let dir = resolve(startDir);
  for (;;) {
    const file = join(dir, PROJECT_CONFIG_FILE);
    let text: string | undefined;
    try {
      text = await readFile(file, "utf8");
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    if (text !== undefined) {
      return { file, dir, config: parseProjectConfig(text, file) };
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export interface Project {
  content: ContentConfig;
  /** What relative paths in `content` are relative to. */
  baseDir: string;
  /** Where `build` writes. */
  outDir: string;
  /**
   * Where the content was chosen from, when it was not named on the command
   * line: shown so it is never a surprise which folder is being served.
   */
  source?: string;
}

/**
 * Works out where the content is and where the build goes. A site folder given
 * on the command line wins and behaves as it always has (the build goes to
 * `<site>/dist`). Otherwise the project config decides, and with none, the
 * content is `./content`.
 */
export async function resolveProject(
  cwd: string,
  siteArg: string | undefined,
  outArg: string | undefined,
): Promise<Project> {
  if (siteArg !== undefined) {
    return {
      content: { store: "local-folder", path: siteArg },
      baseDir: cwd,
      outDir: resolve(cwd, outArg ?? join(siteArg, "dist")),
    };
  }
  const found = await findProjectConfig(cwd);
  if (found) {
    const { content } = found.config;
    return {
      content:
        content.store === "local-folder"
          ? { ...content, path: expandHome(content.path) }
          : content,
      baseDir: found.dir,
      outDir:
        outArg !== undefined
          ? resolve(cwd, outArg)
          : resolve(found.dir, expandHome(found.config.build.out)),
      source: `from ${relative(cwd, found.file)}`,
    };
  }
  return {
    content: { store: "local-folder", path: "./content" },
    baseDir: cwd,
    outDir: resolve(cwd, outArg ?? join("content", "dist")),
    source: `the default, since there is no ${PROJECT_CONFIG_FILE} here or above`,
  };
}
