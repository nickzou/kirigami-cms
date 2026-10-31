import type { ReactNode } from "react";
import { BrandLink } from "../BrandLink/BrandLink.js";

/**
 * The banner at the top of every screen, 60px tall: on a phone the product name
 * (linking home; just the logo when narrower than 640px), then the screen's
 * `title`, and on the right whatever is passed as `children` (see
 * `HeaderActions`). A tablet and up has the product name and the menu in the
 * sidebar instead.
 */
export function AppHeader({
  title,
  children,
}: {
  /** Sits after the logo (see `HeaderTitle`). */
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className=":uno: flex h-[60px] items-center justify-start gap-4 bg-surface px-4 shadow">
      {/* From a tablet width the logo lives in the sidebar instead. */}
      <div className=":uno: md:hidden">
        <BrandLink markOnPhone />
      </div>
      {title}
      <div className=":uno: ml-auto flex items-center gap-3">{children}</div>
    </header>
  );
}
