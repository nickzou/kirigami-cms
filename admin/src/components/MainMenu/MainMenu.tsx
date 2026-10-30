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
 * marked as the current page.
 */
export function MainMenu() {
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
                className={
                  current
                    ? ":uno: flex items-center gap-3 rounded px-3 py-2 font-bold text-on-accent no-underline bg-accent transition-colors duration-200 ease-[ease-in-out] motion-reduce:transition-none"
                    : ":uno: flex items-center gap-3 rounded px-3 py-2 font-bold text-text no-underline transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle motion-reduce:transition-none"
                }
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
