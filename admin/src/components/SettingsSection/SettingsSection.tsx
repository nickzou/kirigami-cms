import { type ReactNode, useId } from "react";

export interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** A group of related settings, under a heading that says what they are for. */
export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className=":uno: mb-8">
      <h2 id={headingId} className=":uno: m-0 mb-1 text-xl">
        {title}
      </h2>
      <p className=":uno: m-0 mb-4 text-muted">{description}</p>
      <div className=":uno: grid gap-6">{children}</div>
    </section>
  );
}
