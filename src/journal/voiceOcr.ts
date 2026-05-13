/**
 * Browser-only speech + OCR helpers for the journal.
 * Dictation uses the Web Speech API (Chrome/Edge/Safari where supported).
 * OCR uses tesseract.js (lazy-loaded; works offline after first download of language data).
 */

/** Minimal typing for Web Speech API (TS DOM lib coverage varies by version). */
export interface SpeechRecResultItem {
  transcript: string;
}

export interface SpeechRecResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecResultItem;
}

export interface SpeechRecResultList {
  length: number;
  [index: number]: SpeechRecResult;
}

export interface SpeechRecEvent extends Event {
  resultIndex: number;
  results: SpeechRecResultList;
}

export interface SpeechRecError extends Event {
  error: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecEvent) => void) | null;
  onerror: ((ev: SpeechRecError) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function hasSpeechRecognition(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function stopSpeaking(): void {
  if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
}

/** Speak title + body; cancels any current utterance. */
export function speakJournalText(title: string, body: string, onEnd?: () => void): void {
  if (!hasSpeechSynthesis()) return;
  window.speechSynthesis.cancel();
  const parts = [title.trim(), body.trim()].filter(Boolean);
  if (!parts.length) return;
  const u = new SpeechSynthesisUtterance(parts.join(". "));
  u.rate = 0.92;
  u.pitch = 1;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export async function runOcrOnFile(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return (text || "").replace(/\r\n/g, "\n").trim();
  } finally {
    await worker.terminate();
  }
}
