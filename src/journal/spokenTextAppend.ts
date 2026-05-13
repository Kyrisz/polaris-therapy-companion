/** Join a new speech phrase onto existing field text with a single space when needed. */
export function appendSpokenChunk(prev: string, chunk: string): string {
  const t = chunk.trim();
  if (!t) return prev;
  const p = prev ?? "";
  const sep = p.length > 0 && !/\s$/.test(p) ? " " : "";
  return p + sep + t;
}
