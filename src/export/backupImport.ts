import { normalizeWeekEntry } from "../diary/diaryWeekModel";
import type {
  DailyEntry,
  DiaryWeekEntry,
  JournalEntry,
  JournalReminder,
  MoodEntry,
  PromptingEventRow,
  SpiralEntry,
  WeeklyEntry,
  WeeklyIntention,
} from "../types";
import type { AppBackupPayload } from "./backupExport";
import {
  loadDaily,
  loadDayTaglines,
  loadDiaryWeeks,
  loadDisplayName,
  loadJournal,
  loadJournalReminders,
  loadMood,
  loadSpiral,
  loadWeekly,
  loadWeeklyIntention,
  persistWeeklyIntention,
  saveDaily,
  saveDayTaglines,
  saveDiaryWeeks,
  saveDisplayName,
  saveJournal,
  saveJournalReminders,
  saveMood,
  saveSpiral,
  saveStreak,
  saveWeekly,
  setLargeTextEnabled,
} from "../storage";

function isObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function isDiaryWeekEntry(x: unknown): x is DiaryWeekEntry {
  if (!isObject(x)) return false;
  return (
    typeof x.id === "string" &&
    typeof x.weekStartMonday === "string" &&
    Array.isArray(x.events) &&
    Array.isArray(x.targetBehaviors) &&
    x.targetBehaviors.length === 4
  );
}

export function parseBackupJson(text: string): { ok: true; payload: AppBackupPayload } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!isObject(parsed)) return { ok: false, error: "Backup must be a JSON object." };
  if (parsed.app !== "dbt-diary-checkin") return { ok: false, error: "This file does not look like a backup from this app." };
  if (parsed.version !== 1) return { ok: false, error: `Unsupported backup version: ${String(parsed.version)}` };
  if (!Array.isArray(parsed.diaryWeeks) || !parsed.diaryWeeks.every(isDiaryWeekEntry)) {
    return { ok: false, error: "Backup diaryWeeks field is missing or invalid." };
  }
  const payload = parsed as unknown as AppBackupPayload;
  if (!Array.isArray(payload.journal)) return { ok: false, error: "Invalid journal array." };
  if (!Array.isArray(payload.mood)) return { ok: false, error: "Invalid mood array." };
  if (!Array.isArray(payload.spiral)) return { ok: false, error: "Invalid spiral array." };
  if (!Array.isArray(payload.weekly)) return { ok: false, error: "Invalid weekly array." };
  if (!Array.isArray(payload.journalReminders)) return { ok: false, error: "Invalid journal reminders array." };
  if (!Array.isArray(payload.dailyLegacy)) return { ok: false, error: "Invalid dailyLegacy array." };
  if (payload.dayTaglines == null || typeof payload.dayTaglines !== "object" || Array.isArray(payload.dayTaglines)) {
    return { ok: false, error: "Invalid dayTaglines object." };
  }
  if (payload.streak == null || typeof payload.streak !== "object") {
    return { ok: false, error: "Invalid streak object." };
  }
  return { ok: true, payload };
}

function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of local) map.set(x.id, x);
  for (const x of incoming) map.set(x.id, x);
  return Array.from(map.values());
}

function mergeWeeklyByWeekStart(local: WeeklyEntry[], incoming: WeeklyEntry[]): WeeklyEntry[] {
  const map = new Map<string, WeeklyEntry>();
  for (const w of local) map.set(w.weekStart, w);
  for (const w of incoming) {
    const ex = map.get(w.weekStart);
    if (!ex || w.createdAt >= ex.createdAt) map.set(w.weekStart, w);
  }
  return Array.from(map.values()).sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

function rowScore(r: PromptingEventRow): number {
  return (r.prompt?.trim().length ?? 0) + (r.rowDate ? 2 : 0) + (r.usedSkills ?? 0);
}

function mergePromptRows(a: PromptingEventRow[], b: PromptingEventRow[]): PromptingEventRow[] {
  const n = Math.max(a.length, b.length);
  const out: PromptingEventRow[] = [];
  for (let i = 0; i < n; i++) {
    const ra = a[i];
    const rb = b[i];
    if (!ra) {
      if (rb) out.push({ ...rb });
      continue;
    }
    if (!rb) {
      out.push({ ...ra });
      continue;
    }
    out.push(rowScore(rb) >= rowScore(ra) ? { ...rb } : { ...ra });
  }
  return out;
}

function mergeSkillsByDay(
  a: DiaryWeekEntry["skillsByDay"],
  b: DiaryWeekEntry["skillsByDay"]
): DiaryWeekEntry["skillsByDay"] {
  const days = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof typeof a>;
  const out = { ...a } as DiaryWeekEntry["skillsByDay"];
  days.forEach((d) => {
    const ma = a[d] ?? {};
    const mb = b[d] ?? {};
    const keys = new Set([...Object.keys(ma), ...Object.keys(mb)]);
    const merged: Record<string, boolean> = { ...ma };
    keys.forEach((k) => {
      merged[k] = Boolean(ma[k]) || Boolean(mb[k]);
    });
    out[d] = merged;
  });
  return out;
}

function mergeTwoDiaryWeeks(local: DiaryWeekEntry, incoming: DiaryWeekEntry): DiaryWeekEntry {
  const tbLocal = local.targetBehaviors;
  const tbInc = incoming.targetBehaviors;
  const targetBehaviors: [string, string, string, string] = [0, 1, 2, 3].map((i) => {
    const a = String(tbLocal[i] ?? "").trim();
    const b = String(tbInc[i] ?? "").trim();
    if (a && b) return a.length >= b.length ? tbLocal[i]! : tbInc[i]!;
    return a || b || "";
  }) as [string, string, string, string];

  return normalizeWeekEntry({
    ...local,
    createdAt: local.createdAt > incoming.createdAt ? local.createdAt : incoming.createdAt,
    targetBehaviors,
    events: mergePromptRows(local.events, incoming.events),
    skillsToPracticeNextWeek:
      (incoming.skillsToPracticeNextWeek?.trim().length ?? 0) >= (local.skillsToPracticeNextWeek?.trim().length ?? 0)
        ? incoming.skillsToPracticeNextWeek
        : local.skillsToPracticeNextWeek,
    fillFrequency: incoming.fillFrequency || local.fillFrequency,
    skillsByDay: mergeSkillsByDay(local.skillsByDay, incoming.skillsByDay),
    otherEventsByWeekday: { ...local.otherEventsByWeekday, ...incoming.otherEventsByWeekday },
  });
}

function mergeDiaryWeeks(local: DiaryWeekEntry[], incoming: DiaryWeekEntry[]): DiaryWeekEntry[] {
  const byMon = new Map<string, DiaryWeekEntry[]>();
  for (const w of [...local, ...incoming]) {
    const list = byMon.get(w.weekStartMonday) ?? [];
    list.push(w);
    byMon.set(w.weekStartMonday, list);
  }
  const out: DiaryWeekEntry[] = [];
  for (const [, list] of byMon) {
    if (list.length === 1) {
      out.push(normalizeWeekEntry(list[0]!));
      continue;
    }
    const sorted = list.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
    const merged = sorted
      .slice(1)
      .reduce((acc, w) => mergeTwoDiaryWeeks(acc, w), normalizeWeekEntry({ ...sorted[0]! }));
    out.push(normalizeWeekEntry(merged));
  }
  out.sort((a, b) => (a.weekStartMonday < b.weekStartMonday ? -1 : 1));
  return out;
}

export type BackupPreviewCounts = {
  diaryWeeks: number;
  journal: number;
  journalReminders: number;
  mood: number;
  spiral: number;
  weekly: number;
  dailyLegacy: number;
  dayTaglineKeys: number;
  exportedAt: string;
};

export function previewBackupPayload(payload: AppBackupPayload): BackupPreviewCounts {
  return {
    diaryWeeks: payload.diaryWeeks.length,
    journal: payload.journal.length,
    journalReminders: payload.journalReminders.length,
    mood: payload.mood.length,
    spiral: payload.spiral.length,
    weekly: payload.weekly.length,
    dailyLegacy: payload.dailyLegacy.length,
    dayTaglineKeys: Object.keys(payload.dayTaglines ?? {}).length,
    exportedAt: payload.exportedAt,
  };
}

export function applyBackupImport(payload: AppBackupPayload, mode: "replace" | "merge"): void {
  if (mode === "replace") {
    saveDiaryWeeks(payload.diaryWeeks.map((w) => normalizeWeekEntry({ ...w })));
    saveJournal([...payload.journal]);
    saveJournalReminders([...payload.journalReminders]);
    saveMood([...payload.mood]);
    saveSpiral([...payload.spiral]);
    saveWeekly([...payload.weekly]);
    saveDaily([...payload.dailyLegacy]);
    saveStreak({ ...payload.streak });
    saveDayTaglines({ ...payload.dayTaglines });
    saveDisplayName(String(payload.displayName ?? "").trim());
    if (payload.weeklyIntention !== undefined) {
      persistWeeklyIntention(payload.weeklyIntention ?? null);
    }
    if (payload.a11yLargeText !== undefined) {
      setLargeTextEnabled(Boolean(payload.a11yLargeText));
    }
    return;
  }

  const weeks = mergeDiaryWeeks(loadDiaryWeeks(), payload.diaryWeeks);
  saveDiaryWeeks(weeks);

  saveJournal(mergeById<JournalEntry>(loadJournal(), payload.journal));
  saveJournalReminders(mergeById<JournalReminder>(loadJournalReminders(), payload.journalReminders));
  saveMood(mergeById<MoodEntry>(loadMood(), payload.mood));
  saveSpiral(mergeById<SpiralEntry>(loadSpiral(), payload.spiral));
  saveWeekly(mergeWeeklyByWeekStart(loadWeekly(), payload.weekly));
  saveDaily(mergeById<DailyEntry>(loadDaily(), payload.dailyLegacy));

  const tags = { ...loadDayTaglines(), ...payload.dayTaglines };
  saveDayTaglines(tags);

  const localName = loadDisplayName().trim();
  const incName = String(payload.displayName ?? "").trim();
  if (!localName && incName) saveDisplayName(incName);

  if (payload.weeklyIntention && typeof payload.weeklyIntention === "object") {
    const inc = payload.weeklyIntention as WeeklyIntention;
    const loc = loadWeeklyIntention();
    if (!loc || (inc.updatedAt || "") >= (loc.updatedAt || "")) {
      persistWeeklyIntention(inc);
    }
  }
}
