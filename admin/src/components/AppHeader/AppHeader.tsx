import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "../Logo/Logo.js";

/**
 * The banner at the top of every screen: the product name, linking home. What
 * is passed as `children` sits on the right (see `HeaderActions`).
 */
export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className=":uno:  flex justify-start items-center  bg-surface px-4 py-3 shadow">
      <Link
        to="/"
        className=":uno: inline-flex items-center gap-2 text-lg font-bold tracking-widest text-text uppercase no-underline"
      >
        <Logo className=":uno: h-6 w-auto" />
        Kirigami
      </Link>
      {children && (
        <div className=":uno: ml-auto flex items-center gap-3">{children}</div>
      )}
    </header>
  );
}
