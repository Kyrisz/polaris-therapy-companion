import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import weeklyReview from "../../data/weekly-review.json";
import { addCalendarDaysLocal, formatLocalYMD, mondayContainingLocalDate } from "../diary/diaryWeekModel";
import { buildInsights } from "../insights/buildInsights";
import { loadDayTaglines, loadDiaryWeeks, loadJournal, loadMood, loadSpiral, loadWeekly } from "../storage";

const WR = weeklyReview as { prompts: { id: string; label: string }[] };

function promptLabel(id: string): string {
  return WR.prompts.find((p) => p.id === id)?.label ?? id;
}

function moodDay(at: string): string {
  try {
    return formatLocalYMD(new Date(at));
  } catch {
    return "";
  }
}

function daysInMonthYm(ym: string): string[] {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m || m < 1 || m > 12) return [];
  const last = new Date(y, m, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    out.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

function inYmdRange(d: string, start: string, end: string): boolean {
  return d >= start && d <= end;
}

type Scope = "week" | "month";

export default function PrintTherapyBundle() {
  const [searchParams] = useSearchParams();
  const scope = (searchParams.get("scope") === "month" ? "month" : "week") as Scope;
  const defaultYm = formatLocalYMD(new Date()).slice(0, 7);
  const weekStart = useMemo(() => {
    const q = searchParams.get("weekStart");
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : mondayContainingLocalDate(new Date());
  }, [searchParams]);
  const ym = (searchParams.get("ym") || defaultYm).slice(0, 7);

  const weekEnd = useMemo(() => addCalendarDaysLocal(weekStart, 6), [weekStart]);
  const monthDays = useMemo(() => daysInMonthYm(ym), [ym]);
  const monthStart = monthDays[0] ?? "";
  const monthEnd = monthDays[monthDays.length - 1] ?? "";

  const [topSummary, setTopSummary] = useState("");

  const data = useMemo(() => {
    const journalAll = loadJournal();
    const journalFiltered =
      scope === "week"
        ? journalAll.filter((j) => inYmdRange(j.entryDate, weekStart, weekEnd))
        : journalAll.filter((j) => j.entryDate >= monthStart && j.entryDate <= monthEnd);

    const weeklyAll = loadWeekly();
    const weeklyFiltered =
      scope === "week"
        ? weeklyAll.filter((w) => w.weekStart === weekStart)
        : weeklyAll.filter((w) => {
            const ws = w.weekStart;
            const we = addCalendarDaysLocal(ws, 6);
            return we >= monthStart && ws <= monthEnd;
          });

    const moods = loadMood().filter((m) => {
      const d = moodDay(m.at);
      return scope === "week" ? inYmdRange(d, weekStart, weekEnd) : d >= monthStart && d <= monthEnd;
    });

    const spirals = loadSpiral().filter((s) => {
      const d = moodDay(s.at);
      return scope === "week" ? inYmdRange(d, weekStart, weekEnd) : d >= monthStart && d <= monthEnd;
    });

    const taglinesMap = loadDayTaglines();
    const taglineKeys =
      scope === "week"
        ? Object.keys(taglinesMap).filter((d) => inYmdRange(d, weekStart, weekEnd))
        : Object.keys(taglinesMap).filter((d) => d >= monthStart && d <= monthEnd);

    const insight = buildInsights(loadDiaryWeeks(), journalAll, loadMood(), loadSpiral());

    return { journalFiltered, weeklyFiltered, moods, spirals, taglinesMap, taglineKeys, insight };
  }, [scope, weekStart, weekEnd, monthStart, monthEnd]);

  useEffect(() => {
    const t = window.setTimeout(() => window.scrollTo({ top: 0, behavior: "auto" }), 0);
    return () => window.clearTimeout(t);
  }, [scope, weekStart, ym]);

  const title = scope === "week" ? `Bring to therapy — week ${weekStart}–${weekEnd}` : `Bring to therapy — ${ym}`;

  return (
    <div className="print-therapy-page">
      <section className="card print-controls no-print">
        <h2>{title}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Use your browser’s <strong>Print</strong> → <strong>Save as PDF</strong>. Nothing is uploaded.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" className="btn" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
          <Link className="btn secondary" to="/therapy?tab=bring">
            Back to Bring tab
          </Link>
        </div>
        <label className="field" style={{ marginTop: "0.75rem" }}>
          Top summary (optional; prints)
          <textarea
            rows={4}
            value={topSummary}
            onChange={(e) => setTopSummary(e.target.value)}
            placeholder="3–5 sentences: what matters most to bring up, what changed, what you want help with."
          />
        </label>
      </section>

      <section className="card print-sheet">
        <h2 style={{ marginBottom: "0.25rem" }}>{title}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
          Generated locally on this device · {new Date().toLocaleString()}
        </p>

        {topSummary.trim() ? (
          <>
            <h3>Top summary</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{topSummary.trim()}</p>
          </>
        ) : null}

        {data.weeklyFiltered.length ? (
          <>
            <h3>{scope === "week" ? "Weekly review" : "Weekly reviews (month)"}</h3>
            {data.weeklyFiltered.map((wk) => (
              <div key={wk.id} className="print-block">
                {scope === "month" ? <h4 style={{ margin: "0.2rem 0 0.4rem" }}>Week {wk.weekStart}</h4> : null}
                <ul style={{ marginTop: 0 }}>
                  {Object.entries(wk.responses || {})
                    .filter(([, v]) => String(v || "").trim())
                    .map(([id, text]) => (
                      <li key={id}>
                        <strong>{promptLabel(id)}:</strong> {String(text || "").trim()}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </>
        ) : null}

        {data.journalFiltered.length ? (
          <>
            <h3>Journal (titles)</h3>
            <ul>
              {data.journalFiltered
                .slice()
                .sort((a, b) => (a.entryDate < b.entryDate ? -1 : 1))
                .map((j) => (
                  <li key={j.id}>
                    {j.entryDate} · {j.title.trim() || "(untitled)"} · <em>{j.kind.replace(/_/g, " ")}</em>
                  </li>
                ))}
            </ul>
          </>
        ) : null}

        {data.moods.length ? (
          <>
            <h3>Mood</h3>
            <p>
              Check-ins: <strong>{data.moods.length}</strong> · average level{" "}
              <strong>{(data.moods.reduce((s, m) => s + m.mood, 0) / data.moods.length).toFixed(1)}</strong> (0 rough →
              10 calmer)
            </p>
          </>
        ) : null}

        {data.taglineKeys.filter((d) => data.taglinesMap[d]?.trim()).length ? (
          <>
            <h3>Memory lines</h3>
            <ul>
              {data.taglineKeys
                .filter((d) => data.taglinesMap[d]?.trim())
                .sort()
                .map((d) => (
                  <li key={d}>
                    {d}: {data.taglinesMap[d]!.trim()}
                  </li>
                ))}
            </ul>
          </>
        ) : null}

        {data.spirals.length ? (
          <>
            <h3>Spiral logs</h3>
            <ul>
              {data.spirals.slice(-12).map((s) => (
                <li key={s.id}>
                  {moodDay(s.at)} · peak {s.peakIntensity} · {(s.stages?.trigger || "").slice(0, 100) || "—"}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <h3>Snapshot (all-time device totals)</h3>
        <ul style={{ marginTop: 0 }}>
          <li>
            Diary rows with dates: <strong>{data.insight.diaryRowCount}</strong>
          </li>
          <li>
            Journal entries: <strong>{data.insight.journalEntryCount}</strong>
          </li>
          <li>
            Mood logs: <strong>{data.insight.moodLogCount}</strong>
          </li>
          <li>
            Spirals: <strong>{data.insight.spiralCount}</strong>
          </li>
        </ul>
      </section>
    </div>
  );
}

