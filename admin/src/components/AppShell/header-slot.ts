import { createContext } from "react";

/**
 * Where a screen's header actions go: the spot on the right of the header, or
 * null when there is no header (a screen shown on its own).
 */
export const HeaderSlot = createContext<HTMLElement | null>(null);

/**
 * Where a screen's title goes: the spot on the left of the header, after the
 * logo on a phone. Null when there is no header.
 */
export const HeaderTitleSlot = createContext<HTMLElement | null>(null);
