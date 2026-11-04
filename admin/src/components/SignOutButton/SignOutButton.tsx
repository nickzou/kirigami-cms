import { LogOut } from "lucide-react";
import { useSession } from "../AuthGate/session-context.js";

/**
 * Ends the session. It shows only when a password is set. In the dark sidebar
 * it is a menu-style button (`compact` shows only the icon); on a phone, where
 * there is no sidebar, `header` is a small one for the header.
 */
export function SignOutButton({
  placement,
  compact = false,
}: {
  placement: "sidebar" | "header";
  compact?: boolean;
}) {
  const { required, signOut } = useSession();
  if (!required) return null;
  const onClick = () => void signOut().catch(() => {});
  if (placement === "header") {
    return (
      <button
        type="button"
        onClick={onClick}
        className=":uno: inline-flex cursor-pointer items-center gap-1 rounded border-0 bg-transparent p-0 text-text [font:inherit] hover:text-accent md:hidden"
      >
        <LogOut size={18} aria-hidden="true" />
        <span className=":uno: max-sm:sr-only">Sign out</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={compact ? "Sign out" : undefined}
      className=":uno: flex min-h-10 cursor-pointer items-center gap-3 rounded border-0 bg-transparent px-[11px] py-2 text-left font-bold text-side-text [font:inherit] whitespace-nowrap transition-colors duration-200 ease-[ease-in-out] hover:bg-side-hover motion-reduce:transition-none"
    >
      <LogOut size={18} aria-hidden="true" className=":uno: shrink-0" />
      <span className={compact ? ":uno: sr-only" : ":uno: truncate"}>
        Sign out
      </span>
    </button>
  );
}
