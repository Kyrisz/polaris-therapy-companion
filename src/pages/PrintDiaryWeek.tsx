import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import diaryCard from "../../data/diary-card.json";
import { WEEKDAY_LABEL } from "../diary/diaryWeekModel";
import type { DiaryWeekEntry, WeekdayId } from "../types";
import { loadDiaryWeeks } from "../storage";

const card = diaryCard as typeof diaryCard;
const WD_ORDER: WeekdayId[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function PrintDiaryWeek() {
  const weeks = useMemo(() => {
    const w = loadDiaryWeeks();
    return w.slice().sort((a, b) => (a.weekStartMonday < b.weekStartMonday ? 1 : -1));
  }, []);
  const [weekStart, setWeekStart] = useState(() => weeks[0]?.weekStartMonday ?? "");

  const week: DiaryWeekEntry | null = useMemo(
    () => weeks.find((x) => x.weekStartMonday === weekStart) ?? null,
    [weeks, weekStart]
  );

  function printNow() {
    window.print();
  }

  if (!weeks.length) {
    return (
      <div className="print-week-page">
        <section className="card empty-state-card">
          <h2>Print diary week</h2>
          <p className="muted">No diary weeks saved yet. After you save a week on the full sheet or check-in, you can print it here.</p>
          <Link className="btn" to="/daily">
            Start check-in
          </Link>
        </section>
        <p className="muted" style={{ textAlign: "center", fontSize: "0.88rem" }}>
          <Link to="/tools">← Tools</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="print-week-page">
      <section className="card no-print">
        <h2>Print diary week</h2>
        <p className="muted">
          Choose a week, then use your browser&apos;s print dialog (or Save as PDF). The preview below is what prints.
        </p>
        <label className="field">
          Week starting Monday
          <select value={weekStart} onChange={(e) => setWeekStart(e.target.value)}>
            {weeks.map((w) => (
              <option key={w.id} value={w.weekStartMonday}>
                {w.weekStartMonday}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" className="btn" onClick={printNow}>
            Print / Save as PDF
          </button>
          <Link className="btn secondary btn-compact" to="/diary-sheet">
            Edit full sheet
          </Link>
          <Link className="btn secondary btn-compact" to="/print/month">
            Month summary (print / JSON)
          </Link>
        </div>
      </section>

      {week ? (
        <section className="card print-week-sheet" aria-label="Printable diary week">
          <header className="print-week-header">
            <h1 className="print-week-title">DBT diary week</h1>
            <p className="print-week-meta">Week of Monday {week.weekStartMonday}</p>
          </header>

          <h2 className="print-week-h2">Target behaviors</h2>
          <ol className="print-week-targets">
            {week.targetBehaviors.map((t, i) => (
              <li key={i}>{t.trim() || `— (slot ${i + 1} empty)`}</li>
            ))}
          </ol>

          <h2 className="print-week-h2">Prompting events</h2>
          <table className="print-week-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Prompt</th>
                <th>Urges (1–4)</th>
                <th>Used skills</th>
              </tr>
            </thead>
            <tbody>
              {week.events.map((row, i) => (
                <tr key={i}>
                  <td>{row.rowDate || "—"}</td>
                  <td>{row.prompt.trim() || "—"}</td>
                  <td>
                    {row.urges?.join(", ") ?? ""}
                    <div className="print-week-sub muted">
                      Actions: {(row.actions ?? []).map((a) => a || "—").join(" · ")}
                    </div>
                  </td>
                  <td>{row.usedSkills ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="print-week-h2">Emotions (0–5) per row</h2>
          <table className="print-week-table print-week-table--tight">
            <thead>
              <tr>
                <th>Date</th>
                {card.emotionColumns.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {week.events.map((row, i) => (
                <tr key={i}>
                  <td>{row.rowDate || "—"}</td>
                  {card.emotionColumns.map((c) => (
                    <td key={c.id}>{row.emotions[c.id] ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="print-week-h2">Other events by weekday</h2>
          <ul className="print-week-other">
            {WD_ORDER.map((d) => (
              <li key={d}>
                <strong>{WEEKDAY_LABEL[d]}:</strong> {week.otherEventsByWeekday[d]?.trim() || "—"}
              </li>
            ))}
          </ul>

          {week.skillsToPracticeNextWeek?.trim() ? (
            <>
              <h2 className="print-week-h2">Skills to practice next week</h2>
              <p>{week.skillsToPracticeNextWeek}</p>
            </>
          ) : null}
        </section>
      ) : null}

      <p className="muted no-print" style={{ textAlign: "center", fontSize: "0.88rem" }}>
        <Link to="/weekly">Weekly review</Link>
        {" · "}
        <Link to="/tools">← Tools</Link>
      </p>
    </div>
  );
}
