import { FileText, type LucideIcon, Settings } from "lucide-react";
import { Link, useLocation } from "react-router";

interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Whether the current address belongs to this item. */
  owns: (pathname: string) => boolean;
}

const items: readonly MenuItem[] = [
  {
    to: "/",
    label: "Pages",
    icon: FileText,
    owns: (pathname) => pathname === "/" || pathname.startsWith("/pages/"),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    owns: (pathname) => pathname === "/settings",
  },
];

/**
 * The main menu: where in the admin you can go. It sits down the left side on
 * a tablet and wider (see `AppShell`); the item for the screen you are on is
 * marked as the current page. It is made for the dark sidebar. `compact` shows only the icons (the names stay
 * for screen readers, and as a tooltip).
 */
export function MainMenu({ compact = false }: { compact?: boolean }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main">
      <ul className=":uno: m-0 flex list-none flex-col gap-1 p-0">
        {items.map(({ to, label, icon: Icon, owns }) => {
          const current = owns(pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={current ? "page" : undefined}
                title={compact ? label : undefined}
                className={
                  current
                    ? ":uno: flex min-h-10 items-center gap-3 rounded px-[11px] py-2 font-bold whitespace-nowrap text-on-accent no-underline bg-accent transition-colors duration-200 ease-[ease-in-out] motion-reduce:transition-none"
                    : ":uno: flex min-h-10 items-center gap-3 rounded px-[11px] py-2 font-bold whitespace-nowrap text-side-text no-underline transition-colors duration-200 ease-[ease-in-out] hover:bg-side-hover motion-reduce:transition-none"
                }
              >
                <Icon size={18} aria-hidden="true" className=":uno: shrink-0" />
                <span className={compact ? ":uno: sr-only" : ":uno: truncate"}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
