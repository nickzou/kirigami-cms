import { type ReactNode, useState } from "react";
import { AppHeader } from "../AppHeader/AppHeader.js";
import { BrandLink } from "../BrandLink/BrandLink.js";
import { MainMenu } from "../MainMenu/MainMenu.js";
import { HeaderSlot } from "./header-slot.js";

/**
 * The frame around every screen: the banner, the main menu and the main
 * landmark. From a tablet width a full-height sidebar runs down the left with
 * the logo and the menu, and the header sits beside it; on a phone the header
 * carries the logo and the way to the settings instead.
 */
export function AppShell({ children }: { children: ReactNode }) {
  // A state (not a ref object) so screens render again once the spot exists.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <HeaderSlot.Provider value={slot}>
      <div className=":uno: md:flex md:items-start">
        <aside className=":uno: sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 overflow-y-auto bg-surface p-4 shadow md:flex">
          <BrandLink />
          <MainMenu />
        </aside>
        <div className=":uno: min-w-0 flex-1">
          <AppHeader>
            <div ref={setSlot} className=":uno: flex items-center gap-3" />
          </AppHeader>
          <main className=":uno: mx-auto max-w-5xl p-4">{children}</main>
        </div>
      </div>
    </HeaderSlot.Provider>
  );
}
