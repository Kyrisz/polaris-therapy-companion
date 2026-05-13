import {
  loadGentleAppReminderPrefs,
  loadJournalReminders,
  saveGentleAppReminderPrefs,
  saveJournalReminders,
  uid,
} from "../storage";

export type EnableGentleNotificationsResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "not_granted" };

/**
 * Requests browser permission (if needed) and turns on gentle app reminders at current schedule in prefs.
 */
export async function enableGentleBrowserRemindersFromSetup(): Promise<EnableGentleNotificationsResult> {
  if (typeof Notification === "undefined") {
    return { ok: false, reason: "unsupported" };
  }
  const cur = Notification.permission;
  if (cur === "denied") {
    return { ok: false, reason: "denied" };
  }
  if (cur === "default") {
    const r = await Notification.requestPermission();
    if (r !== "granted") {
      return { ok: false, reason: "not_granted" };
    }
  }
  const prefs = loadGentleAppReminderPrefs();
  saveGentleAppReminderPrefs({ ...prefs, notificationsOn: true });
  return { ok: true };
}

const SETUP_JOURNAL_REMINDER_LABEL = "Evening reflection";

/** Idempotent: adds default 21:00 daily journal reminder if user opted in and an equivalent is not already present. */
export function addDefaultJournalReflectionReminderFromSetup(): void {
  const list = loadJournalReminders();
  const dup = list.some(
    (r) =>
      r.label.trim() === SETUP_JOURNAL_REMINDER_LABEL &&
      r.hour === 21 &&
      r.minute === 0 &&
      r.weekdays.length === 0
  );
  if (dup) return;
  list.push({
    id: uid(),
    label: SETUP_JOURNAL_REMINDER_LABEL,
    hour: 21,
    minute: 0,
    weekdays: [],
    enabled: true,
  });
  saveJournalReminders(list);
}
