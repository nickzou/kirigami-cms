import { watch } from "node:fs";
import { sep } from "node:path";

export interface FolderWatcher {
  close(): void;
}

export interface WatchOptions {
  /** Folder names to skip wherever they appear. */
  ignore: readonly string[];
  /** Whether a change to this path (relative, `/`-separated) matters. */
  relevant(path: string): boolean;
  /** Called once after a burst of relevant changes settles. */
  onChange(): void;
  onError(error: Error): void;
  debounceMs?: number;
}

/** Watches a folder tree and reports bursts of relevant changes as one. */
export function watchFolder(
  root: string,
  { ignore, relevant, onChange, onError, debounceMs = 100 }: WatchOptions,
): FolderWatcher {
  let timer: NodeJS.Timeout | undefined;

  const watcher = watch(root, { recursive: true }, (_event, filename) => {
    if (filename !== null) {
      const path = filename.split(sep).join("/");
      if (path.split("/").some((part) => ignore.includes(part))) return;
      if (!relevant(path)) return;
    }
    clearTimeout(timer);
    timer = setTimeout(onChange, debounceMs);
  });
  watcher.on("error", onError);

  return {
    close() {
      clearTimeout(timer);
      watcher.close();
    },
  };
}
