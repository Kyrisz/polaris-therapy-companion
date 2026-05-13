import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  formatYearMonth,
  listDaysInMonth,
  monthDateRange,
  parseYearMonth,
  shiftYearMonth,
} from "../calendar/calendarMonth";
import { moodPresentationForDay } from "../calendar/dayMoodPresentation";
import {
  addCalendarDaysLocal,
  WEEKDAY_LABEL,
  weekdayIdFromISO,
} from "../diary/diaryWeekModel";
import { daySnapshotHasActivity, getDaySnapshot } from "../journal/daySnapshot";
import type { DiaryWeekEntry } from "../types";
import { loadDiaryWeeks, loadStreak } from "../storage";

function monthTitle(ym: string): string {
  const p = parseYearMonth(ym);
  if (!p) return ym;
  return new Date(p.year, p.month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

function trunc(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t || "—";
  return `${t.slice(0, max - 1)}…`;
}

function weekOverlapsMonth(w: DiaryWeekEntry, start: string, end: string): boolean {
  const ws = w.weekStartMonday;
  const we = addCalendarDaysLocal(ws, 6);
  return ws <= end && we >= start;
}

function moodCellText(date: string): string {
  const s = getDaySnapshot(date);
  if (!s.moods.length) return "—";
  const mp = moodPresentationForDay(s.moods);
  const vals = s.moods.map((m) => m.mood);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return mp ? `${mp.summary} (${s.moods.length} log${s.moods.length === 1 ? "" : "s"})` : `${avg.toFixed(1)} / 10`;
}

function buildMonthExportPayload(ym: string, days: string[], weeks: DiaryWeekEntry[]) {
  const range = monthDateRange(ym);
  const streak = loadStreak();
  const overlapping = range ? weeks.filter((w) => weekOverlapsMonth(w, range.start, range.end)) : [];
  return {
    exportedAt: new Date().toISOString(),
    kind: "month-summary" as const,
    app: "dbt-diary-checkin",
    month: ym,
    monthLabel: monthTitle(ym),
    streak,
    days: days.map((date) => {
      const s = getDaySnapshot(date);
      return {
        date,
        weekday: WEEKDAY_LABEL[s.weekday],
        hasActivity: daySnapshotHasActivity(s),
        diaryRowDate: s.row?.rowDate ?? "",
        diaryPrompt: s.row?.prompt?.trim() ?? "",
        moods: s.moods.map((m) => ({ at: m.at, mood: m.mood, emotions: m.emotions })),
        journalCount: s.journals.length,
        spiralCount: s.spirals.length,
        tagline: s.tagline.trim(),
        weekdayOtherNote: s.weekdayOtherNote.trim(),
      };
    }),
    diaryWeeksOverlapping: overlapping.map((w) => {
      const rowDatesInMonth =
        range === null
          ? []
          : w.events
              .map((e) => e.rowDate)
              .filter((d) => Boolean(d && d >= range.start && d <= range.end));
      return {
        weekStartMonday: w.weekStartMonday,
        targetBehaviors: w.targetBehaviors,
        rowDatesInMonth,
      };
    }),
  };
}

export default function PrintMonthSummary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ym = useMemo(() => {
    const p = parseYearMonth(searchParams.get("ym") || "");
    if (p) return formatYearMonth(p.year, p.month);
    const t = new Date();
    return formatYearMonth(t.getFullYear(), t.getMonth() + 1);
  }, [searchParams]);

  const p = parseYearMonth(ym);
  const days = useMemo(() => (p ? listDaysInMonth(p.year, p.month) : []), [ym]);
  const weeks = useMemo(() => loadDiaryWeeks(), []);

  const overlappingWeeks = useMemo(() => {
    const range = monthDateRange(ym);
    if (!range) return [];
    return weeks.filter((w) => weekOverlapsMonth(w, range.start, range.end));
  }, [weeks, ym]);

  function setYm(next: string) {
    setSearchParams({ ym: next }, { replace: true });
  }

  function printNow() {
    window.print();
  }

  function downloadJson() {
    const payload = buildMonthExportPayload(ym, days, weeks);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dbt-month-summary-${ym}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="print-week-page print-month-summary-page">
      <section className="card no-print">
        <h2>Print month summary</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          A printable snapshot of one calendar month: moods, diary rows, journal counts, and which diary weeks overlap.
          Use <strong>Print / Save as PDF</strong>, or download structured JSON for your records. For the classic DBT
          grid, use{" "}
          <Link to="/print/diary-week">
            <strong>Print diary week</strong>
          </Link>
          .
        </p>
        <label className="field">
          Month
          <input
            type="month"
            value={ym}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d{4}-\d{2}$/.test(v)) setYm(v);
            }}
          />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button type="button" className="btn" onClick={printNow}>
            Print / Save as PDF
          </button>
          <button type="button" className="btn secondary" onClick={downloadJson}>
            Download JSON
          </button>
          <Link className="btn secondary btn-compact" to={`/calendar?ym=${encodeURIComponent(ym)}`}>
            Open in calendar
          </Link>
          <button type="button" className="btn secondary btn-compact" onClick={() => setYm(shiftYearMonth(ym, -1))}>
            Previous month
          </button>
          <button type="button" className="btn secondary btn-compact" onClick={() => setYm(shiftYearMonth(ym, 1))}>
            Next month
          </button>
        </div>
      </section>

      <section className="card print-week-sheet" aria-label="Printable month summary">
        <header className="print-week-header">
          <h1 className="print-week-title">DBT month summary</h1>
          <p className="print-week-meta">{monthTitle(ym)} · Generated on this device</p>
        </header>

        {(() => {
          const streak = loadStreak();
          return (
            <p className="print-month-streak muted">
              Guided check-in streak: <strong>{streak.currentStreak}</strong> current ·{" "}
              <strong>{streak.longestStreak}</strong> longest
              {streak.lastGuidedCheckInLocalDate ? (
                <>
                  {" "}
                  · Last guided: <strong>{streak.lastGuidedCheckInLocalDate}</strong>
                </>
              ) : null}
            </p>
          );
        })()}

        <h2 className="print-week-h2">Day-by-day</h2>
        <table className="print-week-table print-month-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Weekday</th>
              <th>Diary prompt</th>
              <th>Mood (0–10)</th>
              <th>Journal</th>
              <th>Memory / weekday note</th>
            </tr>
          </thead>
          <tbody>
            {days.map((date) => {
              const s = getDaySnapshot(date);
              const wd = WEEKDAY_LABEL[weekdayIdFromISO(date)];
              const prompt = s.row?.rowDate === date ? trunc(s.row?.prompt ?? "", 72) : "—";
              const mood = moodCellText(date);
              const jn = s.journals.length ? `${s.journals.length} entr${s.journals.length === 1 ? "y" : "ies"}` : "—";
              const mem = [s.tagline.trim(), s.weekdayOtherNote.trim()].filter(Boolean).join(" · ");
              const memOut = mem ? trunc(mem, 80) : "—";
              const active = daySnapshotHasActivity(s);
              return (
                <tr key={date} className={active ? "" : "print-month-row--quiet"}>
                  <td>{date}</td>
                  <td>{wd}</td>
                  <td>{prompt}</td>
                  <td>{mood}</td>
                  <td>{jn}</td>
                  <td>{memOut}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {overlappingWeeks.length ? (
          <>
            <h2 className="print-week-h2">Diary card weeks overlapping this month</h2>
            <ul className="print-week-targets">
              {overlappingWeeks.map((w) => (
                <li key={w.id}>
                  <strong>Week of {w.weekStartMonday}</strong> — targets:{" "}
                  {w.targetBehaviors.map((t) => t.trim() || "—").join(" · ")}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <p className="muted no-print" style={{ textAlign: "center", fontSize: "0.88rem" }}>
        <Link to="/calendar">Calendar</Link>
        {" · "}
        <Link to="/tools">← Tools</Link>
      </p>
    </div>
  );
}
