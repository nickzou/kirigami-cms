import { PanelRight } from "lucide-react";
import { Button } from "../Button/Button.js";

export interface PreviewToggleProps {
  shown: boolean;
  onChange: (shown: boolean) => void;
}

/** Shows or hides the preview. Pressed means the preview is showing. */
export function PreviewToggle({ shown, onChange }: PreviewToggleProps) {
  return (
    <Button aria-pressed={shown} onClick={() => onChange(!shown)}>
      <PanelRight size={16} aria-hidden="true" />
      Preview
    </Button>
  );
}
