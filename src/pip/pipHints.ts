export type PipHint = {
  id: string;
  screen: "dashboard" | "therapy" | "search";
  text: string;
  action?: { label: string; to: string };
};

export const PIP_HINTS: PipHint[] = [
  {
    id: "pip-therapy-session-notes",
    screen: "therapy",
    text: "If your mind blanks in-session, a short prep note can do the heavy lifting for you.",
    action: { label: "Open session notes", to: "/therapy?tab=prep&focus=prep" },
  },
  {
    id: "pip-therapy-bundle",
    screen: "therapy",
    text: "Bundle / Print makes a simple one‑page summary you can save as a PDF.",
    action: { label: "Open bundle", to: "/therapy?tab=bring" },
  },
  {
    id: "pip-dashboard-weekly-intention",
    screen: "dashboard",
    text: "Pick one gentle focus for the week—no streaks, just a steady point.",
    action: { label: "Set weekly focus", to: "/dashboard" },
  },
];

