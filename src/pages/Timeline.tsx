import { useMemo } from "react";
import { Link } from "react-router-dom";
import { addCalendarDaysLocal, todayISO } from "../diary/diaryWeekModel";
import { getDaySnapshot, daySnapshotHasActivity } from "../journal/daySnapshot";

const RANGE_DAYS = 35;

function rowHasDiaryDate(s: ReturnType<typeof getDaySnapshot>): boolean {
  return Boolean(s.row && s.row.rowDate === s.dateLocal);
}

export default function Timeline() {
  const days = useMemo(() => {
    const end = todayISO();
    const list: string[] = [];
    for (let i = RANGE_DAYS - 1; i >= 0; i--) {
      list.push(addCalendarDaysLocal(end, -i));
    }
    return list;
  }, []);

  const weeks = useMemo(() => {
    const chunks: string[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunks.push(days.slice(i, i + 7));
    }
    return chunks;
  }, [days]);

  const activeDaysInRange = useMemo(
    () => days.filter((d) => daySnapshotHasActivity(getDaySnapshot(d))).length,
    [days]
  );

  return (
    <div className="timeline-page">
      <section className="card">
        <h2>Day timeline</h2>
        <p className="muted">
          Last {RANGE_DAYS} days (oldest left, today right). Dots show what you logged—tap a day for diary, mood,
          journal, spirals, and your memory line together.
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          <Link className="btn secondary btn-compact" to={`/day/${todayISO()}`}>
            Open today
          </Link>{" "}
          <Link className="btn secondary btn-compact" to="/calendar">
            Month calendar
          </Link>
        </p>
      </section>

      {activeDaysInRange === 0 ? (
        <section className="card empty-state-card">
          <h3 className="dash-section-title">Still quiet here</h3>
          <p className="muted">
            This strip fills in as you log check-ins, moods, journal lines, spirals, or a memory line on a day—there is
            no rush.
          </p>
          <div className="empty-state-actions">
            <Link className="btn" to="/daily">
              Start check-in
            </Link>
            <Link className="btn secondary" to="/mood">
              Log mood
            </Link>
            <Link className="btn secondary" to={`/day/${todayISO()}`}>
              Open today
            </Link>
          </div>
        </section>
      ) : null}

      <section className="card timeline-strip-card">
        {weeks.map((row, wi) => (
          <div key={wi} className="timeline-week-row">
            <div className="timeline-week-label muted">Week {wi + 1}</div>
            <div className="timeline-week-cells">
              {row.map((d) => {
                const snap = getDaySnapshot(d);
                const on = daySnapshotHasActivity(snap);
                const isToday = d === todayISO();
                return (
                  <Link
                    key={d}
                    className={`timeline-cell ${on ? "has-data" : ""} ${isToday ? "is-today" : ""}`}
                    to={`/day/${d}`}
                    title={d}
                  >
                    <span className="timeline-cell-date">{d.slice(8)}</span>
                    <span className="timeline-cell-dots" aria-hidden>
                      {rowHasDiaryDate(snap) ? <span className="dot diary" /> : null}
                      {snap.moods.length ? <span className="dot mood" /> : null}
                      {snap.journals.length ? <span className="dot journal" /> : null}
                      {snap.spirals.length ? <span className="dot spiral" /> : null}
                      {snap.tagline.trim() ? <span className="dot tag" /> : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
