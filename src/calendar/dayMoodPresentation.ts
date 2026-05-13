import type { MoodEntry } from "../types";

/** Map mood 0 (hard) → 10 (okay/pleasant) to a soft HSL fill for calendar cells. */
export function hslFillForMoodValue(v: number): string {
  const x = Math.min(10, Math.max(0, v));
  const h = 238 - (x / 10) * 208;
  const s = 38 + (x / 10) * 32;
  const l = 52 + (x / 10) * 18;
  return `hsl(${h} ${s}% ${l}%)`;
}

export type DayMoodPresentation = {
  background: string;
  /** Short text for title / a11y */
  summary: string;
};

/**
 * Single average mood → solid fill.
 * Multiple entries with spread ≥ 4 → diagonal gradient between min and max mood hues.
 */
export function moodPresentationForDay(moods: MoodEntry[]): DayMoodPresentation | null {
  if (!moods.length) return null;
  const values = moods.map((m) => m.mood);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  if (values.length >= 2 && spread >= 4) {
    const a = hslFillForMoodValue(min);
    const b = hslFillForMoodValue(max);
    return {
      background: `linear-gradient(145deg, ${a} 0%, ${b} 100%)`,
      summary: `Moods ${min}–${max} (${moods.length} logs)`,
    };
  }
  return {
    background: hslFillForMoodValue(avg),
    summary: `Mood ~${avg.toFixed(1)} / 10`,
  };
}
