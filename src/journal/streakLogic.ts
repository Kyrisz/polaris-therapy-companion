import { addCalendarDaysLocal } from "../diary/diaryWeekModel";
import type { CheckInStreakState } from "../types";
import { loadStreak, saveStreak } from "../storage";

/**
 * Call after a successful guided diary save for `localDate` (YYYY-MM-DD).
 * At most one streak increment per local calendar day.
 */
export function recordGuidedCheckInForDate(localDate: string): CheckInStreakState {
  const prev = loadStreak();
  if (prev.lastGuidedCheckInLocalDate === localDate) {
    return prev;
  }

  const yesterday = addCalendarDaysLocal(localDate, -1);
  let nextStreak: number;
  if (!prev.lastGuidedCheckInLocalDate) {
    nextStreak = 1;
  } else if (prev.lastGuidedCheckInLocalDate === yesterday) {
    nextStreak = prev.currentStreak + 1;
  } else {
    nextStreak = 1;
  }

  const next: CheckInStreakState = {
    lastGuidedCheckInLocalDate: localDate,
    currentStreak: nextStreak,
    longestStreak: Math.max(prev.longestStreak, nextStreak),
  };
  saveStreak(next);
  return next;
}
