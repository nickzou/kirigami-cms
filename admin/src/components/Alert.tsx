import type { ReactNode } from "react";

export interface AlertProps {
  /** `error` is announced at once to screen readers; `warning` is just shown. */
  tone: "error" | "warning";
  children: ReactNode;
}

/** A boxed message the user should not miss. */
export function Alert({ tone, children }: AlertProps) {
  return (
    <div
      className={`alert alert--${tone}`}
      role={tone === "error" ? "alert" : undefined}
    >
      {children}
    </div>
  );
}
