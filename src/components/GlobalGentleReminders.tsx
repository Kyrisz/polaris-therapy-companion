import { useEffect } from "react";
import { loadGentleAppReminderPrefs, saveGentleAppReminderPrefs } from "../storage";
import { tickGentleReminders } from "../reminders/gentleReminderTick";

/** Runs gentle notification ticks while the app is open (see Tools → Gentle reminders). */
export function GlobalGentleReminders() {
  useEffect(() => {
    function run() {
      const p = loadGentleAppReminderPrefs();
      tickGentleReminders(new Date(), p, (next) => saveGentleAppReminderPrefs(next));
    }
    run();
    const id = window.setInterval(run, 30_000);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);
  return null;
}
