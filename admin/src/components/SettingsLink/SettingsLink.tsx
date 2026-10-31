import { Settings } from "lucide-react";
import { Link } from "react-router";

/**
 * A link to the settings, for a phone (a tablet and up has Settings in the
 * sidebar, so it is hidden there). It is an icon, with the word beside it when
 * there is room.
 */
export function SettingsLink() {
  return (
    <Link
      to="/settings"
      aria-label="Settings"
      className=":uno: inline-flex items-center gap-1 rounded text-text no-underline hover:text-accent md:hidden"
    >
      <Settings size={18} aria-hidden="true" />
      <span className=":uno: hidden sm:inline">Settings</span>
    </Link>
  );
}
