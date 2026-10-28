import { ConfigError, defaultSiteConfig, parseSiteConfig } from "../config/load.js";
import { generateStylesheet } from "../config/css.js";
import type { SiteConfig } from "../config/schema.js";
import { renderPage } from "../render/page.js";
import { outputPath } from "../render/paths.js";
import { NotFoundError } from "../store/errors.js";
import type { ContentStore } from "../store/types.js";

/** Where a site keeps its config, relative to the site root. */
export const SITE_CONFIG_PATH = "site.yaml";

/** Where the generated stylesheet is written, relative to the output folder. */
export const STYLESHEET_PATH = "style.css";

export interface OutputFile {
  /** Path relative to the output folder. */
  path: string;
  content: string;
}

export interface SiteProblem {
  /** The file the problem is in, relative to the site root. */
  file: string;
  /** The field within the file, when there is one. */
  path?: string;
  message: string;
}

export class BuildError extends Error {
  constructor(readonly problems: SiteProblem[]) {
    super(
      [
        "Cannot build the site:",
        ...problems.map((p) => `  ${p.file}${p.path ? ` (${p.path})` : ""}: ${p.message}`),
      ].join("\n"),
    );
    this.name = "BuildError";
  }
}

async function readConfig(store: ContentStore): Promise<SiteConfig> {
  try {
    const { content } = await store.read(SITE_CONFIG_PATH);
    return parseSiteConfig(content, SITE_CONFIG_PATH);
  } catch (error) {
    if (error instanceof NotFoundError) return defaultSiteConfig;
    throw error;
  }
}

async function pagePaths(store: ContentStore): Promise<string[]> {
  return (await store.list()).map((e) => e.path).filter((path) => path.endsWith(".md"));
}

/** Two pages that would be written to the same output file. */
function findCollisions(pages: string[]): SiteProblem[] {
  const bySource = new Map<string, string[]>();
  for (const page of pages) {
    const target = outputPath(page);
    bySource.set(target, [...(bySource.get(target) ?? []), page]);
  }
  return [...bySource]
    .filter(([, sources]) => sources.length > 1)
    .map(([target, sources]) => ({
      file: sources.join(" and "),
      message: `these pages would both be written to ${target}`,
    }));
}

/**
 * Renders a whole site to files, without writing any: one HTML file per
 * markdown page, plus the stylesheet. Throws `ConfigError` for a bad
 * `site.yaml` and `BuildError` for colliding pages.
 */
export async function buildSite(store: ContentStore): Promise<OutputFile[]> {
  const config = await readConfig(store);
  const pages = await pagePaths(store);

  const collisions = findCollisions(pages);
  if (collisions.length > 0) throw new BuildError(collisions);

  const html = await Promise.all(
    pages.map(async (path): Promise<OutputFile> => {
      const { content } = await store.read(path);
      return {
        path: outputPath(path),
        content: renderPage({ source: content, path, stylesheet: STYLESHEET_PATH }),
      };
    }),
  );

  return [...html, { path: STYLESHEET_PATH, content: generateStylesheet(config.theme) }].sort(
    (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  );
}

/**
 * Finds everything `buildSite` would fail on, all at once, without building
 * or writing anything.
 */
export async function checkSite(
  store: ContentStore,
): Promise<{ pages: number; problems: SiteProblem[] }> {
  const problems: SiteProblem[] = [];

  try {
    await readConfig(store);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    problems.push(...error.problems.map((p) => ({ file: error.file, path: p.path, message: p.message })));
  }

  const pages = await pagePaths(store);
  problems.push(...findCollisions(pages));
  return { pages: pages.length, problems };
}
