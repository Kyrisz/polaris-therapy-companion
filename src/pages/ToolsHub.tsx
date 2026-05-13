import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BackupImportPanel } from "../components/BackupImportPanel";
import { BackupStatusLine } from "../components/BackupStatusLine";
import { GentleRemindersPanel } from "../components/GentleRemindersPanel";
import { PinnableDashTile } from "../components/PinnableDashTile";
import { PinToggle } from "../components/PinToggle";
import { downloadBackupJson } from "../export/backupExport";
import { clearAllAppData, loadLargeTextEnabled, setLargeTextEnabled } from "../storage";
import { loadPipPrefs, setPipEnabled } from "../pip/pipStorage";
import { APP_VERSION } from "../version";

/**
 * Secondary routes in one place so the main nav stays short.
 */
export default function ToolsHub() {
  const location = useLocation();
  const [largeTextOn, setLargeTextOn] = useState(() => loadLargeTextEnabled());
  const [pipOn, setPipOn] = useState(() => loadPipPrefs().enabled);
  const [betaMsg, setBetaMsg] = useState("");

  const feedbackTemplate = useMemo(() => {
    const now = new Date().toLocaleString();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    return [
      "Polaris beta feedback",
      "",
      `Version: ${APP_VERSION}`,
      `When: ${now}`,
      `Page: ${path}`,
      `Browser: ${ua}`,
      "",
      "What I expected:",
      "",
      "What happened instead:",
      "",
      "Steps to reproduce (if you can):",
      "",
    ].join("\n");
  }, []);

  useEffect(() => {
    setLargeTextOn(loadLargeTextEnabled());
  }, []);

  useEffect(() => {
    const sync = () => setPipOn(loadPipPrefs().enabled);
    sync();
    window.addEventListener("dbt-pip-prefs-updated", sync);
    return () => window.removeEventListener("dbt-pip-prefs-updated", sync);
  }, []);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash) return;
    const id = window.setTimeout(() => {
      const el = document.getElementById(hash);
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.hash]);

  return (
    <div className="tools-hub-page">
      <section className="card">
        <h2 className="brand-heading">More tools</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Use the bar for <strong>Home</strong>, <strong>Check-in</strong>, <strong>Journal</strong>, and{" "}
          <strong>Today</strong>. Tap the <strong>star</strong> on a tile to pin it—pinned tools show on Home and
          under the main tabs. New here? Try the{" "}
          <Link to="/setup">
            <strong>first-time setup wizard</strong>
          </Link>{" "}
          any time.
        </p>
      </section>

      <section id="log" className="card tools-hub-block">
        <h3 className="tools-hub-h">Log &amp; mood</h3>
        <div className="tools-hub-grid">
          <PinnableDashTile to="/mood" title="Mood" desc="Quick emotional check-in" />
          <PinnableDashTile to="/calendar" title="Month calendar" desc="Mood colours and diary days in a grid" />
        </div>
      </section>

      <section id="distress" className="card tools-hub-block">
        <h3 className="tools-hub-h">Distress &amp; safety</h3>
        <div className="tools-hub-grid">
          <PinnableDashTile
            to="/distress"
            title={"TIPP & opposite action"}
            desc="Short checklist when emotions run high"
          />
          <PinnableDashTile to="/urge-timer" title="Urge timer" desc="Label an urge and sit with a timed window" />
          <PinnableDashTile to="/safety" title="Safety card" desc="Contacts, grounding, and if-then notes (local only)" />
        </div>
      </section>

      <section id="therapy" className="card tools-hub-block">
        <h3 className="tools-hub-h">Therapy companion</h3>
        <div className="tools-hub-grid">
          <PinnableDashTile to="/therapy" title="Therapy hub" desc="Session notes, bundle/print, unified search—local only." />
        </div>
      </section>

      <section id="diary" className="card tools-hub-block">
        <h3 className="tools-hub-h">Diary card</h3>
        <div className="tools-hub-grid">
          <PinnableDashTile to="/diary-sheet" title="Full sheet" desc="Whole grid at once" />
          <PinnableDashTile to="/weekly" title="Weekly review" desc="Reflect on the week" />
          <PinnableDashTile to="/timeline" title="Day timeline" desc="Last several weeks" />
          <PinnableDashTile to="/insights" title="Insights" desc="Gentle trends from your logs" />
          <PinnableDashTile to="/print/diary-week" title="Print week" desc="Printer-friendly diary week or PDF" />
          <PinnableDashTile
            to="/print/month"
            title="Print month"
            desc="Day-by-day summary for one month—print, PDF, or JSON"
          />
        </div>
      </section>

      <section id="body" className="card tools-hub-block">
        <h3 className="tools-hub-h">Body &amp; spirals</h3>
        <div className="tools-hub-grid">
          <PinnableDashTile to="/body" title="Body cues" desc="Sensation → feeling hints" />
          <PinnableDashTile to="/spiral" title="Spiral log" desc="Map a thought spiral" />
        </div>
      </section>

      <section id="reference" className="card tools-hub-block">
        <h3 className="tools-hub-h">Reference</h3>
        <div className="tools-hub-grid">
          <PinnableDashTile to="/skills" title="Skills cheat sheet" desc="From your diary card" />
        </div>
      </section>

      <GentleRemindersPanel />

      <section id="comfort" className="card tools-hub-block">
        <h3 className="tools-hub-h">Comfort &amp; display</h3>
        <label className="field tools-hub-a11y-toggle" style={{ marginTop: 0 }}>
          <span className="tools-hub-a11y-label">
            <input
              type="checkbox"
              checked={largeTextOn}
              onChange={(e) => {
                const on = e.target.checked;
                setLargeTextOn(on);
                setLargeTextEnabled(on);
              }}
            />
            Larger text on this device
          </span>
          <span className="muted" style={{ display: "block", marginTop: "0.35rem", fontSize: "0.88rem" }}>
            Slightly bumps base size and calendar cell padding. You can turn it off anytime.
          </span>
        </label>

        <label className="field tools-hub-a11y-toggle" style={{ marginTop: "0.75rem" }}>
          <span className="tools-hub-a11y-label">
            <input
              type="checkbox"
              checked={pipOn}
              onChange={(e) => {
                const on = e.target.checked;
                setPipOn(on);
                setPipEnabled(on);
              }}
            />
            Show Pip hints
          </span>
          <span className="muted" style={{ display: "block", marginTop: "0.35rem", fontSize: "0.88rem" }}>
            Pip is a small companion that offers optional prompts. Turn off any time.
          </span>
        </label>
      </section>

      <section id="data" className="card tools-hub-block">
        <h3 className="tools-hub-h">Your data</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Everything stays on this device. Save a copy occasionally if you switch browsers or clear storage.
        </p>
        <h4 className="tools-hub-subh">What each export does</h4>
        <ul className="muted tools-hub-data-clarity" style={{ marginTop: "0.35rem", paddingLeft: "1.2rem" }}>
          <li>
            <strong>JSON backup</strong> — full snapshot of diary, journal, moods, reviews, and preferences for restore
            or moving browsers.
          </li>
          <li>
            <strong>Print week</strong> — diary card layout for one week; use the browser&apos;s print or Save as PDF.
          </li>
          <li>
            <strong>Print month</strong> — day-by-day table for a single calendar month, plus optional JSON for that
            month only (not a full backup).
          </li>
          <li>
            <strong>Therapy bundle</strong> — under <Link to="/therapy?tab=bring">Therapy → Bring</Link>, build a
            markdown summary from reviews, journal titles, moods, and more to copy or save as a file.
          </li>
        </ul>
        <BackupStatusLine compact />
        <div className="tools-hub-data-actions">
          <button type="button" className="btn secondary" onClick={() => downloadBackupJson()}>
            Download JSON backup
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              const ok1 = window.confirm(
                "Clear all Polaris data on this device? This cannot be undone unless you have a JSON backup."
              );
              if (!ok1) return;
              const ok2 = window.confirm("Last check: clear everything (journal, check-ins, mood, settings)?");
              if (!ok2) return;
              clearAllAppData();
              window.location.assign("/");
            }}
          >
            Clear local data (beta)
          </button>
        </div>
        <div className="pinnable-dash-tile-wrap tools-hub-backup-tile" style={{ marginTop: "0.75rem" }}>
          <Link className="dash-tile" to="/tools#data">
            <span className="dash-tile-title">Backup &amp; restore</span>
            <span className="dash-tile-desc">Jump here for import; pin with the star for quick access from Home.</span>
          </Link>
          <PinToggle path="/tools#data" variant="corner" />
        </div>
        <h4 className="tools-hub-subh">Restore from backup</h4>
        <p className="muted" style={{ marginTop: "0.35rem" }}>
          Pick a file you exported earlier. Preview counts, then choose merge or replace.
        </p>
        <BackupImportPanel />
      </section>

      <section id="beta" className="card tools-hub-block">
        <h3 className="tools-hub-h">Beta</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Version <strong>{APP_VERSION}</strong>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              void navigator.clipboard.writeText(feedbackTemplate);
              setBetaMsg("Copied feedback template.");
              window.setTimeout(() => setBetaMsg(""), 2200);
            }}
          >
            Copy feedback template
          </button>
        </div>
        {betaMsg ? (
          <p className="wizard-saved" role="status" aria-live="polite">
            {betaMsg}
          </p>
        ) : null}
      </section>

      <p className="muted" style={{ textAlign: "center", fontSize: "0.85rem", marginTop: "0.5rem" }}>
        <Link to="/dashboard">← Back to Home</Link>
      </p>
    </div>
  );
}
