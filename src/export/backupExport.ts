import type { WeeklyIntention } from "../types";
import {
  loadDaily,
  loadDayTaglines,
  loadDiaryWeeks,
  loadDisplayName,
  loadJournal,
  loadJournalReminders,
  loadMood,
  loadSpiral,
  loadStreak,
  loadWeekly,
  loadWeeklyIntention,
  loadLargeTextEnabled,
  saveLastBackupExportAt,
} from "../storage";

export type AppBackupPayload = {
  exportedAt: string;
  app: "dbt-diary-checkin";
  version: 1;
  diaryWeeks: ReturnType<typeof loadDiaryWeeks>;
  journal: ReturnType<typeof loadJournal>;
  journalReminders: ReturnType<typeof loadJournalReminders>;
  mood: ReturnType<typeof loadMood>;
  spiral: ReturnType<typeof loadSpiral>;
  weekly: ReturnType<typeof loadWeekly>;
  dailyLegacy: ReturnType<typeof loadDaily>;
  streak: ReturnType<typeof loadStreak>;
  dayTaglines: ReturnType<typeof loadDayTaglines>;
  displayName: string;
  /** Optional since older backups omit these fields. */
  weeklyIntention?: WeeklyIntention | null;
  a11yLargeText?: boolean;
};

export function buildBackupPayload(): AppBackupPayload {
  return {
    exportedAt: new Date().toISOString(),
    app: "dbt-diary-checkin",
    version: 1,
    diaryWeeks: loadDiaryWeeks(),
    journal: loadJournal(),
    journalReminders: loadJournalReminders(),
    mood: loadMood(),
    spiral: loadSpiral(),
    weekly: loadWeekly(),
    dailyLegacy: loadDaily(),
    streak: loadStreak(),
    dayTaglines: loadDayTaglines(),
    displayName: loadDisplayName(),
    weeklyIntention: loadWeeklyIntention(),
    a11yLargeText: loadLargeTextEnabled(),
  };
}

export function downloadBackupJson(filename?: string) {
  const payload = buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = payload.exportedAt.slice(0, 10);
  a.href = url;
  a.download = filename || `dbt-checkin-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
  try {
    saveLastBackupExportAt(new Date().toISOString());
    window.dispatchEvent(new Event("dbt-backup-exported"));
  } catch {
    /* ignore */
  }
}
