import type { ReactNode } from "react";
import { BrandLink } from "../BrandLink/BrandLink.js";

/**
 * The banner at the top of every screen, 60px tall: on a phone the product name
 * (linking home; just the logo when narrower than 640px), then the screen's
 * `title`, and on the right whatever is passed as `children` (see
 * `HeaderActions`). A tablet and up has the product name and the menu in the
 * sidebar instead, and the header stays at the top while the page scrolls
 * under it.
 */
export function AppHeader({
  title,
  children,
  fade = false,
}: {
  /** Sits after the logo (see `HeaderTitle`). */
  title?: ReactNode;
  children?: ReactNode;
  /**
   * Fade the page into the header's edge as it scrolls under it, so content is
   * not cut off hard. For a screen on the page's own background; one with a
   * background of its own (the page editor) leaves it off.
   */
  fade?: boolean;
}) {
  return (
    <header className=":uno: relative flex h-[60px] items-center justify-start gap-4 bg-surface px-4 shadow md:sticky md:top-0 md:z-20">
      {/* From a tablet width the logo lives in the sidebar instead. */}
      <div className=":uno: md:hidden">
        <BrandLink markOnPhone />
      </div>
      {title}
      <div className=":uno: ml-auto flex items-center gap-3">{children}</div>
      {fade && (
        <div
          aria-hidden="true"
          className=":uno: pointer-events-none absolute inset-x-0 top-full hidden h-8 bg-gradient-to-b from-bg to-transparent md:block"
        />
      )}
    </header>
  );
}
