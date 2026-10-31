import { Check } from "lucide-react";
import { useEffect, useState } from "react";

export interface ToastProps {
  /** What to say. Set it when something finishes (it shows, then fades by itself); `null` for nothing. */
  message: string | null;
  /** How long it stays, in milliseconds. */
  duration?: number;
}

/** How long the fade takes, so the text is not removed while it is still visible. */
const FADE_MS = 200;

/**
 * A small confirmation that appears at the top right, under the header, then
 * fades out by itself (for "Saved."). It is a live region that is always in
 * the page, so screen readers announce the text when it appears. It floats
 * over the page, so nothing moves when it comes and goes. Problems are not
 * toasts: they stay on the page as panels, because they need something done.
 */
export function Toast({ message, duration = 3000 }: ToastProps) {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message === null) {
      setVisible(false);
      const clear = setTimeout(() => setText(""), FADE_MS);
      return () => clearTimeout(clear);
    }
    setText(message);
    setVisible(true);
    let clear: ReturnType<typeof setTimeout> | undefined;
    const hide = setTimeout(() => {
      setVisible(false);
      clear = setTimeout(() => setText(""), FADE_MS);
    }, duration);
    return () => {
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [message, duration]);

  return (
    <div
      role="status"
      className={
        visible
          ? ":uno: pointer-events-none fixed top-[72px] right-4 z-20 translate-y-0 opacity-100 transition-[opacity,transform] duration-200 ease-[ease-in-out] motion-reduce:transition-none"
          : ":uno: pointer-events-none fixed top-[72px] right-4 z-20 -translate-y-2 opacity-0 transition-[opacity,transform] duration-200 ease-[ease-in-out] motion-reduce:transition-none"
      }
    >
      {text && (
        <p className=":uno: m-0 inline-flex items-center gap-2 rounded border border-solid border-line bg-surface px-4 py-2 text-sm font-bold text-text shadow-lg">
          <Check size={16} aria-hidden="true" className=":uno: text-accent" />
          {text}
        </p>
      )}
    </div>
  );
}
