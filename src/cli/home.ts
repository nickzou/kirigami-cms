import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Makes a leading `~` mean the user's home folder, the way a shell would, for
 * a path read from the project config (a shell has already done it for one
 * typed on the command line). Only `~` alone and `~/...` count: `~name`, and a
 * `~` anywhere else, are left as they are.
 */
export function expandHome(path: string, home: string = homedir()): string {
  if (path === "~") return home;
  if (path.startsWith("~/") || path.startsWith("~\\")) {
    return join(home, path.slice(2));
  }
  return path;
}
