import { z } from "zod";

/** The project config file's name, in the project root. */
export const PROJECT_CONFIG_FILE = "kirigami.config.yaml";

/** The content is a folder of markdown files on this machine. */
const localFolder = z.strictObject({
  store: z.literal("local-folder"),
  /** The folder, relative to the config file. */
  path: z.string().min(1).default("./content"),
});

/**
 * Where the content comes from, as a union on `store`. Another source (Google
 * Drive, say) is another member with its own options, and nothing else in the
 * file changes. A store's credentials are never written here.
 */
const content = z.discriminatedUnion("store", [localFolder], {
  error:
    "Unknown or missing store. The only store so far is local-folder (a folder of markdown files).",
});

/**
 * The contents of `kirigami.config.yaml`, which says where the project's
 * content comes from. It lives outside the content (it says where the content
 * is), so it is separate from `site.yaml`, the styling that lives inside it.
 * Every field is optional.
 */
export const projectConfigSchema = z
  .strictObject({
    content: content.default({ store: "local-folder", path: "./content" }),
    build: z
      .strictObject({
        /** Where `kirigami build` writes the site, relative to the config file. */
        out: z.string().min(1).default("./dist"),
      })
      .prefault({}),
  })
  .prefault({});

export type ProjectConfig = z.output<typeof projectConfigSchema>;
export type ContentConfig = ProjectConfig["content"];
