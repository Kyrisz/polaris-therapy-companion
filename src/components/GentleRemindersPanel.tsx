import { useState } from "react";
import { Link } from "react-router-dom";
import {
  defaultGentleAppReminderPrefs,
  loadGentleAppReminderPrefs,
  saveGentleAppReminderPrefs,
} from "../storage";
import type { GentleAppReminderPrefs } from "../types";

const JS_WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function GentleRemindersPanel() {
  const [prefs, setPrefs] = useState<GentleAppReminderPrefs>(() => loadGentleAppReminderPrefs());
  const [permHint, setPermHint] = useState("");

  function persist(next: GentleAppReminderPrefs) {
    saveGentleAppReminderPrefs(next);
    setPrefs(next);
  }

  async function onMasterToggle(wantOn: boolean) {
    if (!wantOn) {
      setPermHint("");
      persist({ ...prefs, notificationsOn: false });
      return;
    }
    if (typeof Notification === "undefined") {
      setPermHint("This browser does not support notifications.");
      return;
    }
    const cur = Notification.permission;
    if (cur === "denied") {
      setPermHint("Notifications are blocked in browser settings. You can still use Journal reflection reminders.");
      return;
    }
    if (cur === "default") {
      const r = await Notification.requestPermission();
      if (r !== "granted") {
        setPermHint("Permission was not granted. Try again after allowing notifications for this site.");
        persist({ ...prefs, notificationsOn: false });
        return;
      }
    }
    setPermHint("");
    persist({ ...prefs, notificationsOn: true });
  }

  return (
    <section id="reminders" className="card tools-hub-block">
      <h3 className="tools-hub-h">Gentle reminders</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Optional browser notifications at times you pick. They may only appear when the browser allows (often while
        the tab was recently open)—they are not crisis alerts.{" "}
        <Link to="/journal">Journal → Reminders</Link> can still nudge you when you open the app.
      </p>

      <label className="field field-checkbox">
        <span className="field-checkbox-row">
          <input
            type="checkbox"
            checked={prefs.notificationsOn}
            onChange={(e) => void onMasterToggle(e.target.checked)}
          />
          <span>Turn on browser notifications for the times below</span>
        </span>
      </label>
      {permHint ? (
        <p className="gentle-reminder-hint" role="status">
          {permHint}
        </p>
      ) : null}

      <fieldset className="gentle-reminder-fieldset">
        <legend>Daily check-in nudge</legend>
        <label className="field field-checkbox">
          <span className="field-checkbox-row">
            <input
              type="checkbox"
              checked={prefs.dailyCheckIn.enabled}
              onChange={(e) =>
                persist({
                  ...prefs,
                  dailyCheckIn: { ...prefs.dailyCheckIn, enabled: e.target.checked },
                })
              }
            />
            <span>Enabled</span>
          </span>
        </label>
        <div className="grid-2">
          <label className="field">
            Hour (0–23)
            <input
              type="number"
              min={0}
              max={23}
              value={prefs.dailyCheckIn.hour}
              onChange={(e) =>
                persist({
                  ...prefs,
                  dailyCheckIn: {
                    ...prefs.dailyCheckIn,
                    hour: Math.min(23, Math.max(0, Number(e.target.value) || 0)),
                  },
                })
              }
            />
          </label>
          <label className="field">
            Minute (0–59)
            <input
              type="number"
              min={0}
              max={59}
              value={prefs.dailyCheckIn.minute}
              onChange={(e) =>
                persist({
                  ...prefs,
                  dailyCheckIn: {
                    ...prefs.dailyCheckIn,
                    minute: Math.min(59, Math.max(0, Number(e.target.value) || 0)),
                  },
                })
              }
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="gentle-reminder-fieldset">
        <legend>Weekly review nudge</legend>
        <label className="field field-checkbox">
          <span className="field-checkbox-row">
            <input
              type="checkbox"
              checked={prefs.weeklyReview.enabled}
              onChange={(e) =>
                persist({
                  ...prefs,
                  weeklyReview: { ...prefs.weeklyReview, enabled: e.target.checked },
                })
              }
            />
            <span>Enabled</span>
          </span>
        </label>
        <label className="field">
          Day
          <select
            value={prefs.weeklyReview.weekday}
            onChange={(e) =>
              persist({
                ...prefs,
                weeklyReview: { ...prefs.weeklyReview, weekday: Number(e.target.value) },
              })
            }
          >
            {JS_WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid-2">
          <label className="field">
            Hour (0–23)
            <input
              type="number"
              min={0}
              max={23}
              value={prefs.weeklyReview.hour}
              onChange={(e) =>
                persist({
                  ...prefs,
                  weeklyReview: {
                    ...prefs.weeklyReview,
                    hour: Math.min(23, Math.max(0, Number(e.target.value) || 0)),
                  },
                })
              }
            />
          </label>
          <label className="field">
            Minute (0–59)
            <input
              type="number"
              min={0}
              max={59}
              value={prefs.weeklyReview.minute}
              onChange={(e) =>
                persist({
                  ...prefs,
                  weeklyReview: {
                    ...prefs.weeklyReview,
                    minute: Math.min(59, Math.max(0, Number(e.target.value) || 0)),
                  },
                })
              }
            />
          </label>
        </div>
      </fieldset>

      <button
        type="button"
        className="btn secondary btn-compact"
        onClick={() => persist(defaultGentleAppReminderPrefs())}
      >
        Reset reminder schedule to defaults
      </button>
    </section>
  );
}
