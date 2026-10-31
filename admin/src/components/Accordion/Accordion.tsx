import { ChevronRight } from "lucide-react";
import { type ReactNode, useId } from "react";

export interface AccordionProps {
  title: string;
  /** Says what is inside, under the title. */
  description?: string;
  open: boolean;
  onToggle: () => void;
  /** Shown beside the title, for what needs attention even while it is closed. */
  note?: string;
  children: ReactNode;
}

/**
 * A heading that opens and closes the part of the screen under it. The
 * contents stay in the page while it is closed (just hidden), so what is typed
 * in them is kept and still checked.
 */
export function Accordion({
  title,
  description,
  open,
  onToggle,
  note,
  children,
}: AccordionProps) {
  const contentsId = useId();
  return (
    <section className=":uno: mb-4 border-0 border-b border-solid border-line pb-4">
      <h2 className=":uno: m-0 text-2xl">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentsId}
          onClick={onToggle}
          className=":uno: flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-0 py-2 text-left text-text [font:inherit] hover:text-accent motion-reduce:transition-none"
        >
          <ChevronRight
            size={20}
            aria-hidden="true"
            className={
              open
                ? ":uno: shrink-0 rotate-90 text-muted transition-transform duration-200 ease-[ease-in-out] motion-reduce:transition-none"
                : ":uno: shrink-0 text-muted transition-transform duration-200 ease-[ease-in-out] motion-reduce:transition-none"
            }
          />
          <span>{title}</span>
          {note && (
            <span className=":uno: ml-auto text-sm font-normal text-danger">
              {note}
            </span>
          )}
        </button>
      </h2>
      {description && (
        <p className=":uno: m-0 mb-2 text-muted">{description}</p>
      )}
      <div id={contentsId} hidden={!open} className=":uno: pt-4">
        {children}
      </div>
    </section>
  );
}
