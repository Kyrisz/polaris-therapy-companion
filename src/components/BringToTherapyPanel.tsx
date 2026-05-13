import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import weeklyReview from "../../data/weekly-review.json";
import { DictateParagraphControls } from "./DictateParagraphControls";
import { addCalendarDaysLocal, mondayContainingLocalDate, formatLocalYMD } from "../diary/diaryWeekModel";
import { appendSpokenChunk } from "../journal/spokenTextAppend";
import { buildInsights } from "../insights/buildInsights";
import {
  loadDayTaglines,
  loadDiaryWeeks,
  loadJournal,
  loadMood,
  loadSpiral,
  loadWeekly,
} from "../storage";

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

export function BringToTherapyPanel() {
  const defaultYm = formatLocalYMD(new Date()).slice(0, 7);
  const [scope, setScope] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(() => mondayContainingLocalDate(new Date()));
  const [ym, setYm] = useState(defaultYm);
  const [topSummary, setTopSummary] = useState("");
  const [includeWeekly, setIncludeWeekly] = useState(true);
  const [includeJournalTitles, setIncludeJournalTitles] = useState(true);
  const [includeMood, setIncludeMood] = useState(true);
  const [includeTaglines, setIncludeTaglines] = useState(true);
  const [includeSpiral, setIncludeSpiral] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [msg, setMsg] = useState("");

  const weekEnd = useMemo(() => addCalendarDaysLocal(weekStart, 6), [weekStart]);
  const monthDays = useMemo(() => daysInMonthYm(ym), [ym]);
  const monthStart = monthDays[0] ?? "";
  const monthEnd = monthDays[monthDays.length - 1] ?? "";

  function buildMd(): string {
    const lines: string[] = [];
    const title =
      scope === "week"
        ? `# Bring to therapy — week ${weekStart}–${weekEnd}`
        : `# Bring to therapy — ${ym}`;
    lines.push(title, "");
    lines.push("_Generated on this device; review before sharing._", "");
    if (topSummary.trim()) {
      lines.push("## Top summary", topSummary.trim(), "");
    }

    if (scope === "week") {
      const wk = loadWeekly().find((w) => w.weekStart === weekStart);
      if (includeWeekly && wk) {
        lines.push("## Weekly review");
        for (const [id, text] of Object.entries(wk.responses || {})) {
          const t = String(text || "").trim();
          if (!t) continue;
          lines.push(`- **${promptLabel(id)}:** ${t.replace(/\n/g, " ")}`);
        }
        lines.push("");
      }
    } else {
      const weeksInMonth = loadWeekly().filter((w) => {
        const ws = w.weekStart;
        const we = addCalendarDaysLocal(ws, 6);
        return we >= monthStart && ws <= monthEnd;
      });
      if (includeWeekly && weeksInMonth.length) {
        lines.push("## Weekly reviews (month)");
        for (const wk of weeksInMonth) {
          lines.push(`### Week ${wk.weekStart}`);
          for (const [id, text] of Object.entries(wk.responses || {})) {
            const t = String(text || "").trim();
            if (!t) continue;
            lines.push(`- **${promptLabel(id)}:** ${t.replace(/\n/g, " ")}`);
          }
        }
        lines.push("");
      }
    }

    const j0 = loadJournal();
    const jFiltered =
      scope === "week"
        ? j0.filter((j) => inYmdRange(j.entryDate, weekStart, weekEnd))
        : j0.filter((j) => j.entryDate >= monthStart && j.entryDate <= monthEnd);
    if (includeJournalTitles && jFiltered.length) {
      lines.push("## Journal (titles)");
      for (const j of jFiltered.slice().sort((a, b) => (a.entryDate < b.entryDate ? -1 : 1))) {
        const tit = j.title.trim() || "(untitled)";
        lines.push(`- ${j.entryDate} · ${tit} · _${j.kind.replace(/_/g, " ")}_`);
      }
      lines.push("");
    }

    const moods = loadMood().filter((m) => {
      const d = moodDay(m.at);
      return scope === "week" ? inYmdRange(d, weekStart, weekEnd) : d >= monthStart && d <= monthEnd;
    });
    if (includeMood && moods.length) {
      const avg = moods.reduce((s, m) => s + m.mood, 0) / moods.length;
      lines.push("## Mood");
      lines.push(`- Check-ins: ${moods.length} · average level ${avg.toFixed(1)} (0 rough → 10 calmer)`);
      lines.push("");
    }

    if (includeTaglines) {
      const map = loadDayTaglines();
      const keys =
        scope === "week"
          ? Object.keys(map).filter((d) => inYmdRange(d, weekStart, weekEnd))
          : Object.keys(map).filter((d) => d >= monthStart && d <= monthEnd);
      const nonEmpty = keys.filter((d) => map[d]?.trim());
      if (nonEmpty.length) {
        lines.push("## Memory lines");
        nonEmpty.sort().forEach((d) => lines.push(`- ${d}: ${map[d]?.trim()}`));
        lines.push("");
      }
    }

    if (includeSpiral) {
      const spir = loadSpiral().filter((s) => {
        const d = moodDay(s.at);
        return scope === "week" ? inYmdRange(d, weekStart, weekEnd) : d >= monthStart && d <= monthEnd;
      });
      if (spir.length) {
        lines.push("## Spiral logs");
        spir.slice(-12).forEach((s) => {
          lines.push(
            `- ${moodDay(s.at)} · peak ${s.peakIntensity} · ${(s.stages?.trigger || "").slice(0, 100) || "—"}`
          );
        });
        lines.push("");
      }
    }

    if (includeInsights) {
      const snap = buildInsights(loadDiaryWeeks(), loadJournal(), loadMood(), loadSpiral());
      lines.push("## Snapshot (all-time device totals)");
      lines.push(
        `- Diary rows with dates: ${snap.diaryRowCount} · journal entries: ${snap.journalEntryCount} · mood logs: ${snap.moodLogCount} · spirals: ${snap.spiralCount}`
      );
      if (snap.moodAvgAll != null) lines.push(`- Overall mood average (all logs): ${snap.moodAvgAll.toFixed(1)}`);
      lines.push("");
    }

    lines.push("## Print routes");
    lines.push(
      scope === "week"
        ? `- [Open print diary week](/print/diary-week) (choose the same week in the print view if needed).`
        : `- [Open print month](/print/month?ym=${encodeURIComponent(ym)}) for a table or JSON export for this month only.`
    );
    return lines.join("\n");
  }

  function copy() {
    void navigator.clipboard.writeText(buildMd());
    setMsg("Copied to clipboard.");
    window.setTimeout(() => setMsg(""), 2200);
  }

  function download() {
    const blob = new Blob([buildMd()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = scope === "week" ? `week-${weekStart}` : `month-${ym}`;
    a.href = url;
    a.download = `therapy-bundle-${stamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Download started.");
    window.setTimeout(() => setMsg(""), 2200);
  }

  const printHref =
    scope === "week"
      ? `/print/therapy-bundle?scope=week&weekStart=${encodeURIComponent(weekStart)}`
      : `/print/therapy-bundle?scope=month&ym=${encodeURIComponent(ym)}`;

  return (
    <section className="card bring-therapy-panel" aria-labelledby="bring-therapy-h">
      <h3 id="bring-therapy-h" className="dash-section-title">
        Bring to therapy bundle
      </h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Assemble one markdown summary you can copy, email to yourself, or drop into notes. Nothing uploads
        automatically.
      </p>

      <div className="therapy-scope-toggle" role="group" aria-label="Time range">
        <button type="button" className={`btn secondary btn-compact ${scope === "week" ? "on" : ""}`} onClick={() => setScope("week")}>
          One week
        </button>
        <button type="button" className={`btn secondary btn-compact ${scope === "month" ? "on" : ""}`} onClick={() => setScope("month")}>
          One month
        </button>
      </div>

      {scope === "week" ? (
        <label className="field">
          Week starting (Monday)
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </label>
      ) : (
        <label className="field">
          Month
          <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} />
        </label>
      )}

      <label className="field">
        Top summary (optional)
        <textarea
          rows={4}
          value={topSummary}
          onChange={(e) => setTopSummary(e.target.value)}
          placeholder="3–5 sentences: what matters most to bring up, what changed, what you want help with."
        />
        <DictateParagraphControls mergeChunk={(chunk) => setTopSummary((p) => appendSpokenChunk(p, chunk))} />
      </label>

      <fieldset className="bring-therapy-fieldset">
        <legend className="visually-hidden">Sections to include</legend>
        <label className="checkbox-row">
          <input type="checkbox" checked={includeWeekly} onChange={(e) => setIncludeWeekly(e.target.checked)} />
          Weekly review text
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={includeJournalTitles} onChange={(e) => setIncludeJournalTitles(e.target.checked)} />
          Journal titles (kinds)
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={includeMood} onChange={(e) => setIncludeMood(e.target.checked)} />
          Mood summary for range
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={includeTaglines} onChange={(e) => setIncludeTaglines(e.target.checked)} />
          Memory lines (day taglines)
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={includeSpiral} onChange={(e) => setIncludeSpiral(e.target.checked)} />
          Spiral log lines
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={includeInsights} onChange={(e) => setIncludeInsights(e.target.checked)} />
          Gentle all-time snapshot (from Insights data)
        </label>
      </fieldset>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Link className="btn" to={printHref}>
          Print / save as PDF
        </Link>
        <details className="bring-therapy-more">
          <summary className="btn secondary">More options</summary>
          <div className="bring-therapy-more-inner">
            <button type="button" className="btn secondary btn-compact" onClick={copy}>
              Copy markdown
            </button>
            <button type="button" className="btn secondary btn-compact" onClick={download}>
              Download .md
            </button>
          </div>
        </details>
      </div>
      {msg ? (
        <p className="wizard-saved" role="status" aria-live="polite">
          {msg}
        </p>
      ) : null}
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
        For a formatted diary grid, use{" "}
        <Link to="/print/diary-week">Print week</Link> or <Link to={`/print/month?ym=${encodeURIComponent(ym)}`}>Print month</Link>.
      </p>
    </section>
  );
}
