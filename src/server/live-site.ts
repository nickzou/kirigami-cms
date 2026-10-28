import {
  BuildError,
  buildSite,
  ConfigError,
  type ContentStore,
  type OutputFile,
} from "../core/index.js";

export interface LiveSiteHooks {
  /** A rebuild succeeded. `recovered` is true when the one before it failed. */
  onBuilt(files: readonly OutputFile[], recovered: boolean): void;
  /** A rebuild failed; the last good build is still served. */
  onProblem(message: string): void;
}

export interface LiveSite {
  /** The latest good build. */
  files(): readonly OutputFile[];
  /** Rebuilds. Calls that overlap a running rebuild are folded into one more run. */
  rebuild(): Promise<void>;
}

/**
 * Builds the site once (throwing if that fails) and keeps the latest good
 * build. A failed rebuild is reported through the hooks, never thrown, so a
 * typo in `site.yaml` does not take the server down.
 */
export async function createLiveSite(
  store: ContentStore,
  hooks: LiveSiteHooks,
): Promise<LiveSite> {
  let current = await buildSite(store);
  let broken = false;
  let running: Promise<void> | undefined;
  let again = false;

  async function runOnce(): Promise<void> {
    try {
      current = await buildSite(store);
      hooks.onBuilt(current, broken);
      broken = false;
    } catch (error) {
      broken = true;
      hooks.onProblem(
        error instanceof ConfigError || error instanceof BuildError
          ? error.message
          : `Cannot rebuild the site: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    files: () => current,
    rebuild() {
      if (running) {
        again = true;
        return running;
      }
      running = (async () => {
        do {
          again = false;
          await runOnce();
        } while (again);
        running = undefined;
      })();
      return running;
    },
  };
}
