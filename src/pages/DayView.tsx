import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import diaryCard from "../../data/diary-card.json";
import { addCalendarDaysLocal, mondayOfWeekContaining, todayISO, WEEKDAY_LABEL } from "../diary/diaryWeekModel";
import { buildDaySummary } from "../journal/daySummary";
import { getDaySnapshot, daySnapshotHasActivity } from "../journal/daySnapshot";
import { speakJournalText, stopSpeaking } from "../journal/voiceOcr";
import type { WeekdayId } from "../types";
import { loadDayTagline, loadWeeklyIntention, saveDayTagline } from "../storage";

const card = diaryCard as typeof diaryCard;

function validYMD(s: string | undefined): s is string {
  return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}

export default function DayView() {
  const { date: dateParam } = useParams();
  const navigate = useNavigate();
  const date = validYMD(dateParam) ? dateParam : todayISO();

  useEffect(() => {
    if (!validYMD(dateParam)) navigate(`/day/${todayISO()}`, { replace: true });
  }, [dateParam, navigate]);

  const [tagDraft, setTagDraft] = useState("");
  const [summary, setSummary] = useState("");
  const [tick, setTick] = useState(0);

  const snap = useMemo(() => {
    void tick;
    return getDaySnapshot(date);
  }, [date, tick]);

  useEffect(() => {
    setTagDraft(loadDayTagline(date));
  }, [date]);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    window.addEventListener("dbt-weekly-intention-updated", fn);
    return () => window.removeEventListener("dbt-weekly-intention-updated", fn);
  }, []);

  const wd = snap.weekday as WeekdayId;
  const row = snap.row;

  function saveTagline() {
    saveDayTagline(date, tagDraft);
    setTick((t) => t + 1);
  }

  function readMyDay() {
    stopSpeaking();
    const base = buildDaySummary(date);
    const titles = snap.journals
      .map((j) => j.title.trim())
      .filter(Boolean)
      .join(". ");
    const extra = titles ? ` Journal entry titles: ${titles}.` : "";
    speakJournalText("", `${base}${extra}`);
  }

  const prev = addCalendarDaysLocal(date, -1);
  const next = addCalendarDaysLocal(date, 1);
  const weekMon = mondayOfWeekContaining(date);
  const intention = loadWeeklyIntention();
  const showIntention =
    intention &&
    intention.weekStartMonday === weekMon &&
    (intention.text.trim() || intention.skillTag.trim());

  return (
    <div className="day-view-page">
      <section className="card day-view-head">
        <div className="day-view-head-row">
          <div>
            <h2 className="brand-heading">Your day</h2>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              {WEEKDAY_LABEL[wd]}, <strong>{date}</strong>
            </p>
          </div>
          <div className="day-view-nav-arrows">
            <Link className="btn secondary btn-compact" to={`/day/${prev}`}>
              ← Prev
            </Link>
            <Link className="btn secondary btn-compact" to={`/day/${next}`}>
              Next →
            </Link>
          </div>
        </div>
        <div className="day-view-quick-links">
          <Link className="btn btn-compact" to="/daily">
            Check-in
          </Link>
          <Link className="btn secondary btn-compact" to={`/journal?entryDate=${encodeURIComponent(date)}`}>
            Journal
          </Link>
          <Link className="btn secondary btn-compact" to="/tools">
            More tools
          </Link>
        </div>
      </section>

      {showIntention ? (
        <section className="card day-view-weekly-intention" aria-label="This week's intention">
          <h3 className="day-view-section-title">This week I&apos;m practicing</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {intention!.text.trim() ? <>{intention!.text.trim()}</> : null}
            {intention!.text.trim() && intention!.skillTag.trim() ? <> · </> : null}
            {intention!.skillTag.trim() ? <em>{intention!.skillTag.trim()}</em> : null}
          </p>
          {date !== todayISO() ? (
            <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 0 }}>
              Same gentle focus shows on each day this week. Edit on <Link to="/dashboard">Home</Link>.
            </p>
          ) : (
            <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 0 }}>
              Edit anytime on <Link to="/dashboard">Home</Link>.
            </p>
          )}
        </section>
      ) : null}

      <section className="card">
        <h3 className="day-view-section-title">Memory line</h3>
        <p className="muted">
          A few words so future-you remembers this calendar day (shows in your end-of-day summary too).
        </p>
        <label className="field">
          Three words, or one short sentence
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            maxLength={200}
            placeholder="e.g. First day back · tired but kind"
          />
        </label>
        <button type="button" className="btn secondary btn-compact" onClick={saveTagline}>
          Save memory line
        </button>
      </section>

      <section className="card">
        <h3 className="day-view-section-title">End-of-day summary</h3>
        <p className="muted">Everything below is combined from this device only.</p>
        <div className="day-view-summary-actions">
          <button type="button" className="btn" onClick={() => setSummary(buildDaySummary(date))}>
            Generate / refresh
          </button>
          <button type="button" className="btn secondary btn-compact" onClick={readMyDay}>
            Read my day aloud
          </button>
          <button type="button" className="btn secondary btn-compact" onClick={() => stopSpeaking()}>
            Stop reading
          </button>
          {summary ? (
            <button
              type="button"
              className="btn secondary btn-compact"
              onClick={() => void navigator.clipboard.writeText(summary)}
            >
              Copy
            </button>
          ) : null}
        </div>
        {summary ? <pre className="journal-summary-out">{summary}</pre> : (
          <p className="muted">Generate to see diary, moods, spirals, journal, and memory line in one place.</p>
        )}
      </section>

      <section className="card">
        <h3 className="day-view-section-title">DBT diary row</h3>
        {!row || row.rowDate !== date ? (
          <p className="muted">No dated diary row for this day yet.</p>
        ) : (
          <>
            {row.prompt.trim() ? (
              <p>
                <strong>Prompting event:</strong> {row.prompt.trim()}
              </p>
            ) : (
              <p className="muted">Prompting event line is empty.</p>
            )}
            <p className="muted" style={{ marginTop: "0.5rem" }}>
              <strong>Used skills (0–7):</strong> {row.usedSkills}
            </p>
            <ul className="muted" style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
              {card.emotionColumns.map((c) => (
                <li key={c.id}>
                  {c.label}: {row.emotions[c.id] ?? 0}/5
                </li>
              ))}
            </ul>
          </>
        )}
        {snap.weekdayOtherNote ? (
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Other note ({WEEKDAY_LABEL[wd]}):</strong> {snap.weekdayOtherNote}
          </p>
        ) : null}
      </section>

      <section className="card">
        <h3 className="day-view-section-title">Mood ({snap.moods.length})</h3>
        {!snap.moods.length ? (
          <p className="muted">No mood logs this day.</p>
        ) : (
          <ul className="simple-list">
            {snap.moods.map((m) => (
              <li key={m.id} className="day-view-li">
                <strong>{new Date(m.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</strong>{" "}
                — mood {m.mood}/10
                {m.emotions.length ? <span className="muted"> — {m.emotions.join(", ")}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="day-view-section-title">Spirals ({snap.spirals.length})</h3>
        {!snap.spirals.length ? (
          <p className="muted">No spiral logs this day.</p>
        ) : (
          <ul className="simple-list">
            {snap.spirals.map((s) => (
              <li key={s.id} className="day-view-li">
                Peak {s.peakIntensity}/10 · {(s.stages.trigger || "").slice(0, 140)}
                {(s.stages.trigger || "").length > 140 ? "…" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="day-view-section-title">Journal ({snap.journals.length})</h3>
        {!snap.journals.length ? (
          <p className="muted">
            No journal entries for this date.{" "}
            <Link to={`/journal?entryDate=${encodeURIComponent(date)}`}>Write one</Link>.
          </p>
        ) : (
          <ul className="simple-list">
            {snap.journals.map((j) => (
              <li key={j.id} className="day-view-li">
                <strong>{j.title.trim() || "Entry"}</strong>
                <p className="muted" style={{ margin: "0.2rem 0 0", fontSize: "0.82rem" }}>
                  {new Date(j.createdAt).toLocaleString()}
                </p>
                <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>{j.body}</p>
                {j.photoDataUrl ? (
                  <img className="day-view-thumb" src={j.photoDataUrl} alt="" loading="lazy" />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!daySnapshotHasActivity(snap) ? (
        <p className="muted card" style={{ padding: "0.85rem 1rem" }}>
          Nothing logged for this day yet—use the buttons above to add a check-in, mood, journal, or spiral when
          you are ready.
        </p>
      ) : null}
    </div>
  );
}
