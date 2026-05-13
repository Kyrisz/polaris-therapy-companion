export type PipPrefs = {
  enabled: boolean;
  dismissedHintIds: string[];
};

const KEY = "dbt-app:pip-prefs";

const DEFAULTS: PipPrefs = { enabled: true, dismissedHintIds: [] };

function read<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(value: T) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function loadPipPrefs(): PipPrefs {
  const raw = read<unknown>(DEFAULTS);
  if (!raw || typeof raw !== "object") return DEFAULTS;
  const o = raw as Record<string, unknown>;
  const enabled = typeof o.enabled === "boolean" ? o.enabled : DEFAULTS.enabled;
  const dismissedHintIds = Array.isArray(o.dismissedHintIds)
    ? (o.dismissedHintIds.filter((x) => typeof x === "string") as string[])
    : DEFAULTS.dismissedHintIds;
  return { enabled, dismissedHintIds };
}

export function savePipPrefs(next: PipPrefs) {
  write(next);
  try {
    window.dispatchEvent(new Event("dbt-pip-prefs-updated"));
  } catch {
    /* ignore */
  }
}

export function dismissPipHint(id: string) {
  const cur = loadPipPrefs();
  if (cur.dismissedHintIds.includes(id)) return;
  savePipPrefs({ ...cur, dismissedHintIds: [...cur.dismissedHintIds, id] });
}

export function setPipEnabled(enabled: boolean) {
  const cur = loadPipPrefs();
  savePipPrefs({ ...cur, enabled });
}

