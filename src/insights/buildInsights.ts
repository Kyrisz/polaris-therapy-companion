import diaryCard from "../../data/diary-card.json";
import type { DiaryWeekEntry, JournalEntry, MoodEntry, PromptingEventRow, SpiralEntry } from "../types";
import { formatLocalYMD } from "../diary/diaryWeekModel";

const card = diaryCard as typeof diaryCard;

function isFilledDiaryRow(row: PromptingEventRow): boolean {
  return Boolean(String(row.rowDate || "").trim());
}

function localDateFromMoodAt(isoAt: string): string {
  try {
    return formatLocalYMD(new Date(isoAt));
  } catch {
    return "";
  }
}

export type EmotionAvg = { id: string; label: string; avg: number; count: number };

export type UrgeByTarget = { label: string; avgUrge: number; count: number };

export type UsedSkillsBin = { value: number; count: number };

export type MoodPoint = { date: string; mood: number; at: string };

export type InsightsSnapshot = {
  /** Rows with a saved calendar date (guided or sheet). */
  diaryRowCount: number;
  uniqueDiaryDates: number;
  firstDiaryDate: string | null;
  lastDiaryDate: string | null;
  emotionAverages: EmotionAvg[];
  urgeByTarget: UrgeByTarget[];
  usedSkillsBins: UsedSkillsBin[];
  actionYesRate: { label: string; yes: number; no: number; unset: number }[];
  journalEntryCount: number;
  journalByKind: Record<string, number>;
  moodLogCount: number;
  moodAvgAll: number | null;
  moodRecent: MoodPoint[];
  spiralCount: number;
  spiralAvgPeak: number | null;
};

function minMaxDate(prevMin: string | null, prevMax: string | null, d: string): { min: string; max: string } {
  const min = !prevMin || d < prevMin ? d : prevMin;
  const max = !prevMax || d > prevMax ? d : prevMax;
  return { min, max };
}

export function buildInsights(
  weeks: DiaryWeekEntry[],
  journal: JournalEntry[],
  moods: MoodEntry[],
  spirals: SpiralEntry[]
): InsightsSnapshot {
  const emotionSums: Record<string, { sum: number; n: number }> = {};
  card.emotionColumns.forEach((c) => {
    emotionSums[c.id] = { sum: 0, n: 0 };
  });

  const urgeMap = new Map<string, { sum: number; n: number; displayLabel: string }>();
  const usedCount = new Map<number, number>();
  for (let v = 0; v <= 7; v++) usedCount.set(v, 0);

  const actionMap = new Map<string, { yes: number; no: number; unset: number; displayLabel: string }>();

  const diaryDates = new Set<string>();
  let rowCount = 0;
  let firstD: string | null = null;
  let lastD: string | null = null;

  for (const week of weeks) {
    const targets = week.targetBehaviors || ["", "", "", ""];
    for (const row of week.events || []) {
      if (!isFilledDiaryRow(row)) continue;
      rowCount++;
      const d = String(row.rowDate).trim();
      diaryDates.add(d);
      const mm = minMaxDate(firstD, lastD, d);
      firstD = mm.min;
      lastD = mm.max;

      card.emotionColumns.forEach((c) => {
        const v = row.emotions?.[c.id];
        if (typeof v === "number" && v >= 0 && v <= 5) {
          emotionSums[c.id].sum += v;
          emotionSums[c.id].n += 1;
        }
      });

      const u = row.urges?.length === 4 ? row.urges : [0, 0, 0, 0];
      const act = row.actions?.length === 4 ? row.actions : ["", "", "", ""];
      for (let i = 0; i < 4; i++) {
        const name = String(targets[i] || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const prev = urgeMap.get(key) || { sum: 0, n: 0, displayLabel: name };
        prev.sum += u[i] ?? 0;
        prev.n += 1;
        urgeMap.set(key, prev);

        let ap = actionMap.get(key);
        if (!ap) {
          ap = { yes: 0, no: 0, unset: 0, displayLabel: name };
          actionMap.set(key, ap);
        }
        const a = act[i];
        if (a === "y") ap.yes += 1;
        else if (a === "n") ap.no += 1;
        else ap.unset += 1;
        actionMap.set(key, ap);
      }

      const sk = Math.min(7, Math.max(0, row.usedSkills ?? 0));
      usedCount.set(sk, (usedCount.get(sk) || 0) + 1);
    }
  }

  const emotionAverages: EmotionAvg[] = card.emotionColumns.map((c) => {
    const { sum, n } = emotionSums[c.id];
    return { id: c.id, label: c.label, avg: n ? sum / n : 0, count: n };
  });

  const urgeByTarget: UrgeByTarget[] = Array.from(urgeMap.entries())
    .map(([, { sum, n, displayLabel }]) => ({
      label: displayLabel,
      avgUrge: n ? sum / n : 0,
      count: n,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const usedSkillsBins: UsedSkillsBin[] = [];
  for (let v = 0; v <= 7; v++) usedSkillsBins.push({ value: v, count: usedCount.get(v) || 0 });

  const actionYesRate = Array.from(actionMap.values())
    .map((v) => ({ label: v.displayLabel, yes: v.yes, no: v.no, unset: v.unset }))
    .sort((a, b) => b.yes + b.no + b.unset - (a.yes + a.no + a.unset));

  const journalByKind: Record<string, number> = {};
  for (const e of journal) {
    journalByKind[e.kind] = (journalByKind[e.kind] || 0) + 1;
  }

  const moodSorted = [...moods].sort((a, b) => (a.at < b.at ? -1 : 1));
  let moodSum = 0;
  for (const m of moodSorted) {
    if (typeof m.mood === "number") moodSum += m.mood;
  }
  const moodAvgAll = moodSorted.length ? moodSum / moodSorted.length : null;

  const moodRecent: MoodPoint[] = moodSorted.slice(-18).map((m) => ({
    date: localDateFromMoodAt(m.at),
    mood: m.mood,
    at: m.at,
  }));

  let peakSum = 0;
  let peakN = 0;
  for (const s of spirals) {
    if (typeof s.peakIntensity === "number" && s.peakIntensity >= 0) {
      peakSum += s.peakIntensity;
      peakN += 1;
    }
  }

  return {
    diaryRowCount: rowCount,
    uniqueDiaryDates: diaryDates.size,
    firstDiaryDate: firstD,
    lastDiaryDate: lastD,
    emotionAverages,
    urgeByTarget,
    usedSkillsBins,
    actionYesRate,
    journalEntryCount: journal.length,
    journalByKind,
    moodLogCount: moods.length,
    moodAvgAll,
    moodRecent,
    spiralCount: spirals.length,
    spiralAvgPeak: peakN ? peakSum / peakN : null,
  };
}
