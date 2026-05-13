import type { SafetyPlanData } from "../types";
import {
  loadDiaryWeeks,
  loadDisplayName,
  loadJournal,
  loadMood,
  loadSafetyPlan,
  loadStreak,
  loadWeekly,
} from "../storage";

const KEY = "dbt-app:setup-wizard";
const STEP_RESUME_KEY = "dbt-app:setup-wizard-resume-step";

export type SetupWizardStatus = "pending" | "completed" | "skipped";

type SetupRecord =
  | { v: 1; status: "pending" }
  | { v: 1; status: "completed"; completedAt: string; reason?: "legacy" }
  | { v: 1; status: "skipped"; skippedAt: string };

function readRecord(): SetupRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const r = o as Record<string, unknown>;
    if (r.v !== 1) return null;
    if (r.status === "pending") return { v: 1, status: "pending" };
    if (r.status === "completed" && typeof r.completedAt === "string") {
      return { v: 1, status: "completed", completedAt: r.completedAt, reason: r.reason as "legacy" | undefined };
    }
    if (r.status === "skipped" && typeof r.skippedAt === "string") {
      return { v: 1, status: "skipped", skippedAt: r.skippedAt };
    }
    return null;
  } catch {
    return null;
  }
}

function writeRecord(r: SetupRecord) {
  localStorage.setItem(KEY, JSON.stringify(r));
}

export function safetyPlanHasMeaningfulContent(data: SafetyPlanData): boolean {
  return [data.whoCanHelp, data.crisisNumbers, data.groundingList, data.ifThenPlan, data.environmentNotes].some(
    (s) => typeof s === "string" && s.trim().length > 0
  );
}

function legacyDeviceAlreadyInUse(): boolean {
  if (loadDisplayName().trim()) return true;
  if (safetyPlanHasMeaningfulContent(loadSafetyPlan())) return true;
  if (loadDiaryWeeks().length > 0) return true;
  if (loadJournal().length > 0) return true;
  if (loadWeekly().length > 0) return true;
  if (loadMood().length > 0) return true;
  const st = loadStreak();
  if (st.currentStreak > 0 || st.longestStreak > 0) return true;
  return false;
}

/** Current setup status (migrates existing users once when storage key was absent). */
export function loadSetupWizardStatus(): SetupWizardStatus {
  const existing = readRecord();
  if (existing) {
    if (existing.status === "pending") return "pending";
    if (existing.status === "skipped") return "skipped";
    return "completed";
  }
  if (legacyDeviceAlreadyInUse()) {
    writeRecord({ v: 1, status: "completed", completedAt: new Date().toISOString(), reason: "legacy" });
    return "completed";
  }
  return "pending";
}

export function completeSetupWizard() {
  writeRecord({ v: 1, status: "completed", completedAt: new Date().toISOString() });
}

export function skipSetupWizard() {
  writeRecord({ v: 1, status: "skipped", skippedAt: new Date().toISOString() });
}

/** Clear status so the guided flow runs again (does not remove your diary or safety data). */
export function resetSetupWizardProgress() {
  writeRecord({ v: 1, status: "pending" });
}

export function stashSetupWizardStep(step: number) {
  sessionStorage.setItem(STEP_RESUME_KEY, String(step));
}

export function takeSetupWizardResumeStep(): number | null {
  const raw = sessionStorage.getItem(STEP_RESUME_KEY);
  sessionStorage.removeItem(STEP_RESUME_KEY);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
