import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import diaryCard from "../../data/diary-card.json";
import skillsModules from "../../data/skills-modules.json";
import weeklyReview from "../../data/weekly-review.json";
import { mondayContainingLocalDate } from "../diary/diaryWeekModel";
import { DictateParagraphControls } from "../components/DictateParagraphControls";
import { appendSpokenChunk } from "../journal/spokenTextAppend";
import type { WeekdayId, WeeklyEntry } from "../types";
import { loadDiaryWeeks, loadWeekly, saveWeekly, uid } from "../storage";

type WeeklyFile = typeof weeklyReview;

export default function WeeklyReview() {
  const file = weeklyReview as WeeklyFile;
  const card = diaryCard;
  const skills = skillsModules;
  const [searchParams, setSearchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(() => {
    const q = searchParams.get("weekStart");
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : mondayContainingLocalDate(new Date());
  });
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const q = searchParams.get("weekStart");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q) && q !== weekStart) {
      setWeekStart(q);
      const next = new URLSearchParams(searchParams);
      next.delete("weekStart");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  const existing = useMemo(
    () => loadWeekly().find((w) => w.weekStart === weekStart),
    [weekStart]
  );

  useEffect(() => {
    if (existing) {
      setResponses(existing.responses);
      return;
    }
    const blank: Record<string, string> = {};
    file.prompts.forEach((p) => {
      blank[p.id] = "";
    });
    setResponses(blank);
  }, [weekStart, existing, file.prompts]);

  const diaryWeek = useMemo(() => loadDiaryWeeks().find((w) => w.weekStartMonday === weekStart), [weekStart]);
  const hasAnyDiaryWeekOnDevice = useMemo(() => loadDiaryWeeks().length > 0, []);

  const stats = useMemo(() => {
    if (!diaryWeek) return null;
    const rows = diaryWeek.events || [];
    if (!rows.length) return null;
    const n = rows.length;
    const urgeAvg = [0, 1, 2, 3].map((slot) => ({
      label: diaryWeek.targetBehaviors[slot]?.trim() || `Target ${slot + 1}`,
      avg: Math.round((rows.reduce((s, r) => s + (r.urges[slot] ?? 0), 0) / n) * 10) / 10,
    }));
    const emotionAvgs = card.emotionColumns
      .map((em) => ({
        label: em.label,
        avg: Math.round((rows.reduce((s, r) => s + (r.emotions[em.id] ?? 0), 0) / n) * 10) / 10,
      }))
      .filter((e) => e.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 7);
    const rowsWithPrompt = rows.filter((r) => r.prompt.trim()).length;
    const skillIds = skills.modules.flatMap((m) => m.skills.map((s) => s.id));
    const skillLabel = (id: string) =>
      skills.modules.flatMap((m) => m.skills).find((s) => s.id === id)?.label ?? id;
    const skillCheckCounts = skillIds.map((id) => {
      let c = 0;
      skills.weekdayIds.forEach((d) => {
        if (diaryWeek.skillsByDay?.[d as WeekdayId]?.[id]) c += 1;
      });
      return { id, label: skillLabel(id), count: c };
    });
    const topSkills = skillCheckCounts
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const avgUsedSkills =
      Math.round((rows.reduce((s, r) => s + (r.usedSkills ?? 0), 0) / n) * 10) / 10;
    return { urgeAvg, emotionAvgs, rowsWithPrompt, topSkills, avgUsedSkills, fillFrequency: diaryWeek.fillFrequency };
  }, [diaryWeek, card.emotionColumns, skills]);

  function save() {
    const all = loadWeekly();
    const entry: WeeklyEntry = {
      id: existing?.id ?? uid(),
      weekStart,
      responses,
      createdAt: new Date().toISOString(),
    };
    const next = all.filter((w) => w.weekStart !== weekStart);
    next.push(entry);
    next.sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
    saveWeekly(next);
    setMsg("Saved for this week on this device.");
    window.setTimeout(() => setMsg(""), 2500);
  }

  return (
    <>
      <section className="card">
        <h2>Weekly review</h2>
        <p className="muted">
          Prompts from <code>data/weekly-review.json</code>, plus a summary from your saved{" "}
          <strong>diary card week</strong> (same week starting Monday) if you have entered one on the Diary
          card page.
        </p>
        <label className="field">
          Week starting (Monday)
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </label>
        {hasAnyDiaryWeekOnDevice ? (
          <p className="muted" style={{ marginTop: "0.65rem" }}>
            <Link className="btn secondary btn-compact" to="/print/diary-week">
              Print or save week as PDF
            </Link>
          </p>
        ) : null}
      </section>

      {!hasAnyDiaryWeekOnDevice ? (
        <section className="card empty-state-card">
          <h3 className="dash-section-title">No diary week on this device yet</h3>
          <p className="muted">
            When you are ready, a guided check-in or the full sheet creates a week here. Then this page can pull gentle
            numbers beside your words.
          </p>
          <div className="empty-state-actions">
            <Link className="btn" to="/daily">
              Guided check-in
            </Link>
            <Link className="btn secondary" to="/diary-sheet">
              Full diary sheet
            </Link>
          </div>
        </section>
      ) : null}

      {hasAnyDiaryWeekOnDevice ? (
      <section className="card">
        <h2>Week at a glance (from diary card)</h2>
        {!stats ? (
          <p className="muted">
            No diary card saved for this week yet. Add a row on the full sheet or finish a check-in for this
            Monday-starting week to see averages here.
          </p>
        ) : (
          <>
            <p className="muted">
              Prompting-event rows with text: {stats.rowsWithPrompt}. Card fill frequency:{" "}
              {stats.fillFrequency || "not set"}.
            </p>
            <h3>Average urge ratings (all {diaryWeek?.events.length ?? 0} rows)</h3>
            <table className="simple">
              <tbody>
                {stats.urgeAvg.map((u) => (
                  <tr key={u.label}>
                    <td>{u.label}</td>
                    <td>{u.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.emotionAvgs.length ? (
              <>
                <h3>Highest average emotion intensities (0–5)</h3>
                <ul className="muted" style={{ marginTop: 0 }}>
                  {stats.emotionAvgs.map((e) => (
                    <li key={e.label}>
                      {e.label} — avg {e.avg}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="muted">
              Average &quot;Used skills&quot; code (0–7) across rows: <strong>{stats.avgUsedSkills}</strong>
            </p>
            {stats.topSkills.length ? (
              <>
                <h3>Skills checked on most days (of 7)</h3>
                <ul className="muted" style={{ marginTop: 0 }}>
                  {stats.topSkills.map((s) => (
                    <li key={s.id}>
                      {s.label} — {s.count} day{s.count === 1 ? "" : "s"}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>
      ) : null}

      <section className="card">
        <h2>Reflect</h2>
        {file.prompts.map((p) => (
          <label key={p.id} className="field" style={{ marginBottom: "0.65rem" }}>
            <strong>{p.label}</strong>
            <span className="muted" style={{ fontWeight: 400 }}>
              {p.text}
            </span>
            <textarea
              value={responses[p.id] ?? ""}
              onChange={(e) =>
                setResponses((prev) => ({
                  ...prev,
                  [p.id]: e.target.value,
                }))
              }
            />
            <DictateParagraphControls
              mergeChunk={(chunk) =>
                setResponses((prev) => ({
                  ...prev,
                  [p.id]: appendSpokenChunk(prev[p.id] ?? "", chunk),
                }))
              }
            />
          </label>
        ))}
        <button type="button" className="btn" onClick={save}>
          Save weekly review
        </button>
        {msg ? (
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            {msg}
          </p>
        ) : null}
      </section>
    </>
  );
}
