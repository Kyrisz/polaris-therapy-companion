import diaryCard from "../../data/diary-card.json";
import skillsModules from "../../data/skills-modules.json";
import type { ActionYN, DiaryWeekEntry, PromptingEventRow, WeekdayId } from "../types";
import { loadDiaryWeeks, saveDiaryWeeks, uid } from "../storage";

type DiaryCard = typeof diaryCard;
type SkillsFile = typeof skillsModules;

const card = diaryCard as DiaryCard;
const skills = skillsModules as SkillsFile;

const ALL_WEEKDAYS: WeekdayId[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEKDAY_LABEL: Record<WeekdayId, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/**
 * Calendar YYYY-MM-DD in the user's local timezone.
 * Do not use `toISOString().slice(0, 10)` for "today" — that is UTC and can be the wrong calendar day.
 */
export function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO(): string {
  return formatLocalYMD(new Date());
}

/**
 * Monday (YYYY-MM-DD, local) of the week that contains `isoDate`.
 * `isoDate` is parsed at local noon to reduce DST edge cases around midnight.
 */
export function mondayOfWeekContaining(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDay();
  const diffFromMon = (day + 6) % 7;
  d.setDate(d.getDate() - diffFromMon);
  return formatLocalYMD(d);
}

/** Monday YYYY-MM-DD (local) of the calendar week containing this `Date` (local date parts only). */
export function mondayContainingLocalDate(d: Date): string {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = local.getDay();
  const diffFromMon = (day + 6) % 7;
  local.setDate(local.getDate() - diffFromMon);
  return formatLocalYMD(local);
}

/** Add calendar days in local time (anchor at noon to reduce DST edge cases). */
export function addCalendarDaysLocal(isoDate: string, deltaDays: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + deltaDays);
  return formatLocalYMD(d);
}

/** Weekday id for a calendar date (uses device local timezone). */
export function weekdayIdFromISO(isoDate: string): WeekdayId {
  const d = new Date(isoDate + "T12:00:00");
  const order: WeekdayId[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return order[d.getDay()];
}

export function emptyPromptRow(): PromptingEventRow {
  const emotions: Record<string, number> = {};
  card.emotionColumns.forEach((c) => {
    emotions[c.id] = 0;
  });
  return {
    prompt: "",
    rowDate: "",
    emotions,
    urges: [0, 0, 0, 0],
    actions: ["", "", "", ""],
    usedSkills: 0,
  };
}

export function allSkillIds(): string[] {
  return skills.modules.flatMap((m) => m.skills.map((s) => s.id));
}

function emptySkillsByDay(): Record<WeekdayId, Record<string, boolean>> {
  const ids = allSkillIds();
  const out = {} as Record<WeekdayId, Record<string, boolean>>;
  ALL_WEEKDAYS.forEach((d) => {
    const m: Record<string, boolean> = {};
    ids.forEach((id) => {
      m[id] = false;
    });
    out[d] = m;
  });
  return out;
}

export function createBlankWeek(weekStartMonday: string): DiaryWeekEntry {
  const rows: PromptingEventRow[] = [];
  for (let i = 0; i < card.promptingEventRowCount; i++) rows.push(emptyPromptRow());
  return {
    id: uid(),
    weekStartMonday: weekStartMonday,
    fillFrequency: "",
    dateStarted: "",
    targetBehaviors: ["", "", "", ""],
    events: rows,
    otherEventsByWeekday: {
      mon: "",
      tue: "",
      wed: "",
      thu: "",
      fri: "",
      sat: "",
      sun: "",
    },
    skillsByDay: emptySkillsByDay(),
    skillsToPracticeNextWeek: "",
    createdAt: new Date().toISOString(),
  };
}

/** Ensure row count and per-day skill maps exist (for older saved JSON). */
export function normalizeWeekEntry(entry: DiaryWeekEntry): DiaryWeekEntry {
  const ids = allSkillIds();
  const events = [...(entry.events || [])];
  while (events.length < card.promptingEventRowCount) {
    events.push(emptyPromptRow());
  }
  if (events.length > card.promptingEventRowCount) {
    events.length = card.promptingEventRowCount;
  }
  const mergedEvents = events.map((row) => {
    const emotions = { ...emptyPromptRow().emotions, ...row.emotions };
    card.emotionColumns.forEach((c) => {
      if (emotions[c.id] === undefined) emotions[c.id] = 0;
    });
    const urges = (row.urges?.length === 4 ? [...row.urges] : [0, 0, 0, 0]) as [
      number,
      number,
      number,
      number,
    ];
    const actions = (row.actions?.length === 4 ? [...row.actions] : ["", "", "", ""]) as [
      ActionYN,
      ActionYN,
      ActionYN,
      ActionYN,
    ];
    return {
      ...row,
      emotions,
      urges,
      actions,
      usedSkills: Math.min(7, Math.max(0, row.usedSkills ?? 0)),
    };
  });

  const skillsByDay = { ...entry.skillsByDay } as Record<WeekdayId, Record<string, boolean>>;
  ALL_WEEKDAYS.forEach((d) => {
    const prev = skillsByDay[d] || {};
    const m: Record<string, boolean> = {};
    ids.forEach((id) => {
      m[id] = prev[id] ?? false;
    });
    skillsByDay[d] = m;
  });

  const tb = entry.targetBehaviors?.length === 4 ? [...entry.targetBehaviors] : ["", "", "", ""];
  const o = entry.otherEventsByWeekday || {};
  const other: Record<WeekdayId, string> = {
    mon: o.mon ?? "",
    tue: o.tue ?? "",
    wed: o.wed ?? "",
    thu: o.thu ?? "",
    fri: o.fri ?? "",
    sat: o.sat ?? "",
    sun: o.sun ?? "",
  };

  return {
    ...entry,
    events: mergedEvents,
    skillsByDay,
    targetBehaviors: tb as [string, string, string, string],
    otherEventsByWeekday: other,
  };
}

export function loadOrCreateWeek(weekStartMonday: string): DiaryWeekEntry {
  const weeks = loadDiaryWeeks();
  const found = weeks.find((w) => w.weekStartMonday === weekStartMonday);
  if (found) return normalizeWeekEntry({ ...found });
  return createBlankWeek(weekStartMonday);
}

/**
 * Row for this check-in date: same rowDate, else first empty row (no prompt and no rowDate).
 */
export function findRowIndexForCheckIn(events: PromptingEventRow[], dateISO: string): number | null {
  const exact = events.findIndex((e) => e.rowDate === dateISO);
  if (exact >= 0) return exact;
  const empty = events.findIndex((e) => !String(e.prompt || "").trim() && !String(e.rowDate || "").trim());
  if (empty >= 0) return empty;
  return null;
}

export function persistWeek(entry: DiaryWeekEntry): void {
  const normalized = normalizeWeekEntry(entry);
  const weeks = loadDiaryWeeks().filter((w) => w.weekStartMonday !== normalized.weekStartMonday);
  weeks.push(normalized);
  weeks.sort((a, b) => (a.weekStartMonday < b.weekStartMonday ? -1 : 1));
  saveDiaryWeeks(weeks);
}
