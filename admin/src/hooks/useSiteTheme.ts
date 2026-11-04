import { useEffect, useState } from "react";
import type { Theme } from "../../../src/core/config/schema.js";
import { getSiteConfig } from "../api.js";
import { defaultTheme } from "../editor-theme.js";
import {
  buildTheme,
  explicitValues,
  siteSections,
} from "../settings-schema.js";

/**
 * The site's theme, from `site.yaml` as the server reads it, for a screen that
 * should look like the site. It is `undefined` until the first answer. A file
 * that is missing or not valid gives the default theme (as the build would
 * use), and a failed refresh keeps the theme it had. `refresh` goes up when
 * the site was rebuilt, so edits to `site.yaml` (in Settings or outside the
 * admin) show without reloading.
 */
export function useSiteTheme(refresh = 0): Theme | undefined {
  const [theme, setTheme] = useState<Theme>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `refresh` is what asks for another look.
  useEffect(() => {
    const controller = new AbortController();
    getSiteConfig(controller.signal).then(
      (config) => {
        const values: unknown = config.error === null ? config.values : null;
        setTheme(
          typeof values === "object" && values !== null
            ? buildTheme(siteSections, explicitValues(siteSections, values))
            : defaultTheme(),
        );
      },
      () => {
        if (!controller.signal.aborted)
          setTheme((known) => known ?? defaultTheme());
      },
    );
    return () => controller.abort();
  }, [refresh]);

  return theme;
}
