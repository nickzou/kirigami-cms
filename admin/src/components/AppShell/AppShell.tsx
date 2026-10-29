import type { ReactNode } from "react";
import { AppHeader } from "../AppHeader/AppHeader.js";

/** The frame around every screen: the banner and the main landmark. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className=":uno: mx-auto max-w-3xl p-4 sm:p-6">{children}</main>
    </>
  );
}
