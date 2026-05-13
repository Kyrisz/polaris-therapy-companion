import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useDictation } from "./useDictation";
import { hasSpeechSynthesis, runOcrOnFile, speakJournalText, stopSpeaking } from "./voiceOcr";

type Props = {
  title: string;
  body: string;
  setBody: Dispatch<SetStateAction<string>>;
};

export function JournalAccessTools({ title, body, setBody }: Props) {
  const appendToBody = useCallback(
    (chunk: string) => {
      setBody((prev) => {
        const sep = prev && !/\s$/.test(prev) ? " " : "";
        return prev + sep + chunk;
      });
    },
    [setBody]
  );

  const dict = useDictation(appendToBody);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  async function onPickImage(f: File | null) {
    if (!f) return;
    setOcrHint(null);
    setOcrBusy(true);
    try {
      const text = await runOcrOnFile(f);
      if (!text) {
        setOcrHint("No text was detected. Try brighter light, a closer photo, or clearer print.");
      } else {
        setBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
        setOcrHint("Text from your image was added to your entry.");
      }
    } catch {
      setOcrHint("Could not read that image. Try a smaller file or a different format.");
    } finally {
      setOcrBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function readDraft() {
    speakJournalText(title, body);
  }

  return (
    <div className="journal-a11y" aria-label="Accessible writing tools">
      <div className="journal-a11y-row">
        {dict.supported ? (
          <button
            type="button"
            className={`btn secondary btn-compact ${dict.listening ? "btn-dictating" : ""}`}
            onClick={() => (dict.listening ? dict.stop() : dict.start())}
            aria-pressed={dict.listening}
          >
            {dict.listening ? "Stop dictating" : "Dictate (voice)"}
          </button>
        ) : null}
        {hasSpeechSynthesis() ? (
          <>
            <button
              type="button"
              className="btn secondary btn-compact"
              onClick={readDraft}
              disabled={!body.trim() && !title.trim()}
            >
              Read draft aloud
            </button>
            <button type="button" className="btn secondary btn-compact" onClick={() => stopSpeaking()}>
              Stop reading
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="btn secondary btn-compact"
          disabled={ocrBusy}
          onClick={() => fileRef.current?.click()}
        >
          {ocrBusy ? "Scanning…" : "Scan writing (photo)"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
        />
      </div>
      <p className="journal-a11y-note muted">
        Dictation uses your microphone (supported browsers: often Chrome or Edge). Scanning runs on your device;
        clear print works better than handwriting. OCR is English-only for now.
      </p>
      {dict.message ? <p className="journal-a11y-msg">{dict.message}</p> : null}
      {ocrHint ? <p className="journal-a11y-msg">{ocrHint}</p> : null}
    </div>
  );
}
