import {
  DocsContainer,
  type DocsContainerProps,
} from "@storybook/addon-docs/blocks";
import { type PropsWithChildren, useEffect, useState } from "react";
import { create, type ThemeVars } from "storybook/theming";

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Whether the admin is showing its dark colors: the toolbar's choice, else the system's. */
function isDark(): boolean {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === "dark" : systemDark().matches;
}

/**
 * Builds the Docs theme from the admin's own CSS variables (admin/src/styles.css),
 * as they are right now, so the Docs pages can never drift from the components
 * shown on them. Changing the palette there changes it here.
 */
function themeFromPage(): ThemeVars {
  const style = getComputedStyle(document.documentElement);
  const color = (name: string) => style.getPropertyValue(name).trim();
  return create({
    base: isDark() ? "dark" : "light",
    appBg: color("--bg"),
    appContentBg: color("--bg"),
    appPreviewBg: color("--bg"),
    appBorderColor: color("--border"),
    textColor: color("--text"),
    textMutedColor: color("--muted"),
    barBg: color("--surface"),
    barTextColor: color("--muted"),
  });
}

/** The Docs page, themed to follow the toolbar's Theme toggle. */
export function ThemedDocsContainer(
  props: PropsWithChildren<DocsContainerProps>,
) {
  const [theme, setTheme] = useState(themeFromPage);

  useEffect(() => {
    const update = () => setTheme(themeFromPage());
    update();
    // The toolbar sets data-theme on <html>; the system setting can change too.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const media = systemDark();
    media.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, []);

  return <DocsContainer {...props} theme={theme} />;
}
