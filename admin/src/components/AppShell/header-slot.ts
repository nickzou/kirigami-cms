import { createContext } from "react";

/**
 * Where a screen's header actions go: the spot on the right of the header, or
 * null when there is no header (a screen shown on its own).
 */
export const HeaderSlot = createContext<HTMLElement | null>(null);
