import { type ReactNode, useState } from "react";
import { AppHeader } from "../AppHeader/AppHeader.js";
import { HeaderSlot } from "./header-slot.js";

/** The frame around every screen: the banner and the main landmark. */
export function AppShell({ children }: { children: ReactNode }) {
  // A state (not a ref object) so screens render again once the spot exists.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <HeaderSlot.Provider value={slot}>
      <AppHeader>
        <div ref={setSlot} className=":uno: flex items-center gap-3" />
      </AppHeader>
      <main className=":uno: mx-auto max-w-5xl p-4">{children}</main>
    </HeaderSlot.Provider>
  );
}
