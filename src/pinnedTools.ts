import { todayISO } from "./diary/diaryWeekModel";
import { loadPinnedToolPaths, savePinnedToolPaths } from "./storage";

/** Pinned strip always opens “today” for this token. */
export const PIN_PATH_TODAY = "__today__";

export const MAX_PINNED_TOOLS = 8;

const PIN_ORDER: { path: string; label: string }[] = [
  { path: PIN_PATH_TODAY, label: "Today" },
  { path: "/daily", label: "Check-in" },
  { path: "/journal", label: "Journal" },
  { path: "/mood", label: "Mood" },
  { path: "/weekly", label: "Weekly review" },
  { path: "/diary-sheet", label: "Full sheet" },
  { path: "/insights", label: "Insights" },
  { path: "/timeline", label: "Timeline" },
  { path: "/calendar", label: "Calendar" },
  { path: "/therapy", label: "Therapy" },
  { path: "/distress", label: "TIPP toolkit" },
  { path: "/urge-timer", label: "Urge timer" },
  { path: "/safety", label: "Safety card" },
  { path: "/body", label: "Body cues" },
  { path: "/spiral", label: "Spiral log" },
  { path: "/skills", label: "Skills" },
  { path: "/print/diary-week", label: "Print week" },
  { path: "/print/month", label: "Print month" },
  { path: "/tools#data", label: "Backup" },
];

const ALLOWED = new Set(PIN_ORDER.map((p) => p.path));

export function isPinnableToolPath(path: string): boolean {
  return ALLOWED.has(path);
}

export function labelForPinnedPath(path: string): string {
  return PIN_ORDER.find((p) => p.path === path)?.label ?? path;
}

export function resolvePinnedHref(path: string): string {
  if (path === PIN_PATH_TODAY) return `/day/${todayISO()}`;
  return path;
}

function normalizePinnedList(paths: string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (!ALLOWED.has(p)) continue;
    if (!out.includes(p)) out.push(p);
    if (out.length >= MAX_PINNED_TOOLS) break;
  }
  return out;
}

export function loadPinnedToolsNormalized(): string[] {
  return normalizePinnedList(loadPinnedToolPaths());
}

export function isToolPinned(path: string): boolean {
  return loadPinnedToolsNormalized().includes(path);
}

export function togglePinnedTool(path: string): boolean {
  if (!isPinnableToolPath(path)) return false;
  let list = loadPinnedToolsNormalized();
  if (list.includes(path)) {
    list = list.filter((p) => p !== path);
  } else {
    if (list.length >= MAX_PINNED_TOOLS) {
      list = [...list.slice(1), path];
    } else {
      list = [...list, path];
    }
  }
  savePinnedToolPaths(list);
  return list.includes(path);
}

export function removePinnedTool(path: string) {
  savePinnedToolPaths(loadPinnedToolsNormalized().filter((p) => p !== path));
}

/**
 * Pin a tool if it is not already pinned. If the strip is full, drops the oldest pin to make room (same as toggle).
 */
export function ensurePinnedTool(path: string) {
  if (!isPinnableToolPath(path)) return;
  const list = loadPinnedToolsNormalized();
  if (list.includes(path)) return;
  const next =
    list.length >= MAX_PINNED_TOOLS ? [...list.slice(1), path] : [...list, path];
  savePinnedToolPaths(next);
  dispatchPinsUpdated();
}

export function dispatchPinsUpdated() {
  try {
    window.dispatchEvent(new Event("dbt-pins-updated"));
  } catch {
    /* ignore */
  }
}
