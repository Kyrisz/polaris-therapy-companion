import { formatLocalYMD, mondayContainingLocalDate } from "../diary/diaryWeekModel";
import type { GentleAppReminderPrefs } from "../types";

export function tickGentleReminders(
  now: Date,
  prefs: GentleAppReminderPrefs,
  onUpdate: (next: GentleAppReminderPrefs) => void
): void {
  if (!prefs.notificationsOn) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const ymd = formatLocalYMD(now);
  const h = now.getHours();
  const m = now.getMinutes();
  let next = prefs;
  let changed = false;

  if (
    prefs.dailyCheckIn.enabled &&
    prefs.lastDailyFireYmd !== ymd &&
    prefs.dailyCheckIn.hour === h &&
    prefs.dailyCheckIn.minute === m
  ) {
    try {
      new Notification("Check-in", {
        body: "When you have a moment, your guided check-in is here on this device.",
        tag: "dbt-daily",
      });
    } catch {
      /* ignore */
    }
    next = { ...next, lastDailyFireYmd: ymd };
    changed = true;
  }

  const weekKey = mondayContainingLocalDate(now);
  if (
    prefs.weeklyReview.enabled &&
    prefs.lastWeeklyFireKey !== weekKey &&
    now.getDay() === prefs.weeklyReview.weekday &&
    prefs.weeklyReview.hour === h &&
    prefs.weeklyReview.minute === m
  ) {
    try {
      new Notification("Weekly review", {
        body: "If it helps, open your weekly review when you feel up to it.",
        tag: "dbt-weekly",
      });
    } catch {
      /* ignore */
    }
    next = { ...next, lastWeeklyFireKey: weekKey };
    changed = true;
  }

  if (changed) onUpdate(next);
}
