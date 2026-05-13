import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PIN_PATH_TODAY, ensurePinnedTool } from "../pinnedTools";
import {
  addDefaultJournalReflectionReminderFromSetup,
  enableGentleBrowserRemindersFromSetup,
} from "../setup/setupWizardOptional";
import {
  completeSetupWizard,
  loadSetupWizardStatus,
  resetSetupWizardProgress,
  safetyPlanHasMeaningfulContent,
  skipSetupWizard,
  stashSetupWizardStep,
  takeSetupWizardResumeStep,
} from "../setup/setupWizardStorage";
import { loadGentleAppReminderPrefs, loadSafetyPlan, loadDisplayName, saveDisplayName } from "../storage";

const STEP_LABELS = ["Welcome", "Name", "Safety", "Shortcuts & nudges", "Backup", "Done"];

export default function SetupWizard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(loadSetupWizardStatus);
  const [step, setStep] = useState(0);
  const [callMe, setCallMe] = useState(loadDisplayName);
  const [tick, setTick] = useState(0);
  const [pinToday, setPinToday] = useState(true);
  const [pinCheckIn, setPinCheckIn] = useState(true);
  const [addJournalReminder, setAddJournalReminder] = useState(true);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifHint, setNotifHint] = useState<string | null>(null);
  const [notifTick, setNotifTick] = useState(0);

  const gentleOn = useMemo(() => {
    void notifTick;
    return loadGentleAppReminderPrefs().notificationsOn;
  }, [notifTick]);

  const notifPermission = useMemo(() => {
    void notifTick;
    return typeof Notification !== "undefined" ? Notification.permission : "unsupported";
  }, [notifTick]);
  useEffect(() => {
    const resumed = takeSetupWizardResumeStep();
    if (resumed != null) setStep(Math.max(0, Math.min(STEP_LABELS.length - 1, resumed)));
  }, []);

  const safetyFilled = useMemo(() => safetyPlanHasMeaningfulContent(loadSafetyPlan()), [tick]);

  function bump() {
    setTick((n) => n + 1);
  }

  async function onEnableBrowserReminders() {
    setNotifHint(null);
    setNotifBusy(true);
    try {
      const r = await enableGentleBrowserRemindersFromSetup();
      if (r.ok) {
        setNotifHint(null);
      } else if (r.reason === "unsupported") {
        setNotifHint("This browser does not support notifications here.");
      } else if (r.reason === "denied") {
        setNotifHint(
          "Notifications are blocked in browser settings. Journal reminders still work when you open the app."
        );
      } else {
        setNotifHint("Permission was not granted. You can try again from Tools → Gentle reminders.");
      }
    } finally {
      setNotifBusy(false);
      setNotifTick((n) => n + 1);
    }
  }

  function onContinueFromStep3() {
    if (pinToday) ensurePinnedTool(PIN_PATH_TODAY);
    if (pinCheckIn) ensurePinnedTool("/daily");
    if (addJournalReminder) addDefaultJournalReflectionReminderFromSetup();
    try {
      window.dispatchEvent(new Event("dbt-pins-updated"));
    } catch {
      /* ignore */
    }
    setStep(4);
  }

  function goHome() {
    navigate("/dashboard", { replace: true });
  }

  function onSkipEntire() {
    skipSetupWizard();
    setStatus("skipped");
    goHome();
  }

  function onFinish() {
    completeSetupWizard();
    setStatus("completed");
    goHome();
  }

  function onRunAgain() {
    resetSetupWizardProgress();
    setStatus("pending");
    setStep(0);
    setCallMe(loadDisplayName());
  }

  if (status === "completed" || status === "skipped") {
    return (
      <div className="setup-wizard-page">
        <section className="card">
          <h2>Setup wizard</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {status === "completed"
              ? "You have already finished the first-time walkthrough on this device."
              : "You chose to skip the guided setup earlier. You can run through it anytime—nothing is deleted."}
          </p>
          <div className="setup-wizard-actions">
            <button type="button" className="btn" onClick={onRunAgain}>
              Run setup wizard again
            </button>
            <Link className="btn secondary" to="/dashboard">
              Go to Home
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const total = STEP_LABELS.length;
  const pct = ((step + 1) / total) * 100;

  return (
    <div className="setup-wizard-page">
      <section className="card setup-wizard-head">
        <p className="setup-wizard-kicker">First-time setup</p>
        <h2>Get comfortable with this space</h2>
        <div className="setup-wizard-progress" aria-hidden="true">
          <div className="setup-wizard-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="muted setup-wizard-step-label">
          Step {step + 1} of {total}: {STEP_LABELS[step]}
        </p>
      </section>

      {step === 0 ? (
        <section className="card setup-wizard-step">
          <h3 className="setup-wizard-question">Welcome</h3>
          <p className="muted">
            In a few short steps we will save how you would like to be named, point you to your private safety card,
            offer optional reminders and Home shortcuts, and show where backups live. Everything stays on this device
            unless you export it.
          </p>
          <p className="muted">
            If you are in crisis right now, use emergency services or a crisis line you trust—this flow is not urgent
            care.
          </p>
          <div className="setup-wizard-actions">
            <button type="button" className="btn" onClick={() => setStep(1)}>
              Begin
            </button>
            <button type="button" className="btn secondary" onClick={onSkipEntire}>
              Skip setup for now
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="card setup-wizard-step">
          <h3 className="setup-wizard-question">What should we call you?</h3>
          <p className="muted">Optional. Used in greetings on Home and the start screen.</p>
          <label className="field">
            Display name
            <input
              type="text"
              value={callMe}
              onChange={(e) => setCallMe(e.target.value)}
              placeholder="First name or nickname"
              maxLength={40}
            />
          </label>
          <div className="setup-wizard-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                saveDisplayName(callMe);
                setStep(2);
              }}
            >
              Save &amp; continue
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                saveDisplayName(callMe);
                setStep(2);
              }}
            >
              Skip name
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="card setup-wizard-step">
          <h3 className="setup-wizard-question">Safety &amp; crisis card</h3>
          <p className="muted">
            A short card for people you trust, numbers that help, and grounding that has worked before. You can change
            it anytime. For intense moments there is also the{" "}
            <Link to="/distress">TIPP toolkit</Link> on this device.
          </p>
          {safetyFilled ? (
            <p className="setup-wizard-success" role="status">
              Looks like your safety card has something saved—nice work.
            </p>
          ) : (
            <p className="muted">Nothing saved yet in the safety card fields.</p>
          )}
          <div className="setup-wizard-actions setup-wizard-actions--stack">
            <Link
              className="btn"
              to="/safety?from=setup"
              onClick={() => stashSetupWizardStep(2)}
            >
              Open safety card to fill in
            </Link>
            <button type="button" className="btn secondary" onClick={() => setStep(3)}>
              Continue
            </button>
            <button type="button" className="link-button" onClick={bump}>
              I just saved—refresh check
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="card setup-wizard-step">
          <h3 className="setup-wizard-question">Shortcuts &amp; nudges</h3>
          <p className="muted">
            Pick what helps you. You can change all of this later under <strong>Home</strong>, <strong>Journal</strong>,
            and <strong>Tools</strong>.
          </p>

          <div className="setup-wizard-block">
            <h4 className="setup-wizard-subh">Browser reminders</h4>
            <p className="muted">
              Optional notifications for daily check-in and weekly review (times you set in Tools). Not for emergencies.
            </p>
            {notifPermission === "unsupported" ? (
              <p className="muted">This environment does not expose browser notifications.</p>
            ) : notifPermission === "denied" ? (
              <p className="muted">
                Notifications are blocked in this browser. You can still use Journal reminders when you open the app,
                or change site settings and try again from Tools.
              </p>
            ) : gentleOn && notifPermission === "granted" ? (
              <p className="setup-wizard-success" role="status">
                Gentle browser reminders are on. Adjust times anytime in Tools.
              </p>
            ) : (
              <button
                type="button"
                className="btn secondary"
                disabled={notifBusy}
                onClick={() => void onEnableBrowserReminders()}
              >
                {notifBusy
                  ? notifPermission === "default"
                    ? "Asking browser…"
                    : "Working…"
                  : notifPermission === "granted"
                    ? "Turn on gentle reminders in this app"
                    : "Allow browser reminders"}
              </button>
            )}
            {notifHint ? (
              <p className="gentle-reminder-hint" role="status">
                {notifHint}
              </p>
            ) : null}
            <p className="muted setup-wizard-tight-top">
              <Link to="/tools#reminders" onClick={() => stashSetupWizardStep(3)}>
                Fine-tune reminder times
              </Link>
            </p>
          </div>

          <div className="setup-wizard-block">
            <h4 className="setup-wizard-subh">Pin on Home &amp; under tabs</h4>
            <p className="muted">Pinned tools appear on Home and in the strip below the main tabs.</p>
            <label className="field field-checkbox">
              <span className="field-checkbox-row">
                <input type="checkbox" checked={pinToday} onChange={(e) => setPinToday(e.target.checked)} />
                <span>
                  Pin <strong>Today</strong> (day view)
                </span>
              </span>
            </label>
            <label className="field field-checkbox">
              <span className="field-checkbox-row">
                <input type="checkbox" checked={pinCheckIn} onChange={(e) => setPinCheckIn(e.target.checked)} />
                <span>
                  Pin <strong>Check-in</strong>
                </span>
              </span>
            </label>
          </div>

          <div className="setup-wizard-block">
            <h4 className="setup-wizard-subh">Journal reflection</h4>
            <p className="muted">
              Journal can nudge you after 9:00 PM local time when you open the app—useful for a short evening line.
            </p>
            <label className="field field-checkbox">
              <span className="field-checkbox-row">
                <input
                  type="checkbox"
                  checked={addJournalReminder}
                  onChange={(e) => setAddJournalReminder(e.target.checked)}
                />
                <span>Add a daily 9:00 PM &quot;Evening reflection&quot; reminder in Journal</span>
              </span>
            </label>
          </div>

          <div className="setup-wizard-actions setup-wizard-actions--stack">
            <button type="button" className="btn" onClick={onContinueFromStep3}>
              Continue
            </button>
          </div>
        </section>
      ) : null}
      {step === 4 ? (
        <section className="card setup-wizard-step">
          <h3 className="setup-wizard-question">Backups</h3>
          <p className="muted">
            This app keeps data in your browser. Occasionally download a JSON copy so you do not lose progress if you
            clear storage or change devices.
          </p>
          <div className="setup-wizard-actions setup-wizard-actions--stack">
            <Link className="btn secondary" to="/tools#data" onClick={() => stashSetupWizardStep(4)}>
              Open backup &amp; restore
            </Link>
            <button type="button" className="btn" onClick={() => setStep(5)}>
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="card setup-wizard-step">
          <h3 className="setup-wizard-question">You are set</h3>
          <p className="muted">
            From <strong>Home</strong> you can start a check-in, journal, or open <strong>Today</strong>. If you pinned
            shortcuts or added a journal reminder, you will see them there. Use <strong>Tools</strong> for everything
            else—including more pins with the star.
          </p>          <div className="setup-wizard-actions">
            <button type="button" className="btn" onClick={onFinish}>
              Go to Home
            </button>
          </div>
        </section>
      ) : null}

      {step > 0 && step < 5 ? (
        <p className="muted setup-wizard-back-row">
          <button type="button" className="link-button" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ← Previous step
          </button>
        </p>
      ) : null}
    </div>
  );
}
