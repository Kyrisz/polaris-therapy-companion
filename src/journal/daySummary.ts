import diaryCard from "../../data/diary-card.json";
import {
  formatLocalYMD,
  mondayOfWeekContaining,
  WEEKDAY_LABEL,
  weekdayIdFromISO,
} from "../diary/diaryWeekModel";
import type { WeekdayId } from "../types";
import { loadDayTagline, loadDiaryWeeks, loadJournal, loadMood, loadSpiral } from "../storage";

const card = diaryCard as typeof diaryCard;

function moodsOnLocalDate(dateLocal: string) {
  return loadMood().filter((m) => formatLocalYMD(new Date(m.at)) === dateLocal);
}

function spiralsOnLocalDate(dateLocal: string) {
  return loadSpiral().filter((s) => formatLocalYMD(new Date(s.at)) === dateLocal);
}

function journalOnDate(dateLocal: string) {
  return loadJournal()
    .filter((j) => j.entryDate === dateLocal)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

function weekAndRowForDate(dateLocal: string) {
  const mon = mondayOfWeekContaining(dateLocal);
  const week = loadDiaryWeeks().find((w) => w.weekStartMonday === mon) ?? null;
  const row = week?.events.find((e) => e.rowDate === dateLocal) ?? null;
  return { week, row };
}

function rowHasContent(
  row: NonNullable<ReturnType<typeof weekAndRowForDate>["row"]>
): boolean {
  if (row.prompt.trim()) return true;
  return card.emotionColumns.some((c) => (row.emotions[c.id] ?? 0) > 0);
}

const kindLabel: Record<string, string> = {
  freeform: "Reflection",
  emotion: "Emotion note",
  situation: "Situation note",
  scheduled_reflection: "Scheduled reflection",
  session_prep: "Session prep",
  session_debrief: "Session debrief",
};

/**
 * Plain-language day recap from local data only (no network / AI).
 */
export function buildDaySummary(dateLocal: string): string {
  const lines: string[] = [];
  const pretty = new Date(dateLocal + "T12:00:00");
  const wd = weekdayIdFromISO(dateLocal);
  lines.push(
    `End-of-day summary for ${WEEKDAY_LABEL[wd as WeekdayId]}, ${pretty.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    })} (${dateLocal})`
  );
  lines.push("");
  lines.push("This recap is generated on your device from what you logged—nothing is sent online.");
  lines.push("");

  const tag = loadDayTagline(dateLocal).trim();
  if (tag) {
    lines.push("Memory line for this day");
    lines.push(`• ${tag}`);
    lines.push("");
  }

  const { week, row } = weekAndRowForDate(dateLocal);
  const wdNote = week?.otherEventsByWeekday[wd]?.trim();

  if (row && rowHasContent(row)) {
    lines.push("DBT diary (main event row)");
    if (row.prompt.trim()) lines.push(`• What stood out: ${row.prompt.trim()}`);
    const emoBits = card.emotionColumns
      .map((c) => ({ label: c.label, v: row.emotions[c.id] ?? 0 }))
      .filter((x) => x.v > 0)
      .map((x) => `${x.label} (${x.v}/5)`);
    if (emoBits.length) lines.push(`• Emotion intensities: ${emoBits.join(", ")}`);
    lines.push(`• Skills effectiveness code (0–7): ${row.usedSkills}`);
    lines.push("");
  } else {
    lines.push("DBT diary: no filled main row for this date yet.");
    lines.push("");
  }

  if (wdNote) {
    lines.push("Other note for this weekday (from diary card)");
    lines.push(`• ${wdNote}`);
    lines.push("");
  }

  const moods = moodsOnLocalDate(dateLocal);
  if (moods.length) {
    lines.push("Mood check-ins");
    moods.forEach((m) => {
      const t = new Date(m.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      lines.push(
        `• ${t}: mood ${m.mood}/10${m.emotions.length ? ` — ${m.emotions.join(", ")}` : ""}${m.bodyNote ? ` — body: ${m.bodyNote}` : ""}${m.notes ? ` — note: ${m.notes}` : ""}`
      );
    });
    lines.push("");
  }

  const spirals = spiralsOnLocalDate(dateLocal);
  if (spirals.length) {
    lines.push("Spiral logs");
    spirals.forEach((s) => {
      const t = new Date(s.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      const ex = (s.stages.trigger || "").slice(0, 120);
      lines.push(`• ${t}: peak distress ${s.peakIntensity}/10${ex ? ` — trigger: ${ex}` : ""}`);
    });
    lines.push("");
  }

  const journals = journalOnDate(dateLocal);
  if (journals.length) {
    lines.push("Journal");
    journals.forEach((j) => {
      const t = new Date(j.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      const head = j.title.trim() || kindLabel[j.kind] || "Entry";
      lines.push(`• ${t} — ${head}: ${j.body.trim().slice(0, 400)}${j.body.length > 400 ? "…" : ""}`);
    });
    lines.push("");
  }

  const hasAnything =
    Boolean(tag) ||
    (row && rowHasContent(row)) ||
    Boolean(wdNote) ||
    moods.length > 0 ||
    spirals.length > 0 ||
    journals.length > 0;

  if (!hasAnything) {
    lines.push(
      "Nothing was logged for this day yet. When you add check-ins, mood logs, journal notes, or spirals, they will appear here."
    );
  } else {
    lines.push("—");
    lines.push("Closing line: you showed up by recording something. That counts.");
  }

  return lines.join("\n");
}
