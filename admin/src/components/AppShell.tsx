import type { ReactNode } from "react";
import { Link } from "react-router";

/** The frame around every screen: the banner and the main landmark. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className=":uno: border-b border-solid border-line bg-surface px-4 py-3 shadow">
        <Link
          to="/"
          className=":uno: inline-flex items-center gap-2 text-lg font-bold tracking-tight text-text no-underline"
        >
          <span
            aria-hidden="true"
            className=":uno: inline-block h-5 w-5 rotate-45 rounded-sm bg-accent"
          />
          Kirigami
        </Link>
      </header>
      <main className=":uno: mx-auto max-w-3xl p-4 sm:p-6">{children}</main>
    </>
  );
}
