export type WeekdayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type ActionYN = "" | "y" | "n";

/** One row on DBT Diary Card page 1 (prompting events grid). */
export type PromptingEventRow = {
  prompt: string;
  rowDate: string;
  emotions: Record<string, number>;
  urges: [number, number, number, number];
  actions: [ActionYN, ActionYN, ActionYN, ActionYN];
  usedSkills: number;
};

/** One saved week aligned with DBT Diary Card pg 1–2. */
export type DiaryWeekEntry = {
  id: string;
  weekStartMonday: string;
  fillFrequency: "" | "daily" | "2_3_week" | "weekly";
  dateStarted: string;
  targetBehaviors: [string, string, string, string];
  events: PromptingEventRow[];
  otherEventsByWeekday: Record<WeekdayId, string>;
  skillsByDay: Record<WeekdayId, Record<string, boolean>>;
  skillsToPracticeNextWeek: string;
  createdAt: string;
};

/** Legacy v1 daily snapshot (older app build); still readable from localStorage. */
export type DailyEntry = {
  id: string;
  date: string;
  urges: Record<string, number>;
  misery: Record<string, number>;
  emotions: { id: string; label: string; intensity: number }[];
  medsAsPrescribed: "" | "yes" | "no" | "na";
  medsNotes: string;
  skillsUsed: Record<string, boolean>;
  skillEffectiveness: number;
  freeText: Record<string, string>;
  createdAt: string;
};

export type MoodEntry = {
  id: string;
  at: string;
  mood: number;
  emotions: string[];
  bodyNote: string;
  notes: string;
};

export type SpiralEntry = {
  id: string;
  at: string;
  stages: Record<string, string>;
  peakIntensity: number;
  outcomeNote: string;
};

export type WeeklyEntry = {
  id: string;
  weekStart: string;
  responses: Record<string, string>;
  createdAt: string;
};

/** One gentle “this week I’m practicing…” line (local; not a streak). */
export type WeeklyIntention = {
  weekStartMonday: string;
  text: string;
  skillTag: string;
  updatedAt: string;
};

/** Free journal / reflection entry (stored locally). */
export type JournalEntry = {
  id: string;
  createdAt: string;
  /** Calendar day this entry belongs to (local YYYY-MM-DD). */
  entryDate: string;
  kind:
    | "freeform"
    | "emotion"
    | "situation"
    | "scheduled_reflection"
    | "session_prep"
    | "session_debrief";
  title: string;
  body: string;
  /** Optional tags (e.g. from #hashtags or comma field) for search and future insights. */
  tags?: string[];
  /** If created from a scheduled reflection reminder. */
  reminderId?: string;
  /** Optional DBT-style scaffold id when the user picked a template. */
  templateId?: string;
  /** Optional compressed JPEG data URL (small; for memory / context). */
  photoDataUrl?: string;
};

/** Browser notification nudges (fires while this device has permission; not a substitute for crisis care). */
export type GentleAppReminderPrefs = {
  notificationsOn: boolean;
  dailyCheckIn: { enabled: boolean; hour: number; minute: number };
  /** weekday: 0 Sun … 6 Sat (matches Date#getDay). */
  weeklyReview: { enabled: boolean; weekday: number; hour: number; minute: number };
  /** Local YYYY-MM-DD we last showed the daily nudge (at most once per day). */
  lastDailyFireYmd: string;
  /** Monday YYYY-MM-DD of the week we last showed the weekly nudge. */
  lastWeeklyFireKey: string;
};

/** Local-time reminder for a longer reflection (e.g. 9 PM). Browser cannot wake closed; we nudge when you open the app. */
export type JournalReminder = {
  id: string;
  label: string;
  hour: number;
  minute: number;
  /** Empty = every day. */
  weekdays: WeekdayId[];
  enabled: boolean;
};

/** Guided DBT check-in streak (one count per local calendar day). */
export type CheckInStreakState = {
  lastGuidedCheckInLocalDate: string;
  currentStreak: number;
  longestStreak: number;
};

/** Optional crisis / safety notes the user fills once; not sent anywhere. */
export type SafetyPlanData = {
  updatedAt: string;
  whoCanHelp: string;
  crisisNumbers: string;
  groundingList: string;
  ifThenPlan: string;
  environmentNotes: string;
};

/** Completed urge-surfing style timer session (local log). */
export type UrgeTimerSession = {
  id: string;
  label: string;
  plannedMinutes: number;
  startedAt: string;
  completedAt: string;
  note: string;
};
