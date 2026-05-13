import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { todayISO } from "../diary/diaryWeekModel";
import { PinnableDashTile, PinnablePrimaryAction } from "../components/PinnableDashTile";
import {
  dispatchPinsUpdated,
  labelForPinnedPath,
  loadPinnedToolsNormalized,
  MAX_PINNED_TOOLS,
  PIN_PATH_TODAY,
  removePinnedTool,
  resolvePinnedHref,
} from "../pinnedTools";
import { loadDaily, loadDiaryWeeks, loadDisplayName, loadJournal, loadStreak, saveDisplayName } from "../storage";
import { loadWizardDraft, wizardDraftHasProgress } from "../wizard/wizardDraftStorage";
import { BackupStatusLine } from "../components/BackupStatusLine";
import { CrisisSupportDialog } from "../components/CrisisSupportDialog";
import { SkillMomentStrip } from "../components/SkillMomentStrip";
import { WeeklyIntentionCard } from "../components/WeeklyIntentionCard";
import { PipMessage } from "../components/PipMessage";
import { PIP_HINTS } from "../pip/pipHints";
import { dismissPipHint, loadPipPrefs } from "../pip/pipStorage";

function daysBetweenYmd(older: string, newer: string): number {
  const a = new Date(older + "T12:00:00").getTime();
  const b = new Date(newer + "T12:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export default function Dashboard() {
  const weeks = loadDiaryWeeks();
  const lastWeek = weeks
    .slice()
    .sort((a, b) => (a.weekStartMonday < b.weekStartMonday ? 1 : a.weekStartMonday > b.weekStartMonday ? -1 : 0))[0];
  const legacyDaily = loadDaily();
  const legacyCount = legacyDaily.length;
  const streak = loadStreak();
  const [callMe, setCallMe] = useState(loadDisplayName);
  const [pinTick, setPinTick] = useState(0);
  const [pipTick, setPipTick] = useState(0);

  useEffect(() => {
    const fn = () => setPinTick((n) => n + 1);
    window.addEventListener("dbt-pins-updated", fn);
    return () => window.removeEventListener("dbt-pins-updated", fn);
  }, []);
  useEffect(() => {
    const fn = () => setPipTick((n) => n + 1);
    window.addEventListener("dbt-pip-prefs-updated", fn);
    return () => window.removeEventListener("dbt-pip-prefs-updated", fn);
  }, []);

  function saveName() {
    saveDisplayName(callMe);
  }

  const greetName = callMe.trim() || "friend";

  const journalGapDays = useMemo(() => {
    const j = loadJournal();
    if (!j.length) return null;
    const last = j.map((e) => e.entryDate).sort((a, b) => (a < b ? 1 : -1))[0];
    return daysBetweenYmd(last, todayISO());
  }, []);

  const wizardDraft = loadWizardDraft();
  const showWizardResume = Boolean(wizardDraft && wizardDraftHasProgress(wizardDraft));
  void pinTick;
  const pinned = loadPinnedToolsNormalized();
  void pipTick;
  const pip = loadPipPrefs();
  const dashHint = PIP_HINTS.find((h) => h.screen === "dashboard") || null;

  return (
    <>
      <section className="card dashboard-hero dashboard-hero--simple">
        <div className="dashboard-hero-top">
          <div>
            <h2 className="dashboard-hello brand-heading">Home</h2>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              Hi, <strong>{greetName}</strong>
              {streak.currentStreak > 0 ? (
                <>
                  {" "}
                  · <span className="streak-pill">{streak.currentStreak}-day check-in streak</span>
                </>
              ) : null}
            </p>
            <p className="muted dash-meta" style={{ margin: "0.5rem 0 0" }}>
              {lastWeek ? (
                <>
                  Diary week on this device starts <strong>{lastWeek.weekStartMonday}</strong> (Monday).
                </>
              ) : (
                <>No diary week yet—start a check-in when you are ready.</>
              )}
            </p>
          </div>
        </div>

        <div className="dashboard-primary-actions" role="group" aria-label="Main actions">
          <PinnablePrimaryAction to="/daily" title="Check-in" desc="Guided DBT diary card" />
          <PinnablePrimaryAction to="/journal" title="Journal" desc="Voice, photo, or text" />
          <PinnablePrimaryAction
            to={`/day/${todayISO()}`}
            pinPath={PIN_PATH_TODAY}
            title="Today"
            desc="Diary, mood, journal in one view"
          />
        </div>

        <WeeklyIntentionCard />
        {pip.enabled && dashHint && !pip.dismissedHintIds.includes(dashHint.id) ? (
          <PipMessage
            text={dashHint.text}
            action={dashHint.action}
            showIcon={false}
            onDismiss={() => {
              dismissPipHint(dashHint.id);
              setPinTick((n) => n + 1);
            }}
          />
        ) : null}

        <div className="card dashboard-crisis-card" aria-label="Crisis shortcuts">
          <p className="muted" style={{ margin: "0 0 0.65rem" }}>
            If things feel overwhelming, this opens your local toolkit or safety card—nothing is sent out.
          </p>
          <CrisisSupportDialog />
        </div>

        <SkillMomentStrip />

        <div className="card dashboard-backup-nudge" aria-label="Backup reminder">
          <BackupStatusLine />
        </div>

        <details className="dashboard-personalize">
          <summary>Display name (optional)</summary>
          <label className="field field-tight" style={{ marginTop: "0.65rem" }}>
            <div className="dashboard-name-row">
              <input
                type="text"
                value={callMe}
                onChange={(e) => setCallMe(e.target.value)}
                placeholder="What we call you"
                maxLength={40}
              />
              <button type="button" className="btn secondary btn-compact" onClick={saveName}>
                Save
              </button>
            </div>
          </label>
        </details>
      </section>

      {pinned.length > 0 ? (
        <section className="card dashboard-pinned-card" aria-labelledby="dashboard-pinned-heading">
          <h3 id="dashboard-pinned-heading" className="dash-section-title">
            Pinned
          </h3>
          <p className="muted dash-lead" style={{ marginTop: 0 }}>
            Same shortcuts appear under the main tabs. Tap a star on any tool tile to add or remove.
          </p>
          <ul className="dashboard-pinned-list">
            {pinned.map((p) => (
              <li key={p}>
                <Link to={resolvePinnedHref(p)}>{labelForPinnedPath(p)}</Link>
                <button
                  type="button"
                  className="pin-unpin-chip"
                  aria-label={`Unpin ${labelForPinnedPath(p)}`}
                  onClick={() => {
                    removePinnedTool(p);
                    dispatchPinsUpdated();
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="muted dashboard-pin-hint" style={{ textAlign: "center", fontSize: "0.88rem", margin: "0 0 0.75rem" }}>
          Pin favorites with the star on <Link to="/tools">Tools</Link> or below—up to {MAX_PINNED_TOOLS} show here
          and in the bar.
        </p>
      )}

      {showWizardResume && wizardDraft ? (
        <div className="card dashboard-resume-checkin">
          <p className="muted" style={{ marginTop: 0 }}>
            <strong>In progress:</strong> guided check-in for{" "}
            <strong>{wizardDraft.checkInDate}</strong> (step {wizardDraft.stepIndex + 1} saved on this device only).
          </p>
          <Link className="btn btn-compact" to="/daily">
            Continue check-in
          </Link>
        </div>
      ) : null}

      <section className="card dashboard-overview" aria-labelledby="dashboard-overview-heading">
        <h3 id="dashboard-overview-heading" className="dash-section-title">
          Overview
        </h3>
        <p className="muted dash-lead">
          Beyond the three shortcuts above, everything below is optional—pick what fits the moment. It all stays on
          this device.
        </p>
        <div className="dash-grid dash-grid-2 dashboard-overview-grid">
          <PinnableDashTile
            to="/therapy"
            title="Therapy companion"
            desc="Session prep, bring-to-therapy bundle, and unified search."
          />
          <PinnableDashTile
            to="/mood"
            title="Mood"
            desc="Quick emotional check-in when you want a number or a label."
          />
          <PinnableDashTile to="/weekly" title="Weekly review" desc="Reflect on the week using your diary card themes." />
          <PinnableDashTile
            to="/diary-sheet"
            title="Full diary sheet"
            desc="See the whole grid at once instead of step-by-step check-in."
          />
          <PinnableDashTile
            to="/insights"
            title="Insights"
            desc="Simple patterns from moods and targets you have logged."
          />
          <PinnableDashTile to="/timeline" title="Day timeline" desc="Scan recent weeks and jump to any day." />
          <PinnableDashTile
            to="/calendar"
            title="Month calendar"
            desc="Mood colours, diary dots, streak info—tap a day for the full view."
          />
        </div>

        <details className="dashboard-overview-more">
          <summary>More destinations…</summary>
          <div className="dash-grid dash-grid-2 dashboard-overview-grid">
            <PinnableDashTile
              to="/distress"
              title={"TIPP & opposite action"}
              desc="Short distress-tolerance checklist when you need it."
            />
            <PinnableDashTile
              to="/urge-timer"
              title="Urge timer"
              desc="Timed window to ride out an urge with an optional note."
            />
            <PinnableDashTile
              to="/safety"
              title="Safety card"
              desc="Contacts, grounding, and if-then lines you write once."
            />
            <PinnableDashTile to="/body" title="Body cues" desc="Notice sensations and get gentle feeling hints." />
            <PinnableDashTile to="/spiral" title="Spiral log" desc="Map a stuck or spiraling thought chain when it helps." />
            <PinnableDashTile to="/skills" title="Skills cheat sheet" desc="DBT skills from your card, for quick reference." />
            <PinnableDashTile
              to="/print/diary-week"
              title="Print diary week"
              desc="Printer-friendly week or Save as PDF for therapy."
            />
            <PinnableDashTile
              to="/print/month"
              title="Print month summary"
              desc="One calendar month as a table—print, PDF, or JSON export."
            />
            <PinnableDashTile
              to="/tools#data"
              title="Backup & restore"
              desc="Download JSON or merge a backup file from another browser."
            />
          </div>
        </details>
        <p className="muted dashboard-overview-foot">
          The same list lives under <Link to="/tools">Tools</Link> in the bar if you prefer one scrolling page.
        </p>
      </section>

      {journalGapDays !== null && journalGapDays >= 3 ? (
        <div className="card dashboard-soft-nudge">
          <p className="muted" style={{ margin: 0 }}>
            It&apos;s been <strong>{journalGapDays}</strong> days since a journal entry—only if you want to, add a
            line in{" "}
            <Link to={`/journal?entryDate=${encodeURIComponent(todayISO())}`}>Journal</Link> or a memory line on{" "}
            <Link to={`/day/${todayISO()}`}>Today</Link>.
          </p>
        </div>
      ) : null}

      {legacyCount > 0 ? (
        <p className="muted card" style={{ padding: "0.85rem 1rem", marginBottom: "0.5rem" }}>
          You have <strong>{legacyCount}</strong> older simplified daily entries in this browser from an earlier
          version.
        </p>
      ) : null}

      <details className="card dash-details">
        <summary>About &amp; privacy</summary>
        <p className="muted">
          This app matches printed DBT diary cards. Data stays on this device. Backups and import live under{" "}
          <Link to="/tools#data">
            <strong>Tools → Your data</strong>
          </Link>
          . Not a substitute for therapy or crisis care. You can revisit the{" "}
          <Link to="/setup">first-time setup wizard</Link> whenever you like.
        </p>
        <p className="disclaimer" style={{ marginTop: "0.75rem" }}>
          If you are in crisis, use your safety plan or contact local emergency services or a crisis line you trust.
        </p>
      </details>

      <p className="muted" style={{ textAlign: "center", fontSize: "0.85rem", marginTop: "1rem" }}>
        <Link to="/">Opening greeting &amp; entry choices</Link>
      </p>
    </>
  );
}
