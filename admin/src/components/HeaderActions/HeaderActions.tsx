import { type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import { HeaderSlot } from "../AppShell/header-slot.js";

/**
 * Shows its children on the right of the app header. Where there is no header
 * (a screen shown on its own, as in Storybook), they show in place instead, so
 * the screen still works.
 */
export function HeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlot);
  return slot ? createPortal(children, slot) : children;
}
