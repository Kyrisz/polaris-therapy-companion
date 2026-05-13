import type {
  CheckInStreakState,
  DailyEntry,
  DiaryWeekEntry,
  GentleAppReminderPrefs,
  JournalEntry,
  JournalReminder,
  MoodEntry,
  SafetyPlanData,
  SpiralEntry,
  UrgeTimerSession,
  WeeklyEntry,
  WeeklyIntention,
} from "./types";

const KEYS = {
  daily: "dbt-app:daily",
  diaryWeek: "dbt-app:diary-week",
  mood: "dbt-app:mood",
  spiral: "dbt-app:spiral",
  weekly: "dbt-app:weekly",
  journal: "dbt-app:journal",
  journalReminders: "dbt-app:journal-reminders",
  streak: "dbt-app:checkin-streak",
  displayName: "dbt-app:call-me",
  dayTaglines: "dbt-app:day-taglines",
  safetyPlan: "dbt-app:safety-plan",
  urgeTimerLog: "dbt-app:urge-timer-log",
  pinnedTools: "dbt-app:pinned-tools",
  lastBackupExport: "dbt-app:last-backup-export",
  gentleReminders: "dbt-app:gentle-reminders",
  weeklyIntention: "dbt-app:weekly-intention",
  a11yLargeText: "dbt-app:a11y-large-text",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadDaily(): DailyEntry[] {
  return read<DailyEntry[]>(KEYS.daily, []);
}

export function saveDaily(entries: DailyEntry[]) {
  write(KEYS.daily, entries);
}

export function loadDiaryWeeks(): DiaryWeekEntry[] {
  return read<DiaryWeekEntry[]>(KEYS.diaryWeek, []);
}

export function saveDiaryWeeks(entries: DiaryWeekEntry[]) {
  write(KEYS.diaryWeek, entries);
}

export function loadMood(): MoodEntry[] {
  return read<MoodEntry[]>(KEYS.mood, []);
}

export function saveMood(entries: MoodEntry[]) {
  write(KEYS.mood, entries);
}

export function loadSpiral(): SpiralEntry[] {
  return read<SpiralEntry[]>(KEYS.spiral, []);
}

export function saveSpiral(entries: SpiralEntry[]) {
  write(KEYS.spiral, entries);
}

export function loadWeekly(): WeeklyEntry[] {
  return read<WeeklyEntry[]>(KEYS.weekly, []);
}

export function saveWeekly(entries: WeeklyEntry[]) {
  write(KEYS.weekly, entries);
}

export function loadJournal(): JournalEntry[] {
  return read<JournalEntry[]>(KEYS.journal, []);
}

export function saveJournal(entries: JournalEntry[]) {
  write(KEYS.journal, entries);
}

export function loadJournalReminders(): JournalReminder[] {
  return read<JournalReminder[]>(KEYS.journalReminders, []);
}

export function saveJournalReminders(list: JournalReminder[]) {
  write(KEYS.journalReminders, list);
}

export function loadStreak(): CheckInStreakState {
  return read<CheckInStreakState>(KEYS.streak, {
    lastGuidedCheckInLocalDate: "",
    currentStreak: 0,
    longestStreak: 0,
  });
}

export function saveStreak(s: CheckInStreakState) {
  write(KEYS.streak, s);
}

export function loadDisplayName(): string {
  return read<string>(KEYS.displayName, "");
}

export function saveDisplayName(name: string) {
  write(KEYS.displayName, name.trim());
}

export function loadDayTaglines(): Record<string, string> {
  return read<Record<string, string>>(KEYS.dayTaglines, {});
}

export function saveDayTaglines(map: Record<string, string>) {
  write(KEYS.dayTaglines, map);
}

export function loadDayTagline(dateLocal: string): string {
  return (loadDayTaglines()[dateLocal] || "").trim();
}

export function saveDayTagline(dateLocal: string, line: string) {
  const map = { ...loadDayTaglines() };
  const t = line.trim();
  if (!t) delete map[dateLocal];
  else map[dateLocal] = t;
  saveDayTaglines(map);
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function clearAllAppData(): { removedKeys: number } {
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of keys) {
      if (!k.startsWith("dbt-app:")) continue;
      try {
        localStorage.removeItem(k);
        removed += 1;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return { removedKeys: removed };
}

const emptySafetyPlan = (): SafetyPlanData => ({
  updatedAt: "",
  whoCanHelp: "",
  crisisNumbers: "",
  groundingList: "",
  ifThenPlan: "",
  environmentNotes: "",
});

export function loadSafetyPlan(): SafetyPlanData {
  return read<SafetyPlanData>(KEYS.safetyPlan, emptySafetyPlan());
}

export function saveSafetyPlan(data: SafetyPlanData) {
  write(KEYS.safetyPlan, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export function loadUrgeTimerLog(): UrgeTimerSession[] {
  return read<UrgeTimerSession[]>(KEYS.urgeTimerLog, []);
}

export function saveUrgeTimerLog(entries: UrgeTimerSession[]) {
  write(KEYS.urgeTimerLog, entries);
}

export function appendUrgeTimerSession(entry: UrgeTimerSession) {
  const list = loadUrgeTimerLog();
  list.unshift(entry);
  saveUrgeTimerLog(list.slice(0, 80));
}

export function loadPinnedToolPaths(): string[] {
  return read<string[]>(KEYS.pinnedTools, []);
}

export function savePinnedToolPaths(paths: string[]) {
  write(KEYS.pinnedTools, paths);
}

export function loadLastBackupExportAt(): string {
  try {
    const raw = localStorage.getItem(KEYS.lastBackupExport);
    return raw && /^\d{4}-\d{2}-\d{2}T/.test(raw) ? raw : "";
  } catch {
    return "";
  }
}

export function saveLastBackupExportAt(iso: string) {
  localStorage.setItem(KEYS.lastBackupExport, iso);
}

export function defaultGentleAppReminderPrefs(): GentleAppReminderPrefs {
  return {
    notificationsOn: false,
    dailyCheckIn: { enabled: true, hour: 9, minute: 0 },
    weeklyReview: { enabled: true, weekday: 0, hour: 18, minute: 0 },
    lastDailyFireYmd: "",
    lastWeeklyFireKey: "",
  };
}

export function loadGentleAppReminderPrefs(): GentleAppReminderPrefs {
  const raw = read<unknown>(KEYS.gentleReminders, null);
  if (!raw || typeof raw !== "object") return defaultGentleAppReminderPrefs();
  const d = defaultGentleAppReminderPrefs();
  const o = raw as Record<string, unknown>;
  const dc = o.dailyCheckIn && typeof o.dailyCheckIn === "object" ? (o.dailyCheckIn as Record<string, unknown>) : {};
  const wr = o.weeklyReview && typeof o.weeklyReview === "object" ? (o.weeklyReview as Record<string, unknown>) : {};
  return {
    notificationsOn: typeof o.notificationsOn === "boolean" ? o.notificationsOn : d.notificationsOn,
    dailyCheckIn: {
      enabled: typeof dc.enabled === "boolean" ? dc.enabled : d.dailyCheckIn.enabled,
      hour: typeof dc.hour === "number" ? Math.min(23, Math.max(0, dc.hour)) : d.dailyCheckIn.hour,
      minute: typeof dc.minute === "number" ? Math.min(59, Math.max(0, dc.minute)) : d.dailyCheckIn.minute,
    },
    weeklyReview: {
      enabled: typeof wr.enabled === "boolean" ? wr.enabled : d.weeklyReview.enabled,
      weekday: typeof wr.weekday === "number" ? Math.min(6, Math.max(0, wr.weekday)) : d.weeklyReview.weekday,
      hour: typeof wr.hour === "number" ? Math.min(23, Math.max(0, wr.hour)) : d.weeklyReview.hour,
      minute: typeof wr.minute === "number" ? Math.min(59, Math.max(0, wr.minute)) : d.weeklyReview.minute,
    },
    lastDailyFireYmd: typeof o.lastDailyFireYmd === "string" ? o.lastDailyFireYmd : d.lastDailyFireYmd,
    lastWeeklyFireKey: typeof o.lastWeeklyFireKey === "string" ? o.lastWeeklyFireKey : d.lastWeeklyFireKey,
  };
}

export function saveGentleAppReminderPrefs(p: GentleAppReminderPrefs) {
  write(KEYS.gentleReminders, p);
}

export function loadWeeklyIntention(): WeeklyIntention | null {
  const raw = read<unknown>(KEYS.weeklyIntention, null);
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.weekStartMonday !== "string") return null;
  return {
    weekStartMonday: o.weekStartMonday,
    text: typeof o.text === "string" ? o.text : "",
    skillTag: typeof o.skillTag === "string" ? o.skillTag : "",
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
  };
}

export function saveWeeklyIntention(pick: { weekStartMonday: string; text: string; skillTag: string }) {
  persistWeeklyIntention({
    ...pick,
    updatedAt: new Date().toISOString(),
  });
}

export function persistWeeklyIntention(data: WeeklyIntention | null) {
  if (data == null) {
    try {
      localStorage.removeItem(KEYS.weeklyIntention);
    } catch {
      /* ignore */
    }
  } else {
    write(KEYS.weeklyIntention, data);
  }
  try {
    window.dispatchEvent(new Event("dbt-weekly-intention-updated"));
  } catch {
    /* ignore */
  }
}

export function clearWeeklyIntention() {
  persistWeeklyIntention(null);
}

export function loadLargeTextEnabled(): boolean {
  return read<boolean>(KEYS.a11yLargeText, false);
}

export function setLargeTextEnabled(on: boolean) {
  write(KEYS.a11yLargeText, on);
  try {
    document.documentElement.classList.toggle("a11y-large-text", on);
  } catch {
    /* ignore */
  }
}
