import { parseDocument } from "yaml";
import type { z } from "zod";
import { type SiteConfig, siteConfigSchema } from "./schema.js";

export interface ConfigProblem {
  /** Dotted path to the field, e.g. `theme.colors.link`. Empty for the whole file. */
  path: string;
  message: string;
}

export class ConfigError extends Error {
  constructor(
    readonly file: string,
    readonly problems: ConfigProblem[],
  ) {
    super(
      [
        `Invalid config in ${file}:`,
        ...problems.map(
          (p) => `  ${p.path === "" ? "(file)" : p.path}: ${p.message}`,
        ),
      ].join("\n"),
    );
    this.name = "ConfigError";
  }
}

/** The config used when `site.yaml` is empty or absent. */
export const defaultSiteConfig: SiteConfig = siteConfigSchema.parse({});

/**
 * Parses and validates the text of a site config file (YAML 1.2). Empty
 * input gives the defaults. Throws `ConfigError`, naming `file` and every
 * field that is wrong.
 */
export function parseSiteConfig(text: string, file: string): SiteConfig {
  const document = parseDocument(text, { uniqueKeys: true });

  const [syntaxError] = document.errors;
  if (syntaxError) {
    const line = syntaxError.linePos?.[0].line;
    const where = line === undefined ? "" : ` (line ${line})`;
    throw new ConfigError(file, [
      { path: "", message: `${syntaxError.message.split("\n")[0]}${where}` },
    ]);
  }

  const data: unknown = document.toJS() ?? {};
  const result = siteConfigSchema.safeParse(data);
  if (!result.success) throw new ConfigError(file, problemsFrom(result.error));
  return result.data;
}

function problemsFrom(error: z.ZodError): ConfigProblem[] {
  return error.issues.flatMap((issue): ConfigProblem[] => {
    const path = issue.path.map(String);
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        path: [...path, key].join("."),
        message: `Unknown key "${key}"`,
      }));
    }
    return [{ path: path.join("."), message: issue.message }];
  });
}
