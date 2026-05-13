import { useRef } from "react";
import { Link } from "react-router-dom";

export function QuickAddDialog() {
  const ref = useRef<HTMLDialogElement>(null);

  function close() {
    ref.current?.close();
  }

  return (
    <>
      <button
        type="button"
        className="quickadd-plus-btn"
        aria-label="Quick add"
        title="Quick add"
        onClick={() => ref.current?.showModal()}
      >
        <span className="quickadd-plus-glyph" aria-hidden="true">
          +
        </span>
      </button>
      <dialog ref={ref} className="quickadd-dialog" aria-labelledby="quickadd-title">
        <div className="quickadd-inner">
          <h3 id="quickadd-title">Quick add</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Shortcuts for the most common “capture it now” actions.
          </p>

          <div className="quickadd-grid" role="group" aria-label="Quick add actions">
            <Link className="btn" to="/journal" onClick={close}>
              Journal entry
            </Link>
            <Link className="btn secondary" to="/therapy?tab=prep&focus=prep" onClick={close}>
              Session prep
            </Link>
            <Link className="btn secondary" to="/therapy?tab=prep&focus=debrief" onClick={close}>
              Session debrief
            </Link>
            <Link className="btn secondary" to="/journal?skillLog=skills" onClick={close}>
              Log after a skill
            </Link>
          </div>

          <div className="quickadd-subgrid" role="group" aria-label="Log after specific tools">
            <Link className="btn secondary btn-compact" to="/journal?skillLog=distress" onClick={close}>
              After TIPP
            </Link>
            <Link className="btn secondary btn-compact" to="/journal?skillLog=urge" onClick={close}>
              After urge timer
            </Link>
            <Link className="btn secondary btn-compact" to="/journal?skillLog=body" onClick={close}>
              After body cues
            </Link>
            <Link className="btn secondary btn-compact" to="/journal?skillLog=spiral" onClick={close}>
              After spiral
            </Link>
          </div>

          <div className="quickadd-actions">
            <button type="button" className="btn secondary" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

