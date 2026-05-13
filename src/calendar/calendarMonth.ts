import { formatLocalYMD } from "../diary/diaryWeekModel";

/** Month 1–12, year e.g. 2026 → list of 35–42 cells (null = padding). */
export function buildMonthCells(year: number, month1to12: number): (string | null)[] {
  const first = new Date(year, month1to12 - 1, 1);
  const startPad = first.getDay();
  const dim = new Date(year, month1to12, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= dim; d++) {
    cells.push(formatLocalYMD(new Date(year, month1to12 - 1, d)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function parseYearMonth(ym: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function formatYearMonth(year: number, month1to12: number): string {
  return `${year}-${String(month1to12).padStart(2, "0")}`;
}

export function shiftYearMonth(ym: string, deltaMonths: number): string {
  const p = parseYearMonth(ym);
  if (!p) return ym;
  const d = new Date(p.year, p.month - 1 + deltaMonths, 1);
  return formatYearMonth(d.getFullYear(), d.getMonth() + 1);
}

/** Every calendar date in the month (local), in order. */
export function listDaysInMonth(year: number, month1to12: number): string[] {
  const dim = new Date(year, month1to12, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= dim; d++) {
    out.push(formatLocalYMD(new Date(year, month1to12 - 1, d)));
  }
  return out;
}

/** First and last YYYY-MM-DD (local) for that calendar month. */
export function monthDateRange(ym: string): { start: string; end: string } | null {
  const p = parseYearMonth(ym);
  if (!p) return null;
  const start = formatLocalYMD(new Date(p.year, p.month - 1, 1));
  const dim = new Date(p.year, p.month, 0).getDate();
  const end = formatLocalYMD(new Date(p.year, p.month - 1, dim));
  return { start, end };
}
