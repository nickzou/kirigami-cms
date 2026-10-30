import { type ReactNode, useEffect, useId, useRef } from "react";

export interface DialogProps {
  title: string;
  /** Called when the person dismisses the dialog: Escape, or a click outside it. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * A modal dialog, on the browser's own `<dialog>`: it traps the focus, keeps
 * the page behind it from being used, and closes on Escape. Render it only
 * while it should be open.
 */
export function Dialog({ title, onClose, children }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element || element.open) return;
    // A browser that has no showModal (a test environment) just opens it.
    if (typeof element.showModal === "function") element.showModal();
    else element.setAttribute("open", "");
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes it; the click is a mouse shortcut for the area outside.
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // The padding is inside, so only a click on the backdrop reaches here.
        if (event.target === event.currentTarget) onClose();
      }}
      className=":uno: m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-solid border-line bg-surface p-0 text-text shadow-lg backdrop:bg-black/50"
    >
      <div className=":uno: p-6">
        <h2 id={titleId} className=":uno: mt-0 mb-4 text-xl">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
