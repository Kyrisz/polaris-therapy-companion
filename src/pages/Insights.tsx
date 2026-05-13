import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildInsights } from "../insights/buildInsights";
import { loadDiaryWeeks, loadJournal, loadMood, loadSpiral } from "../storage";

function BarRow({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="insight-bar-row">
      <div className="insight-bar-label">{label}</div>
      <div className="insight-bar-track" role="img" aria-label={`${label}: ${value}${suffix}`}>
        <div className="insight-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="insight-bar-val">
        {typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : value}
        {suffix}
      </div>
    </div>
  );
}

const KIND_LABELS: Record<string, string> = {
  freeform: "Freeform",
  emotion: "Emotion",
  situation: "Situation",
  scheduled_reflection: "Scheduled reflection",
  session_prep: "Session prep",
  session_debrief: "Session debrief",
};

export default function Insights() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onVis = () => setTick((t) => t + 1);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const data = useMemo(() => {
    void tick;
    return buildInsights(loadDiaryWeeks(), loadJournal(), loadMood(), loadSpiral());
  }, [tick]);

  const maxUsedSk = Math.max(1, ...data.usedSkillsBins.map((b) => b.count));
  const maxAct = Math.max(
    1,
    ...data.actionYesRate.map((a) => a.yes + a.no + a.unset)
  );
  const hasAnything =
    data.diaryRowCount > 0 ||
    data.journalEntryCount > 0 ||
    data.moodLogCount > 0 ||
    data.spiralCount > 0;

  return (
    <>
      <section className="card">
        <h2>Insights &amp; trends</h2>
        <p className="muted">
          Simple summaries from your <strong>diary rows</strong> (dated entries), <strong>mood logs</strong>,{" "}
          <strong>journal</strong>, and <strong>spiral</strong> entries—all stored on this device. Bring these
          views to therapy to talk about patterns, not as a diagnosis or scorecard.
        </p>
        <button type="button" className="btn secondary btn-compact" onClick={() => setTick((t) => t + 1)}>
          Refresh numbers
        </button>
      </section>

      {!hasAnything ? (
        <section className="card empty-state-card">
          <h3 className="dash-section-title">Nothing to chart yet</h3>
          <p className="muted">
            After a few guided check-ins, mood logs, or journal entries, you will see gentle summaries here.
          </p>
          <div className="empty-state-actions">
            <Link className="btn" to="/daily">
              Guided check-in
            </Link>
            <Link className="btn secondary" to="/mood">
              Log mood
            </Link>
            <Link className="btn secondary" to="/journal">
              Journal
            </Link>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h3 className="dash-section-title">Overview</h3>
        <ul className="insight-stat-list">
          <li>
            <strong>{data.diaryRowCount}</strong> dated diary rows across <strong>{data.uniqueDiaryDates}</strong>{" "}
            days
            {data.firstDiaryDate && data.lastDiaryDate ? (
              <span className="muted">
                {" "}
                ({data.firstDiaryDate} → {data.lastDiaryDate})
              </span>
            ) : null}
          </li>
          <li>
            <strong>{data.journalEntryCount}</strong> journal entries
          </li>
          <li>
            <strong>{data.moodLogCount}</strong> mood logs
            {data.moodAvgAll != null ? (
              <span className="muted"> · overall average mood {data.moodAvgAll.toFixed(1)} / 10</span>
            ) : null}
          </li>
          <li>
            <strong>{data.spiralCount}</strong> spiral logs
            {data.spiralAvgPeak != null ? (
              <span className="muted"> · avg peak intensity {data.spiralAvgPeak.toFixed(1)}</span>
            ) : null}
          </li>
        </ul>
      </section>

      {data.diaryRowCount > 0 ? (
        <>
          <section className="card">
            <h3 className="dash-section-title">Emotions (diary card scale)</h3>
            <p className="muted dash-lead">Average intensity 0–5 across all dated diary rows.</p>
            {data.emotionAverages
              .filter((e) => e.count > 0)
              .map((e) => (
                <BarRow key={e.id} label={e.label} value={e.avg} max={5} suffix={` · n=${e.count}`} />
              ))}
            {data.emotionAverages.every((e) => e.count === 0) ? (
              <p className="muted">Emotion bars will appear after you save a few dated diary rows with the 0–5 scale.</p>
            ) : null}
          </section>

          {data.urgeByTarget.length > 0 ? (
            <section className="card">
              <h3 className="dash-section-title">Urges by target behavior</h3>
              <p className="muted dash-lead">Average urge 0–5 per named target (merged if spelled the same).</p>
              {data.urgeByTarget.map((u) => (
                <BarRow
                  key={u.label}
                  label={u.label}
                  value={u.avgUrge}
                  max={5}
                  suffix={` · ${u.count} row${u.count === 1 ? "" : "s"}`}
                />
              ))}
            </section>
          ) : null}

          {data.actionYesRate.some((a) => a.yes + a.no + a.unset > 0) ? (
            <section className="card">
              <h3 className="dash-section-title">Actions on urges (Y / N / —)</h3>
              <p className="muted dash-lead">How often each target had Yes vs No vs unset, on dated rows.</p>
              {data.actionYesRate.map((a) => {
                const total = a.yes + a.no + a.unset;
                return (
                  <div key={a.label} className="insight-action-block">
                    <div className="insight-bar-label" style={{ marginBottom: "0.35rem" }}>
                      {a.label}{" "}
                      <span className="muted">
                        ({total} answer{total === 1 ? "" : "s"})
                      </span>
                    </div>
                    <BarRow label="Yes" value={a.yes} max={maxAct} />
                    <BarRow label="No" value={a.no} max={maxAct} />
                    <BarRow label="—" value={a.unset} max={maxAct} />
                  </div>
                );
              })}
            </section>
          ) : null}

          <section className="card">
            <h3 className="dash-section-title">“Used skills” code (0–7)</h3>
            <p className="muted dash-lead">How often each code was chosen on dated diary rows.</p>
            {data.usedSkillsBins.map((b) => (
              <BarRow key={b.value} label={`Code ${b.value}`} value={b.count} max={maxUsedSk} />
            ))}
          </section>
        </>
      ) : null}

      {data.moodRecent.length > 0 ? (
        <section className="card">
          <h3 className="dash-section-title">Recent mood (0–10)</h3>
          <p className="muted dash-lead">Oldest → newest for your last {data.moodRecent.length} logs.</p>
          <div className="insight-spark" role="list">
            {data.moodRecent.map((p) => (
              <div key={p.at} className="insight-spark-cell" role="listitem" title={`${p.date}: ${p.mood}`}>
                <div className="insight-spark-bar" style={{ height: `${(p.mood / 10) * 100}%` }} />
                <span className="insight-spark-num">{p.mood}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.journalEntryCount > 0 ? (
        <section className="card">
          <h3 className="dash-section-title">Journal entries by type</h3>
          <div className="insight-journal-kinds">
            {Object.entries(data.journalByKind).map(([k, n]) => (
              <div key={k} className="insight-kind-pill">
                <strong>{n}</strong> <span className="muted">{KIND_LABELS[k] ?? k}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        <h3 className="dash-section-title">Grow your picture</h3>
        <p className="muted dash-lead">
          More consistent logging makes trends easier to notice with your clinician—not to judge “good” or
          “bad” days.
        </p>
        <div className="dash-grid dash-grid-2">
          <Link className="dash-tile" to="/weekly">
            <span className="dash-tile-title">Weekly review</span>
            <span className="dash-tile-desc">Reflect in words, not only numbers</span>
          </Link>
          <Link className="dash-tile" to="/body">
            <span className="dash-tile-title">Body cues</span>
            <span className="dash-tile-desc">Link sensations to feelings</span>
          </Link>
        </div>
      </section>

      <p className="disclaimer" style={{ fontSize: "0.88rem", marginTop: "0.5rem" }}>
        This screen is educational self-tracking. It does not replace assessment or treatment by a licensed
        professional.
      </p>
    </>
  );
}
