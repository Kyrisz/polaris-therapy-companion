/** Extract #tags from text (letters, numbers, underscore, hyphen). */
export function extractHashtagsFromText(...parts: string[]): string[] {
  const re = /#([a-zA-Z0-9_-]{1,48})/g;
  const seen = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(part)) !== null) {
      seen.add(m[1].toLowerCase());
    }
  }
  return [...seen].sort();
}

/** Split comma / semicolon separated tags; trim, lowercase, dedupe. */
export function parseManualTagList(raw: string): string[] {
  const seen = new Set<string>();
  for (const chunk of raw.split(/[,;]+/)) {
    const t = chunk.trim().toLowerCase().replace(/^#+/, "");
    if (t.length > 0 && t.length <= 48) seen.add(t);
  }
  return [...seen].sort();
}

export function mergeJournalTags(body: string, title: string, manualRaw: string): string[] {
  const fromHash = extractHashtagsFromText(body, title);
  const manual = parseManualTagList(manualRaw);
  const all = new Set<string>([...fromHash, ...manual]);
  return [...all].sort();
}
