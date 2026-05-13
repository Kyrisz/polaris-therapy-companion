import { Link } from "react-router-dom";
import { PipStar } from "./PolarisMarks";

type Props = {
  text: string;
  action?: { label: string; to: string };
  onDismiss?: () => void;
  showIcon?: boolean;
};

export function PipMessage({ text, action, onDismiss, showIcon = true }: Props) {
  return (
    <div className="pip-message" role="note" aria-label="Pip hint">
      {showIcon ? (
        <div className="pip-message-left" aria-hidden="true">
          <PipStar size={28} />
        </div>
      ) : null}
      <div className="pip-message-body">
        <div className="pip-message-text">{text}</div>
        <div className="pip-message-actions">
          {action ? (
            <Link className="btn secondary btn-compact" to={action.to}>
              {action.label}
            </Link>
          ) : null}
          {onDismiss ? (
            <button type="button" className="btn secondary btn-compact" onClick={onDismiss}>
              Hide
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

