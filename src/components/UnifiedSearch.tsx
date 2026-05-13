import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import weeklyReview from "../../data/weekly-review.json";
import { formatLocalYMD } from "../diary/diaryWeekModel";
import {
  loadDayTaglines,
  loadDiaryWeeks,
  loadJournal,
  loadMood,
  loadSpiral,
  loadWeekly,
} from "../storage";

type Hit = { id: string; kind: string; label: string; excerpt: string; to: string };

const WR = weeklyReview as { prompts: { id: string; label: string }[] };

function promptLabel(id: string): string {
  return WR.prompts.find((p) => p.id === id)?.label ?? id;
}

function moodLocalDay(at: string): string {
  try {
    return formatLocalYMD(new Date(at));
  } catch {
    return "";
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function UnifiedSearch() {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const hits = useMemo(() => {
    const query = norm(q);
    if (query.length < 2) return [] as Hit[];
    const out: Hit[] = [];

    for (const j of loadJournal()) {
      const blob = `${j.title}\n${j.body}\n${(j.tags || []).join(" ")}`.toLowerCase();
      if (!blob.includes(query)) continue;
      const ex = (j.body || j.title).slice(0, 140).replace(/\s+/g, " ");
      out.push({
        id: `j-${j.id}`,
        kind: "Journal",
        label: `Journal · ${j.entryDate}${j.title ? ` · ${j.title}` : ""}`,
        excerpt: ex + (j.body.length > 140 ? "…" : ""),
        to: `/day/${encodeURIComponent(j.entryDate)}`,
      });
    }

    for (const w of loadWeekly()) {
      const parts = Object.entries(w.responses || {})
        .map(([k, v]) => `${promptLabel(k)}: ${v}`)
        .join("\n");
      if (!norm(parts).includes(query)) continue;
      out.push({
        id: `w-${w.id}`,
        kind: "Weekly",
        label: `Weekly review · week ${w.weekStart}`,
        excerpt: parts.slice(0, 160).replace(/\s+/g, " ") + (parts.length > 160 ? "…" : ""),
        to: `/weekly?weekStart=${encodeURIComponent(w.weekStart)}`,
      });
    }

    for (const week of loadDiaryWeeks()) {
      (week.events || []).forEach((row, idx) => {
        const line = `${row.rowDate} ${row.prompt} ${JSON.stringify(row.emotions)}`;
        if (!norm(line).includes(query)) return;
        out.push({
          id: `d-${week.id}-${idx}-${row.rowDate}`,
          kind: "Diary",
          label: `Diary row · ${row.rowDate || week.weekStartMonday}`,
          excerpt: (row.prompt || "(no prompt)").slice(0, 140),
          to: row.rowDate ? `/day/${encodeURIComponent(row.rowDate)}` : `/diary-sheet`,
        });
      });
      const other = week.otherEventsByWeekday
        ? Object.entries(week.otherEventsByWeekday)
            .map(([d, t]) => `${d}: ${t}`)
            .join(" ")
        : "";
      if (other && norm(other).includes(query)) {
        out.push({
          id: `do-${week.id}`,
          kind: "Diary",
          label: `Diary · other events · week ${week.weekStartMonday}`,
          excerpt: other.slice(0, 140) + (other.length > 140 ? "…" : ""),
          to: `/weekly?weekStart=${encodeURIComponent(week.weekStartMonday)}`,
        });
      }
      if (week.skillsToPracticeNextWeek && norm(week.skillsToPracticeNextWeek).includes(query)) {
        out.push({
          id: `ds-${week.id}`,
          kind: "Diary",
          label: `Diary · skills next week · ${week.weekStartMonday}`,
          excerpt: week.skillsToPracticeNextWeek.slice(0, 160),
          to: `/weekly?weekStart=${encodeURIComponent(week.weekStartMonday)}`,
        });
      }
    }

    const taglines = loadDayTaglines();
    for (const [date, line] of Object.entries(taglines)) {
      if (!line.trim() || !norm(`${date} ${line}`).includes(query)) continue;
      out.push({
        id: `t-${date}`,
        kind: "Memory",
        label: `Memory line · ${date}`,
        excerpt: line.slice(0, 140),
        to: `/day/${date}`,
      });
    }

    for (const s of loadSpiral()) {
      const blob = `${s.outcomeNote} ${Object.values(s.stages || {}).join(" ")}`.toLowerCase();
      if (!blob.includes(query)) continue;
      out.push({
        id: `sp-${s.id}`,
        kind: "Spiral",
        label: `Spiral log · ${new Date(s.at).toLocaleString()}`,
        excerpt: (s.stages?.trigger || s.outcomeNote || "").slice(0, 120).replace(/\s+/g, " ") || "—",
        to: (() => {
          const d = moodLocalDay(s.at);
          return d ? `/day/${encodeURIComponent(d)}` : `/spiral`;
        })(),
      });
    }

    for (const m of loadMood()) {
      const d = moodLocalDay(m.at);
      const blob = `${m.notes} ${m.bodyNote} ${m.emotions.join(" ")} ${d}`.toLowerCase();
      if (!blob.includes(query)) continue;
      out.push({
        id: `m-${m.id}`,
        kind: "Mood",
        label: `Mood · ${d}`,
        excerpt: [m.notes, m.bodyNote].filter(Boolean).join(" · ").slice(0, 120) || `Level ${m.mood}`,
        to: d ? `/day/${encodeURIComponent(d)}` : `/mood`,
      });
    }

    out.sort((a, b) => a.label.localeCompare(b.label));
    return out.slice(0, 80);
  }, [q]);

  const groups = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const h of hits) {
      const arr = map.get(h.kind) || [];
      arr.push(h);
      map.set(h.kind, arr);
    }
    const order = ["Journal", "Weekly", "Diary", "Mood", "Spiral", "Memory"];
    const entries = Array.from(map.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return entries;
  }, [hits]);

  function isExpanded(kind: string): boolean {
    return Boolean(expanded[kind]);
  }

  return (
    <section className="card unified-search-card" aria-labelledby="unified-search-h">
      <h3 id="unified-search-h" className="dash-section-title">
        Search everything (local)
      </h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Searches across journal, weekly review, diary prompts, memory lines, spirals, and mood notes (2+ characters).
      </p>
      <label className="field">
        Search
        <div className="search-row">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="word or phrase"
            autoComplete="off"
          />
          <button
            type="button"
            className="btn secondary btn-compact"
            onClick={() => {
              setQ("");
              setExpanded({});
            }}
            disabled={!q.trim()}
          >
            Clear
          </button>
        </div>
      </label>
      {norm(q).length > 0 && norm(q).length < 2 ? (
        <p className="muted">Type one more character.</p>
      ) : null}
      {!hits.length && norm(q).length >= 2 ? (
        <p className="muted pip-hint">
          No matches—try another word, or a shorter phrase.
        </p>
      ) : null}
      {hits.length ? (
        <div className="unified-search-groups">
          {groups.map(([kind, items]) => {
            const expandedNow = isExpanded(kind);
            const shown = expandedNow ? items : items.slice(0, 5);
            return (
              <details key={kind} className="unified-search-group" open>
                <summary className="unified-search-summary">
                  <span className="unified-search-kind">
                    <strong>{kind}</strong> <span className="muted">({items.length})</span>
                  </span>
                </summary>
                <ul className="unified-search-list">
                  {shown.map((h) => (
                    <li key={h.id}>
                      <Link to={h.to}>
                        <strong>{h.label}</strong>
                      </Link>
                      <div className="muted unified-search-excerpt">{h.excerpt}</div>
                    </li>
                  ))}
                </ul>
                {items.length > 5 ? (
                  <button
                    type="button"
                    className="btn secondary btn-compact"
                    onClick={() => setExpanded((m) => ({ ...m, [kind]: !Boolean(m[kind]) }))}
                  >
                    {expandedNow ? "Show fewer" : "Show more"}
                  </button>
                ) : null}
              </details>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
