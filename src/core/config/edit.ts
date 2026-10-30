import { type Document, isMap, isScalar, parseDocument } from "yaml";
import { ConfigError } from "./load.js";

/** One change to a config file: set a value, or (with `null`) remove it. */
export interface ConfigChange {
  /** Where, as keys from the top: `["theme", "colors", "link"]`. */
  path: string[];
  /** The new value, or `null` to remove the key so the default applies. */
  value: string | number | null;
}

/**
 * Applies changes to the text of a config file and returns the new text. It
 * edits the YAML document, not the data, so the author's comments, key order
 * and untouched values are kept. A new key goes at the end of its section. A
 * key that is removed takes its section with it if that is left empty, so a
 * file with every setting at its default has no empty `theme:` left behind.
 *
 * It does not check the result against the schema: do that before writing it
 * (`parseSiteConfig`). Throws `ConfigError` if `text` is not valid YAML.
 */
export function editConfigText(
  text: string,
  changes: readonly ConfigChange[],
  file: string,
): string {
  const document = parseDocument(text, { uniqueKeys: true });
  const [syntaxError] = document.errors;
  if (syntaxError) {
    const line = syntaxError.linePos?.[0].line;
    const where = line === undefined ? "" : ` (line ${line})`;
    throw new ConfigError(file, [
      { path: "", message: `${syntaxError.message.split("\n")[0]}${where}` },
    ]);
  }

  // Comments at the top of the file hang off the document or its first key.
  // If the file ends up with no settings, they are all that should be left.
  const firstKey = isMap(document.contents)
    ? document.contents.items[0]?.key
    : undefined;
  const header = [
    document.commentBefore,
    isScalar(firstKey) ? firstKey.commentBefore : null,
  ].filter((comment): comment is string => typeof comment === "string");

  for (const { path, value } of changes) {
    if (value === null) {
      document.deleteIn(path);
      pruneEmpty(document, path.slice(0, -1));
    } else {
      document.setIn(path, value);
    }
  }
  if (isMap(document.contents) && document.contents.items.length === 0) {
    return header.length === 0
      ? ""
      : `${header
          .flatMap((c) => c.split("\n"))
          .map((line) => `#${line}`)
          .join("\n")}\n`;
  }
  return document.toString();
}

/** Removes the section at `path` if it is empty, and then any parent left empty. */
function pruneEmpty(document: Document, path: string[]): void {
  for (let depth = path.length; depth > 0; depth -= 1) {
    const section = document.getIn(path.slice(0, depth), true);
    if (!isMap(section) || section.items.length > 0) return;
    document.deleteIn(path.slice(0, depth));
  }
}
