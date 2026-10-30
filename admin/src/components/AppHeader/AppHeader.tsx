import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { BrandLink } from "../BrandLink/BrandLink.js";

/**
 * The banner at the top of every screen: the product name, linking home (on a phone; a tablet and up has it in the
 * sidebar). What
 * is passed as `children` sits on the right, after the link to the settings
 * (see `HeaderActions`).
 */
export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className=":uno:  flex justify-start items-center  bg-surface px-4 py-3 shadow">
      {/* From a tablet width the logo lives in the sidebar instead. */}
      <div className=":uno: md:hidden">
        <BrandLink />
      </div>
      <div className=":uno: ml-auto flex items-center gap-3">
        <Link
          to="/settings"
          aria-label="Settings"
          className=":uno: inline-flex items-center gap-1 rounded text-text no-underline hover:text-accent md:hidden"
        >
          <Settings size={18} aria-hidden="true" />
          <span className=":uno: hidden sm:inline">Settings</span>
        </Link>
        {children}
      </div>
    </header>
  );
}
