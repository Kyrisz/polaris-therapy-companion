import { formatLocalYMD, mondayOfWeekContaining, weekdayIdFromISO } from "../diary/diaryWeekModel";
import type { DiaryWeekEntry, JournalEntry, MoodEntry, PromptingEventRow, SpiralEntry, WeekdayId } from "../types";
import { loadDayTagline, loadDiaryWeeks, loadJournal, loadMood, loadSpiral } from "../storage";

export type DaySnapshot = {
  dateLocal: string;
  weekday: WeekdayId;
  tagline: string;
  week: DiaryWeekEntry | null;
  row: PromptingEventRow | null;
  weekdayOtherNote: string;
  moods: MoodEntry[];
  spirals: SpiralEntry[];
  journals: JournalEntry[];
};

export function getDaySnapshot(dateLocal: string): DaySnapshot {
  const mon = mondayOfWeekContaining(dateLocal);
  const week = loadDiaryWeeks().find((w) => w.weekStartMonday === mon) ?? null;
  const row = week?.events.find((e) => e.rowDate === dateLocal) ?? null;
  const wd = weekdayIdFromISO(dateLocal);
  const wdNote = week?.otherEventsByWeekday?.[wd]?.trim() ?? "";
  const moods = loadMood().filter((m) => formatLocalYMD(new Date(m.at)) === dateLocal);
  const spirals = loadSpiral().filter((s) => formatLocalYMD(new Date(s.at)) === dateLocal);
  const journals = loadJournal()
    .filter((j) => j.entryDate === dateLocal)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return {
    dateLocal,
    weekday: wd,
    tagline: loadDayTagline(dateLocal),
    week,
    row,
    weekdayOtherNote: wdNote,
    moods,
    spirals,
    journals,
  };
}

export function daySnapshotHasActivity(s: DaySnapshot): boolean {
  const row = s.row;
  const diaryDated = Boolean(row && row.rowDate === s.dateLocal);
  return Boolean(
    diaryDated ||
      s.weekdayOtherNote ||
      s.moods.length ||
      s.spirals.length ||
      s.journals.length ||
      s.tagline.trim()
  );
}
