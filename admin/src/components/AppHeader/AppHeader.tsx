import { Link } from "react-router";

/** The banner at the top of every screen: the product name, linking home. */
export function AppHeader() {
  return (
    <header className=":uno: border-b border-solid border-line bg-surface px-4 py-3 shadow">
      <Link
        to="/"
        className=":uno: inline-flex items-center gap-2 text-lg font-bold tracking-tight text-text no-underline"
      >
        <span
          aria-hidden="true"
          className=":uno: inline-block h-5 w-5 rotate-45 rounded-sm bg-accent"
        />
        Kirigami
      </Link>
    </header>
  );
}
