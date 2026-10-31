import { EllipsisVertical } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";

export interface RowMenuItem {
  label: string;
  /** Goes to this address (as a link), or ... */
  to?: string;
  /** State handed to the screen `to` opens. */
  state?: unknown;
  /** ... does this. */
  onSelect?: () => void;
  /** For an action that cannot be undone. */
  danger?: boolean;
}

export interface RowMenuProps {
  /** Names the menu button for screen readers, e.g. "Actions for Hello". */
  label: string;
  items: readonly RowMenuItem[];
}

const itemClass =
  ":uno: block w-full cursor-pointer rounded border-0 bg-transparent px-3 py-2 text-left text-sm text-text no-underline transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none motion-reduce:transition-none";
const dangerClass =
  ":uno: block w-full cursor-pointer rounded border-0 bg-transparent px-3 py-2 text-left text-sm text-danger no-underline transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none motion-reduce:transition-none";

/**
 * A kebab button that opens a small menu of actions for a row. The menu is
 * drawn on the page itself (not inside the row), so the list's rounded box
 * cannot clip it. Arrow keys move between the items, Escape closes it and
 * puts the focus back on the button.
 */
export function RowMenu({ label, items }: RowMenuProps): ReactNode {
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; right: number }>();
  const open = place !== undefined;

  const close = (returnFocus = true) => {
    setPlace(undefined);
    if (returnFocus) button.current?.focus();
  };

  const show = () => {
    const box = button.current?.getBoundingClientRect();
    if (!box) return;
    setPlace({
      top: box.bottom + 4,
      right: window.innerWidth - box.right,
    });
  };

  // Open: focus the first item. Closed by clicking elsewhere, scrolling or resizing.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menu.current?.contains(target) || button.current?.contains(target))
        return;
      setPlace(undefined);
    };
    const leave = () => setPlace(undefined);
    document.addEventListener("pointerdown", away);
    window.addEventListener("resize", leave);
    window.addEventListener("scroll", leave, true);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("resize", leave);
      window.removeEventListener("scroll", leave, true);
    };
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const entries = [
      ...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ];
    const at = entries.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      entries[(to + entries.length) % entries.length]?.focus();
    };
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(entries.length - 1);
    else if (event.key === "Tab") close(false);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : show())}
        className=":uno: inline-flex size-8 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-muted transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle hover:text-text focus-visible:[outline:2px_solid_var(--accent)] motion-reduce:transition-none"
      >
        <EllipsisVertical aria-hidden="true" size={18} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            style={{ top: place.top, right: place.right }}
            className=":uno: fixed z-50 min-w-36 rounded-lg border border-solid border-line bg-surface p-1 shadow-lg"
          >
            {items.map((item) =>
              item.to !== undefined ? (
                <Link
                  key={item.label}
                  to={item.to}
                  state={item.state}
                  role="menuitem"
                  className={item.danger ? dangerClass : itemClass}
                  onClick={() => close(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={item.danger ? dangerClass : itemClass}
                  onClick={() => {
                    close(false);
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
