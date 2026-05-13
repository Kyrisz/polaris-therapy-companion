import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeechRecognitionCtor, type SpeechRecError, type SpeechRecEvent, type SpeechRecognitionInstance } from "./voiceOcr";

/**
 * Continuous recognition: each finalized phrase is passed to the callback (e.g. journal body or a short field).
 */
export function useDictation(appendToBody: (chunk: string) => void) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    setMessage(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMessage("Dictation is not supported in this browser. Try Chrome or Edge on desktop or Android.");
      return;
    }
    try {
      stop();
    } catch {
      /* ignore */
    }

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";

    rec.onresult = (ev: SpeechRecEvent) => {
      let finalChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const row = ev.results[i];
        if (row.isFinal) finalChunk += row[0]?.transcript ?? "";
      }
      const t = finalChunk.trim();
      if (!t) return;
      appendToBody(t);
    };

    rec.onerror = (ev: SpeechRecError) => {
      if (ev.error === "aborted") return;
      const human =
        ev.error === "not-allowed"
          ? "Microphone permission was blocked. Allow the mic for this site to dictate."
          : ev.error === "no-speech"
            ? "No speech detected—you can try again."
            : `Dictation paused (${ev.error}).`;
      setMessage(human);
      setListening(false);
      recRef.current = null;
    };

    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };

    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setMessage("Could not start dictation. Try again in a moment.");
      setListening(false);
      recRef.current = null;
    }
  }, [appendToBody, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    listening,
    message,
    start,
    stop,
    supported: Boolean(getSpeechRecognitionCtor()),
  };
}
