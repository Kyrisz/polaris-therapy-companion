import { useCallback } from "react";
import { useDictation } from "../journal/useDictation";

type Props = {
  /**
   * Called with each finalized speech phrase (already trimmed).
   * Typical: `setField((p) => appendSpokenChunk(p, chunk))`.
   */
  mergeChunk: (chunk: string) => void;
};

function MicGlyph() {
  return (
    <svg className="dictate-mic-svg" viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 10v2a7 7 0 0 1-14 0v-2"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M12 19v4M8 23h8" />
    </svg>
  );
}

function StopGlyph() {
  return (
    <svg className="dictate-mic-svg" viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Optional voice capture for a text field: speech is converted to text on this device (Web Speech API),
 * not saved as an audio file. Same engine as Journal “Dictate”.
 */
export function DictateParagraphControls({ mergeChunk }: Props) {
  const dict = useDictation(
    useCallback(
      (chunk: string) => {
        mergeChunk(chunk);
      },
      [mergeChunk]
    )
  );

  if (!dict.supported) return null;

  const title =
    "Add text by speaking — stays on this device. Chrome or Edge usually work best. Click again to stop.";

  return (
    <div className="dictate-field-tools">
      <button
        type="button"
        className={`dictate-mic-btn ${dict.listening ? "dictate-mic-btn--on" : ""}`}
        onClick={() => (dict.listening ? dict.stop() : dict.start())}
        aria-pressed={dict.listening}
        aria-label={dict.listening ? "Stop dictating" : "Speak to add text to this field"}
        title={title}
      >
        {dict.listening ? <StopGlyph /> : <MicGlyph />}
      </button>
      {dict.message ? (
        <p className="dictate-field-msg" role="status">
          {dict.message}
        </p>
      ) : null}
    </div>
  );
}
