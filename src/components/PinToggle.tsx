import { useEffect, useState } from "react";
import {
  dispatchPinsUpdated,
  isPinnableToolPath,
  isToolPinned,
  togglePinnedTool,
} from "../pinnedTools";

type Props = {
  /** Storage key, e.g. `/mood` or `__today__` */
  path: string;
  /** Corner overlay on tiles vs inline compact */
  variant?: "corner" | "inline";
  className?: string;
};

export function PinToggle({ path, variant = "corner", className = "" }: Props) {
  const [on, setOn] = useState(() => isToolPinned(path));

  useEffect(() => {
    const sync = () => setOn(isToolPinned(path));
    sync();
    window.addEventListener("dbt-pins-updated", sync);
    return () => window.removeEventListener("dbt-pins-updated", sync);
  }, [path]);

  if (!isPinnableToolPath(path)) return null;

  const cls = `pin-toggle pin-toggle--${variant}${on ? " pin-toggle--on" : ""}${className ? ` ${className}` : ""}`;

  return (
    <button
      type="button"
      className={cls}
      aria-pressed={on}
      title={on ? "Remove from pinned bar & Home" : "Pin for quick access (bar + Home)"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePinnedTool(path);
        setOn(isToolPinned(path));
        dispatchPinsUpdated();
      }}
    >
      <span className="pin-toggle-icon" aria-hidden>
        {on ? "★" : "☆"}
      </span>
      <span className="pin-toggle-sr">{on ? "Unpin" : "Pin"}</span>
    </button>
  );
}
