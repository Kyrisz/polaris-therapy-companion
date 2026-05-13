import { useCallback } from "react";
import { useDictation } from "../journal/useDictation";

type Props = {
  /**
   * Called with each finalized speech phrase (already trimmed).
   * Typical: `setField((p) => appendSpokenChunk(p, chunk))`.
   */
  mergeChunk: (chunk: string) => void;
};

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

  return (
    <div className="dictate-field-tools">
      <div className="dictate-field-tools-row">
        <button
          type="button"
          className={`btn secondary btn-compact ${dict.listening ? "btn-dictating" : ""}`}
          onClick={() => (dict.listening ? dict.stop() : dict.start())}
          aria-pressed={dict.listening}
        >
          {dict.listening ? "Stop dictating" : "Speak instead"}
        </button>
        <span className="muted dictate-field-tools-hint">
          Adds words here; stays on this device. Allow the microphone if the browser asks.
        </span>
      </div>
      {dict.message ? <p className="journal-a11y-msg">{dict.message}</p> : null}
    </div>
  );
}
