import { useRef } from "react";
import { Link } from "react-router-dom";

export function CrisisSupportDialog() {
  const ref = useRef<HTMLDialogElement>(null);

  function close() {
    ref.current?.close();
  }

  return (
    <>
      <button type="button" className="btn crisis-open-btn" onClick={() => ref.current?.showModal()}>
        Need support now
      </button>
      <dialog ref={ref} className="crisis-dialog" aria-labelledby="crisis-dialog-title">
        <div className="crisis-dialog-inner">
          <h3 id="crisis-dialog-title">Choose a resource</h3>
          <p className="muted crisis-dialog-lead">
            Opens on this device only. If you are in immediate danger, contact local emergency services or a crisis
            line you trust.
          </p>
          <div className="crisis-dialog-actions">
            <Link className="btn" to="/distress" onClick={close}>
              TIPP toolkit
            </Link>
            <Link className="btn secondary" to="/safety" onClick={close}>
              Safety card
            </Link>
            <button type="button" className="btn secondary" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
