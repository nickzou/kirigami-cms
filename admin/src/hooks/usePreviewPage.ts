import { useEffect, useState } from "react";
import { pageUrl } from "../../../src/core/render/paths.js";
import { listPages } from "../api.js";
import { pageToPreview } from "../preview-document.js";

/**
 * The HTML of a real page of the site, as the dev server serves it, to preview
 * a theme on: the home page if there is one, else the first. It is `undefined`
 * until it loads, and stays so if there is no page or it cannot be fetched (the
 * preview then uses a sample page).
 */
export function usePreviewPage(): string | undefined {
  const [html, setHtml] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const path = pageToPreview(await listPages(controller.signal));
      if (path === undefined) return;
      const response = await fetch(pageUrl(path), {
        signal: controller.signal,
      });
      if (!response.ok) return;
      setHtml(await response.text());
    })().catch(() => {
      // No page to borrow: the sample page is used.
    });
    return () => controller.abort();
  }, []);

  return html;
}
