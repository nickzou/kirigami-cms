import {
  DocsContainer,
  type DocsContainerProps,
} from "@storybook/addon-docs/blocks";
import { type PropsWithChildren, useEffect, useState } from "react";
import { create } from "storybook/theming";

// The admin's own colors (see admin/src/styles.css), so the Docs pages match
// the components shown on them.
const light = create({
  base: "light",
  appBg: "#f6f8fb",
  appContentBg: "#f6f8fb",
  appPreviewBg: "#f6f8fb",
  appBorderColor: "#d5dde8",
  textColor: "#0f172a",
  textMutedColor: "#536174",
  barBg: "#ffffff",
  barTextColor: "#536174",
});

const dark = create({
  base: "dark",
  appBg: "#0b1020",
  appContentBg: "#0b1020",
  appPreviewBg: "#0b1020",
  appBorderColor: "#2b3856",
  textColor: "#e6ebf5",
  textMutedColor: "#9aa7bd",
  barBg: "#121a2e",
  barTextColor: "#9aa7bd",
});

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Whether the admin is showing its dark colors: the toolbar's choice, else the system's. */
function isDark(): boolean {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === "dark" : systemDark().matches;
}

/** The Docs page, themed to follow the toolbar's Theme toggle. */
export function ThemedDocsContainer(
  props: PropsWithChildren<DocsContainerProps>,
) {
  const [dark_, setDark] = useState(isDark);

  useEffect(() => {
    const update = () => setDark(isDark());
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

  return <DocsContainer {...props} theme={dark_ ? dark : light} />;
}
