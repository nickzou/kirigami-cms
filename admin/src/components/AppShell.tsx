import type { ReactNode } from "react";
import { Link } from "react-router";

/** The frame around every screen: the banner and the main landmark. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          Kirigami
        </Link>
      </header>
      <main>{children}</main>
    </>
  );
}
