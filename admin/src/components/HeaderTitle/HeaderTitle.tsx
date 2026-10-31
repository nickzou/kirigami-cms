import { type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import { HeaderTitleSlot } from "../AppShell/header-slot.js";

/**
 * The screen's title (its level 1 heading), shown on the left of the app
 * header. Where there is no header (a screen shown on its own, as in
 * Storybook), it is an ordinary heading in place instead.
 */
export function HeaderTitle({
  before,
  children,
}: {
  /** Sits to the left of the title, like a way back. */
  before?: ReactNode;
  children: ReactNode;
}) {
  const slot = useContext(HeaderTitleSlot);
  return slot ? (
    createPortal(
      <>
        {before}
        <h1 className=":uno: m-0 min-w-0 truncate text-lg">{children}</h1>
      </>,
      slot,
    )
  ) : (
    <>
      {before}
      <h1>{children}</h1>
    </>
  );
}
