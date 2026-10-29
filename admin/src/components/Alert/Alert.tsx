import type { ReactNode } from "react";

export interface AlertProps {
  /** `error` is announced at once to screen readers; `warning` is just shown. */
  tone: "error" | "warning";
  children: ReactNode;
}

const tones = {
  error:
    ":uno: my-2 rounded border border-solid border-l-4 border-danger-edge bg-danger-soft px-4 py-3 shadow [&>:first-child]:mt-0 [&>:last-child]:mb-0",
  warning:
    ":uno: my-2 rounded border border-solid border-l-4 border-warning-edge bg-warning-soft px-4 py-3 shadow [&>:first-child]:mt-0 [&>:last-child]:mb-0",
} as const;

/** A boxed message the user should not miss. */
export function Alert({ tone, children }: AlertProps) {
  return (
    <div className={tones[tone]} role={tone === "error" ? "alert" : undefined}>
      {children}
    </div>
  );
}
