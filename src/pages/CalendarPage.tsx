import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buildMonthCells, formatYearMonth, parseYearMonth, shiftYearMonth } from "../calendar/calendarMonth";
import { moodPresentationForDay } from "../calendar/dayMoodPresentation";
import { todayISO } from "../diary/diaryWeekModel";
import { getDaySnapshot } from "../journal/daySnapshot";
import type { DaySnapshot } from "../journal/daySnapshot";
import { loadStreak } from "../storage";

const WEEK_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function rowHasDiaryDate(s: DaySnapshot): boolean {
  return Boolean(s.row && s.row.rowDate === s.dateLocal);
}

function monthTitle(ym: string): string {
  const p = parseYearMonth(ym);
  if (!p) return ym;
  return new Date(p.year, p.month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [streakTick, setStreakTick] = useState(0);

  useEffect(() => {
    const fn = () => setStreakTick((n) => n + 1);
    window.addEventListener("dbt-streak-updated", fn);
    return () => window.removeEventListener("dbt-streak-updated", fn);
  }, []);

  const ym = useMemo(() => {
    const p = parseYearMonth(searchParams.get("ym") || "");
    if (p) return formatYearMonth(p.year, p.month);
    return todayISO().slice(0, 7);
  }, [searchParams]);

  const cells = useMemo(() => {
    const p = parseYearMonth(ym);
    if (!p) return [];
    return buildMonthCells(p.year, p.month);
  }, [ym]);

  const streak = useMemo(() => {
    void streakTick;
    return loadStreak();
  }, [ym, streakTick]);

  const today = todayISO();

  function setYm(nextYm: string) {
    setSearchParams({ ym: nextYm }, { replace: true });
  }

  const sampleLow = moodPresentationForDay([
    { id: "x", at: "", mood: 2, emotions: [], bodyNote: "", notes: "" },
  ]);

  return (
    <div className="calendar-page">
      <section className="card">
        <h2 className="brand-heading">Calendar</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Month view of your diary card, moods, and other logs. Tap a day for the full <strong>Today</strong> view.
          Cell colour comes from mood logs (0 rough → 10 calmer); a gradient means mixed levels that day.
        </p>
        <div className="calendar-toolbar">
          <button type="button" className="btn secondary btn-compact" onClick={() => setYm(shiftYearMonth(ym, -1))}>
            ← Prev
          </button>
          <h3 className="calendar-month-title">{monthTitle(ym)}</h3>
          <button type="button" className="btn secondary btn-compact" onClick={() => setYm(shiftYearMonth(ym, 1))}>
            Next →
          </button>
          <button type="button" className="btn secondary btn-compact" onClick={() => setYm(today.slice(0, 7))}>
            This month
          </button>
          <Link
            className="btn secondary btn-compact"
            to={`/print/month?ym=${encodeURIComponent(ym)}`}
          >
            Print / export month
          </Link>
        </div>
        <p className="muted calendar-streak-line">
          Guided check-in streak: <strong>{streak.currentStreak}</strong> day{streak.currentStreak === 1 ? "" : "s"}{" "}
          (longest <strong>{streak.longestStreak}</strong>).{" "}
          {streak.lastGuidedCheckInLocalDate ? (
            <>
              Last guided save: <strong>{streak.lastGuidedCheckInLocalDate}</strong>.
            </>
          ) : (
            <>No guided streak yet.</>
          )}
        </p>
      </section>

      <section className="card calendar-grid-card" aria-label={`Calendar for ${monthTitle(ym)}`}>
        <div className="calendar-weekdays" role="row">
          {WEEK_HEADERS.map((d) => (
            <div key={d} className="calendar-weekday" role="columnheader">
              {d}
            </div>
          ))}
        </div>
        <div className="calendar-cells" role="grid">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`pad-${i}`} className="calendar-cell calendar-cell--empty" aria-hidden />;
            }
            const snap = getDaySnapshot(date);
            const moodStyle = moodPresentationForDay(snap.moods);
            const diary = rowHasDiaryDate(snap);
            const other =
              Boolean(snap.weekdayOtherNote.trim()) ||
              snap.journals.length > 0 ||
              snap.spirals.length > 0 ||
              snap.tagline.trim().length > 0;
            const isToday = date === today;
            const streakAnchor = Boolean(streak.lastGuidedCheckInLocalDate && date === streak.lastGuidedCheckInLocalDate);

            const parts: string[] = [date];
            if (moodStyle) parts.push(moodStyle.summary);
            if (diary) parts.push("Diary card row");
            if (other) parts.push("Journal / note / other activity");
            const title = parts.join(" · ");

            return (
              <Link
                key={date}
                role="gridcell"
                className={`calendar-cell ${isToday ? "calendar-cell--today" : ""} ${diary ? "calendar-cell--diary" : ""}`}
                to={`/day/${date}`}
                style={moodStyle ? { background: moodStyle.background } : undefined}
                title={title}
              >
                <span className="calendar-cell-date">{Number(date.slice(8))}</span>
                <span className="calendar-cell-badges" aria-hidden="true">
                  {diary ? <span className="calendar-badge calendar-badge--diary" /> : null}
                  {streakAnchor ? <span className="calendar-badge calendar-badge--streak" /> : null}
                  {other && !diary ? <span className="calendar-badge calendar-badge--other" /> : null}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="card calendar-legend">
        <h3 className="dash-section-title">Legend</h3>
        <ul className="muted calendar-legend-list">
          <li>
            {sampleLow ? (
              <>
                <span className="calendar-legend-swatch" style={{ background: sampleLow.background }} />{" "}
              </>
            ) : null}
            Cooler tones → lower mood numbers; warmer → higher (same 0–10 scale as the Mood page).
          </li>
          <li>Gradient cell → more than one mood log that day with a wider spread.</li>
          <li>
            <span className="calendar-badge calendar-badge--diary calendar-legend-inline" /> Dot — diary card row for
            that date.
          </li>
          <li>
            <span className="calendar-badge calendar-badge--streak calendar-legend-inline" /> Dot — last day a guided
            check-in updated your streak (earlier streak days are not marked individually).
          </li>
        </ul>
        <p className="muted" style={{ marginBottom: 0 }}>
          Prefer the rolling strip? See{" "}
          <Link to="/timeline">
            <strong>Timeline</strong>
          </Link>
          . For a printable table of this month, open{" "}
          <Link to={`/print/month?ym=${encodeURIComponent(ym)}`}>
            <strong>Print month summary</strong>
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
