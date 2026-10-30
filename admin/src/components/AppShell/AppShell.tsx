import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { useStoredFlag } from "../../hooks/useStoredFlag.js";
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
  const [thin, setThin] = useStoredFlag("kirigami.sidebar-thin", false);
  const sidebarId = useId();
  const Toggle = thin ? PanelLeftOpen : PanelLeftClose;
  return (
    <HeaderSlot.Provider value={slot}>
      <div className=":uno: md:flex md:items-start">
        <aside
          id={sidebarId}
          className={
            thin
              ? ":uno: sticky top-0 hidden h-screen w-20 shrink-0 flex-col gap-2 overflow-hidden bg-surface p-4 shadow transition-[width] duration-200 ease-[ease-in-out] motion-reduce:transition-none md:flex"
              : ":uno: sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-2 overflow-hidden bg-surface p-4 shadow transition-[width] duration-200 ease-[ease-in-out] motion-reduce:transition-none md:flex"
          }
        >
          {/* As tall as the header, so the logo lines up with it. */}
          <div className=":uno: -mt-4 flex h-[60px] shrink-0 items-center">
            <BrandLink compact={thin} />
          </div>
          <MainMenu compact={thin} />
          <button
            type="button"
            aria-label={thin ? "Expand the sidebar" : "Thin the sidebar"}
            aria-controls={sidebarId}
            aria-expanded={!thin}
            title={thin ? "Expand the sidebar" : "Thin the sidebar"}
            onClick={() => setThin(!thin)}
            className=":uno: mt-auto flex min-h-10 cursor-pointer items-center gap-3 rounded border-0 bg-transparent px-3 py-2 text-left text-muted [font:inherit] whitespace-nowrap transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle hover:text-text motion-reduce:transition-none"
          >
            <Toggle size={18} aria-hidden="true" className=":uno: shrink-0" />
          </button>
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
