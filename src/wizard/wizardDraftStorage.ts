import type { ActionYN } from "../types";

const KEY = "dbt-app:wizard-draft";

export type WizardDraftV1 = {
  version: 1;
  updatedAt: string;
  checkInDate: string;
  stepIndex: number;
  targets: [string, string, string, string];
  prompt: string;
  emotions: Record<string, number>;
  urges: [number, number, number, number];
  actions: [ActionYN, ActionYN, ActionYN, ActionYN];
  usedSkills: number;
  skillsToday: Record<string, boolean>;
  otherNote: string;
};

export function loadWizardDraft(): WizardDraftV1 | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as WizardDraftV1;
    if (o?.version !== 1 || typeof o.checkInDate !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function saveWizardDraft(draft: Omit<WizardDraftV1, "version" | "updatedAt"> & { version?: 1 }) {
  const payload: WizardDraftV1 = {
    version: 1,
    updatedAt: new Date().toISOString(),
    checkInDate: draft.checkInDate,
    stepIndex: draft.stepIndex,
    targets: draft.targets,
    prompt: draft.prompt,
    emotions: draft.emotions,
    urges: draft.urges,
    actions: draft.actions,
    usedSkills: draft.usedSkills,
    skillsToday: draft.skillsToday,
    otherNote: draft.otherNote,
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function clearWizardDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function wizardDraftHasProgress(d: WizardDraftV1): boolean {
  if (d.stepIndex > 0) return true;
  if (d.prompt.trim()) return true;
  return d.targets.some((t) => t.trim().length > 0);
}
