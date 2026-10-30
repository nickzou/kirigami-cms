import { type ReactNode, useState } from "react";
import { AppHeader } from "../AppHeader/AppHeader.js";
import { MainMenu } from "../MainMenu/MainMenu.js";
import { HeaderSlot } from "./header-slot.js";

/**
 * The frame around every screen: the banner, the main menu and the main
 * landmark. From a tablet width the menu runs down the left; on a phone the
 * header carries the way to the settings instead.
 */
export function AppShell({ children }: { children: ReactNode }) {
  // A state (not a ref object) so screens render again once the spot exists.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <HeaderSlot.Provider value={slot}>
      <AppHeader>
        <div ref={setSlot} className=":uno: flex items-center gap-3" />
      </AppHeader>
      <div className=":uno: md:flex md:items-start">
        <aside className=":uno: sticky top-0 hidden w-56 shrink-0 p-4 md:block">
          <MainMenu />
        </aside>
        <main className=":uno: mx-auto min-w-0 max-w-5xl flex-1 p-4">
          {children}
        </main>
      </div>
    </HeaderSlot.Provider>
  );
}
