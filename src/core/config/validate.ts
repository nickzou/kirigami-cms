/*
 * Checks on the values in a config, kept free of any schema library so the
 * admin's settings form can use them in the browser as well as the schema.
 */

/** Values end up in a generated stylesheet, so none may break out of its declaration. */
export const hasNoBreakout = (value: string): boolean =>
  !/[;{}<>\\]/.test(value) && !value.includes("/*");

export const FONT_STACK_MESSAGE =
  "Must be a font-family list without ; { } < > \\ or comments";

/** Why `value` cannot be a font-family list, or `undefined` if it can. */
export function fontStackProblem(value: string): string | undefined {
  if (value.length === 0) return "Enter a font-family list.";
  return hasNoBreakout(value) ? undefined : FONT_STACK_MESSAGE;
}
