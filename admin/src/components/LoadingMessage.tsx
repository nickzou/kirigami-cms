/** Tells screen readers and sighted users that something is loading. */
export function LoadingMessage({
  children = "Loading…",
}: {
  children?: string;
}) {
  return <p role="status">{children}</p>;
}
