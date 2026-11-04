// For tests that render the admin with Testing Library: `replaceText` inside
// `act`, so the screen has caught up with the change when it returns.
import { act } from "@testing-library/react";
import { replaceText } from "./test-editor.js";

export const typeText = (element: HTMLElement, text: string): void =>
  act(() => replaceText(element, text));
