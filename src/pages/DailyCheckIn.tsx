import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import diaryCard from "../../data/diary-card.json";
import skillsModules from "../../data/skills-modules.json";
import { DictateParagraphControls } from "../components/DictateParagraphControls";
import type { ActionYN, DiaryWeekEntry, PromptingEventRow, WeekdayId } from "../types";
import { mondayContainingLocalDate } from "../diary/diaryWeekModel";
import { appendSpokenChunk } from "../journal/spokenTextAppend";
import { loadDiaryWeeks, saveDiaryWeeks, uid } from "../storage";

type DiaryCard = typeof diaryCard;
type SkillsFile = typeof skillsModules;

function emptyRow(card: DiaryCard): PromptingEventRow {
  const emotions: Record<string, number> = {};
  card.emotionColumns.forEach((c) => {
    emotions[c.id] = 0;
  });
  return {
    prompt: "",
    rowDate: "",
    emotions,
    urges: [0, 0, 0, 0],
    actions: ["", "", "", ""],
    usedSkills: 0,
  };
}

function emptyWeek(card: DiaryCard, skills: SkillsFile, weekStartMonday: string): DiaryWeekEntry {
  const skillIds = skills.modules.flatMap((m) => m.skills.map((s) => s.id));
  const skillsByDay = {} as Record<WeekdayId, Record<string, boolean>>;
  skills.weekdayIds.forEach((d) => {
    const dayMap: Record<string, boolean> = {};
    skillIds.forEach((id) => {
      dayMap[id] = false;
    });
    skillsByDay[d as WeekdayId] = dayMap;
  });
  const other: Record<WeekdayId, string> = {
    mon: "",
    tue: "",
    wed: "",
    thu: "",
    fri: "",
    sat: "",
    sun: "",
  };
  const rows: PromptingEventRow[] = [];
  for (let i = 0; i < card.promptingEventRowCount; i++) rows.push(emptyRow(card));
  return {
    id: uid(),
    weekStartMonday,
    fillFrequency: "",
    dateStarted: "",
    targetBehaviors: ["", "", "", ""],
    events: rows,
    otherEventsByWeekday: other,
    skillsByDay,
    skillsToPracticeNextWeek: "",
    createdAt: new Date().toISOString(),
  };
}

function mergeSkillDays(
  existing: Record<WeekdayId, Record<string, boolean>> | undefined,
  skillIds: string[],
  weekdayIds: string[]
): Record<WeekdayId, Record<string, boolean>> {
  const out = {} as Record<WeekdayId, Record<string, boolean>>;
  weekdayIds.forEach((d) => {
    const prev = existing?.[d as WeekdayId] || {};
    const dayMap: Record<string, boolean> = {};
    skillIds.forEach((id) => {
      dayMap[id] = prev[id] ?? false;
    });
    out[d as WeekdayId] = dayMap;
  });
  return out;
}

export default function DailyCheckIn() {
  const card = diaryCard as DiaryCard;
  const skills = skillsModules as SkillsFile;

  const [weekStartMonday, setWeekStartMonday] = useState(() => mondayContainingLocalDate(new Date()));
  const [fillFrequency, setFillFrequency] = useState<DiaryWeekEntry["fillFrequency"]>("");
  const [dateStarted, setDateStarted] = useState("");
  const [targetBehaviors, setTargetBehaviors] = useState<[string, string, string, string]>([
    "",
    "",
    "",
    "",
  ]);
  const [events, setEvents] = useState<PromptingEventRow[]>([]);
  const [otherEventsByWeekday, setOtherEventsByWeekday] = useState<Record<WeekdayId, string>>({
    mon: "",
    tue: "",
    wed: "",
    thu: "",
    fri: "",
    sat: "",
    sun: "",
  });
  const [skillsByDay, setSkillsByDay] = useState<Record<WeekdayId, Record<string, boolean>>>(
    () => ({} as Record<WeekdayId, Record<string, boolean>>)
  );
  const [skillsToPracticeNextWeek, setSkillsToPracticeNextWeek] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const skillIds = useMemo(() => skills.modules.flatMap((m) => m.skills.map((s) => s.id)), [skills.modules]);

  useEffect(() => {
    const weeks = loadDiaryWeeks();
    const existing = weeks.find((w) => w.weekStartMonday === weekStartMonday);
    if (existing) {
      setFillFrequency(existing.fillFrequency || "");
      setDateStarted(existing.dateStarted || "");
      setTargetBehaviors(
        existing.targetBehaviors?.length === 4
          ? existing.targetBehaviors
          : ["", "", "", ""]
      );
      const rowCount = card.promptingEventRowCount;
      let ev = existing.events || [];
      if (ev.length < rowCount) {
        ev = [...ev];
        while (ev.length < rowCount) ev.push(emptyRow(card));
      } else if (ev.length > rowCount) {
        ev = ev.slice(0, rowCount);
      }
      ev = ev.map((row) => {
        const emotions = { ...emptyRow(card).emotions, ...row.emotions };
        card.emotionColumns.forEach((c) => {
          if (emotions[c.id] === undefined) emotions[c.id] = 0;
        });
        const urges = row.urges?.length === 4 ? [...row.urges] : ([0, 0, 0, 0] as [number, number, number, number]);
        const actions =
          row.actions?.length === 4
            ? [...row.actions]
            : (["", "", "", ""] as [ActionYN, ActionYN, ActionYN, ActionYN]);
        return {
          ...row,
          emotions,
          urges: urges as [number, number, number, number],
          actions: actions as [ActionYN, ActionYN, ActionYN, ActionYN],
          usedSkills: Math.min(7, Math.max(0, row.usedSkills ?? 0)),
        };
      });
      setEvents(ev);
      setOtherEventsByWeekday({
        ...{ mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
        ...existing.otherEventsByWeekday,
      });
      setSkillsByDay(mergeSkillDays(existing.skillsByDay, skillIds, skills.weekdayIds));
      setSkillsToPracticeNextWeek(existing.skillsToPracticeNextWeek || "");
    } else {
      const fresh = emptyWeek(card, skills, weekStartMonday);
      setFillFrequency("");
      setDateStarted("");
      setTargetBehaviors(["", "", "", ""]);
      setEvents(fresh.events);
      setOtherEventsByWeekday(fresh.otherEventsByWeekday);
      setSkillsByDay(fresh.skillsByDay);
      setSkillsToPracticeNextWeek("");
    }
  }, [weekStartMonday, card, skills, skillIds]);

  function updateEvent(index: number, patch: Partial<PromptingEventRow>) {
    setEvents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function setEmotionCell(rowIndex: number, emotionId: string, value: number) {
    setEvents((prev) => {
      const next = [...prev];
      const row = { ...next[rowIndex] };
      row.emotions = { ...row.emotions, [emotionId]: value };
      next[rowIndex] = row;
      return next;
    });
  }

  function setUrgeCell(rowIndex: number, slot: number, value: number) {
    setEvents((prev) => {
      const next = [...prev];
      const row = { ...next[rowIndex] };
      const u = [...row.urges] as [number, number, number, number];
      u[slot] = value;
      row.urges = u;
      next[rowIndex] = row;
      return next;
    });
  }

  function setActionCell(rowIndex: number, slot: number, value: ActionYN) {
    setEvents((prev) => {
      const next = [...prev];
      const row = { ...next[rowIndex] };
      const a = [...row.actions] as [ActionYN, ActionYN, ActionYN, ActionYN];
      a[slot] = value;
      row.actions = a;
      next[rowIndex] = row;
      return next;
    });
  }

  function toggleSkillDay(day: WeekdayId, skillId: string) {
    setSkillsByDay((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [skillId]: !prev[day]?.[skillId],
      },
    }));
  }

  function save() {
    const weeks = loadDiaryWeeks();
    const payload: DiaryWeekEntry = {
      id: weeks.find((w) => w.weekStartMonday === weekStartMonday)?.id ?? uid(),
      weekStartMonday,
      fillFrequency,
      dateStarted,
      targetBehaviors,
      events,
      otherEventsByWeekday,
      skillsByDay,
      skillsToPracticeNextWeek,
      createdAt: new Date().toISOString(),
    };
    const next = weeks.filter((w) => w.weekStartMonday !== weekStartMonday);
    next.push(payload);
    next.sort((a, b) => (a.weekStartMonday < b.weekStartMonday ? -1 : 1));
    saveDiaryWeeks(next);
    setSavedMsg("Saved diary week to this browser.");
    window.setTimeout(() => setSavedMsg(""), 2500);
  }

  const usedLegend = card.usedSkillsColumn.legend;

  return (
    <>
      <section className="card" style={{ background: "var(--card-soft)", borderStyle: "dashed" }}>
        <p className="muted" style={{ margin: 0 }}>
          Prefer a calm step-by-step flow? Use the{" "}
          <Link to="/daily">
            guided diary
          </Link>{" "}
          — answers still save to this same week.
        </p>
      </section>
      <section className="card">
        <h2>DBT diary card (your printed form)</h2>
        <p className="muted">
          Layout and fields follow{" "}
          <code>DBT Diary Card pg 1.png</code>, <code>DBT Diary Card pg 2.png</code>, and the How To pages.
          Data definitions live in <code>data/diary-card.json</code> and <code>data/skills-modules.json</code>.
        </p>
        <div className="grid-2">
          <label className="field">
            Week starting (Monday)
            <input
              type="date"
              value={weekStartMonday}
              onChange={(e) => setWeekStartMonday(e.target.value)}
            />
          </label>
          <label className="field">
            How often did you fill in the card?
            <select
              value={fillFrequency}
              onChange={(e) =>
                setFillFrequency(e.target.value as DiaryWeekEntry["fillFrequency"])
              }
            >
              <option value="">Select…</option>
              {card.fillFrequencyOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field" style={{ marginTop: "0.5rem" }}>
          Date started (for this card period)
          <input type="date" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} />
        </label>
      </section>

      <section className="card">
        <h2>Target problem behaviors (columns 1–4)</h2>
        <p className="muted">{card.targetBehaviorHint}</p>
        <div className="grid-2">
          {[0, 1, 2, 3].map((i) => (
            <label key={i} className="field">
              Behavior {card.targetBehaviorColumnLabels[i]}
              <input
                type="text"
                value={targetBehaviors[i]}
                onChange={(e) => {
                  const next = [...targetBehaviors] as [string, string, string, string];
                  next[i] = e.target.value;
                  setTargetBehaviors(next);
                }}
                placeholder="Name this target behavior"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Prompting events grid</h2>
        <p className="muted">{card.promptingEventsHint}</p>
        <p className="muted">
          Emotions and urges: {card.intensityScaleEmotionsUrges.min}–
          {card.intensityScaleEmotionsUrges.max}. {card.intensityScaleEmotionsUrges.hint}
        </p>
        <div className="diary-table-wrap">
          <table className="diary-grid">
            <thead>
              <tr>
                <th>Prompting event</th>
                <th>Date</th>
                {card.emotionColumns.map((em) => (
                  <th key={em.id} title={em.label}>
                    {em.label.replace(/ \//g, "/").slice(0, 12)}
                    <br />
                    <span className="th-sub">0–5</span>
                  </th>
                ))}
                {[0, 1, 2, 3].map((i) => (
                  <th key={`u${i}`} colSpan={2}>
                    {targetBehaviors[i]?.trim() || `Target ${i + 1}`}
                    <br />
                    <span className="th-sub">Urge / Act</span>
                  </th>
                ))}
                <th>
                  Used skills
                  <br />
                  <span className="th-sub">0–7</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((row, ri) => (
                <tr key={ri}>
                  <td>
                    <textarea
                      className="cell-text"
                      value={row.prompt}
                      onChange={(e) => updateEvent(ri, { prompt: e.target.value })}
                      rows={2}
                      placeholder="Trigger / facts"
                    />
                    <DictateParagraphControls
                      mergeChunk={(chunk) =>
                        setEvents((prev) => {
                          const next = [...prev];
                          const row = { ...next[ri] };
                          row.prompt = appendSpokenChunk(row.prompt, chunk);
                          next[ri] = row;
                          return next;
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      className="cell-date"
                      value={row.rowDate}
                      onChange={(e) => updateEvent(ri, { rowDate: e.target.value })}
                    />
                  </td>
                  {card.emotionColumns.map((em) => (
                    <td key={em.id}>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        className="cell-num"
                        value={row.emotions[em.id] ?? 0}
                        onChange={(e) =>
                          setEmotionCell(ri, em.id, Math.min(5, Math.max(0, Number(e.target.value) || 0)))
                        }
                      />
                    </td>
                  ))}
                  {[0, 1, 2, 3].map((slot) => (
                    <Fragment key={`slot-${ri}-${slot}`}>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          className="cell-num"
                          value={row.urges[slot]}
                          onChange={(e) =>
                            setUrgeCell(ri, slot, Math.min(5, Math.max(0, Number(e.target.value) || 0)))
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="cell-select"
                          value={row.actions[slot]}
                          onChange={(e) => setActionCell(ri, slot, e.target.value as ActionYN)}
                        >
                          <option value="">—</option>
                          <option value="y">Y</option>
                          <option value="n">N</option>
                        </select>
                      </td>
                    </Fragment>
                  ))}
                  <td>
                    <select
                      className="cell-select-wide"
                      value={row.usedSkills}
                      onChange={(e) => updateEvent(ri, { usedSkills: Number(e.target.value) })}
                    >
                      {usedLegend.map((L) => (
                        <option key={L.value} value={L.value}>
                          {L.value}: {L.text}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details style={{ marginTop: "0.75rem" }}>
          <summary className="muted">Used skills 0–7 legend</summary>
          <ol className="muted" style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            {usedLegend.map((L) => (
              <li key={L.value}>
                <strong>{L.value}</strong> — {L.text}
              </li>
            ))}
          </ol>
        </details>
      </section>

      <section className="card">
        <h2>{card.otherEventsSectionTitle}</h2>
        <div className="grid-2">
          {card.otherEventsWeekdays.map((d) => (
            <label key={d.id} className="field">
              {d.label}
              <textarea
                value={otherEventsByWeekday[d.id as WeekdayId]}
                onChange={(e) =>
                  setOtherEventsByWeekday((prev) => ({
                    ...prev,
                    [d.id]: e.target.value,
                  }))
                }
                rows={2}
              />
              <DictateParagraphControls
                mergeChunk={(chunk) =>
                  setOtherEventsByWeekday((prev) => ({
                    ...prev,
                    [d.id]: appendSpokenChunk(prev[d.id as WeekdayId] ?? "", chunk),
                  }))
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Skills used (check each day you used the skill)</h2>
        <p className="muted">Same rows as <code>DBT Diary Card pg 2.png</code> — Mon through Sun.</p>
        {skills.modules.map((mod) => (
          <div key={mod.id} style={{ marginBottom: "1rem" }}>
            <h3>
              {mod.name}
              {mod.sectionNumber != null ? ` (How to #${mod.sectionNumber})` : ""}
            </h3>
            <div className="diary-table-wrap">
              <table className="skills-week">
                <thead>
                  <tr>
                    <th>Skill</th>
                    {skills.weekdayLabels.map((lb) => (
                      <th key={lb}>{lb}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mod.skills.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.label}</strong>
                        {s.hint ? <div className="muted skill-hint">{s.hint}</div> : null}
                      </td>
                      {skills.weekdayIds.map((d) => (
                        <td key={d} className="skill-check-cell">
                          <input
                            type="checkbox"
                            checked={!!skillsByDay[d as WeekdayId]?.[s.id]}
                            onChange={() => toggleSkillDay(d as WeekdayId, s.id)}
                            aria-label={`${s.label} on ${d}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <label className="field">
          {skills.skillsToPracticeNextWeekTitle}
          <textarea
            value={skillsToPracticeNextWeek}
            onChange={(e) => setSkillsToPracticeNextWeek(e.target.value)}
            rows={3}
            placeholder="Skills to focus on next week"
          />
          <DictateParagraphControls
            mergeChunk={(chunk) => setSkillsToPracticeNextWeek((p) => appendSpokenChunk(p, chunk))}
          />
        </label>
      </section>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={save}>
          Save diary week
        </button>
        {savedMsg ? <span className="muted">{savedMsg}</span> : null}
      </div>
    </>
  );
}
