import { CircleAlert, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export interface AlertProps {
  /** `error` is announced at once to screen readers; `warning` is just shown. */
  tone: "error" | "warning";
  children: ReactNode;
}

// A neutral panel: only the left stripe and the icon carry the tone's color.
// Each string is complete so UnoCSS can find and hash it.
const tones = {
  error: {
    panel:
      ":uno: my-2 flex items-start gap-3 rounded border border-solid border-line border-l-4 border-l-danger bg-surface px-4 py-3 shadow",
    icon: CircleAlert,
    iconClass: ":uno: mt-0.5 shrink-0 text-danger",
  },
  warning: {
    panel:
      ":uno: my-2 flex items-start gap-3 rounded border border-solid border-line border-l-4 border-l-warning bg-surface px-4 py-3 shadow",
    icon: TriangleAlert,
    iconClass: ":uno: mt-0.5 shrink-0 text-warning",
  },
} as const;

/** A boxed message the user should not miss. */
export function Alert({ tone, children }: AlertProps) {
  const { panel, icon: Icon, iconClass } = tones[tone];
  return (
    <div className={panel} role={tone === "error" ? "alert" : undefined}>
      <Icon size={20} aria-hidden="true" className={iconClass} />
      <div className=":uno: min-w-0 flex-1 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
