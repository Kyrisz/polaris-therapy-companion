export type JournalTemplate = { id: string; label: string; body: string };

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  { id: "", label: "No template", body: "" },
  {
    id: "therapy_session_prep",
    label: "Therapy session prep",
    body: "What I want to bring up:\n\nWhat I hope we work on today:\n\nAny quick context (facts only):\n\nIf I freeze in-session, I want to remember to say:\n",
  },
  {
    id: "wise_mind",
    label: "Wise Mind",
    body: "Facts I notice:\n\nFeelings that showed up:\n\nWise mind (both together):\n",
  },
  {
    id: "abc",
    label: "ABC (antecedent / belief / consequence)",
    body: "A — What happened (facts):\n\nB — Thoughts or interpretations:\n\nC — What I felt / did next:\n",
  },
  {
    id: "please",
    label: "PLEASE basics",
    body: "PhysicaL (sleep, food, meds, pain):\n\nEating:\n\nAvoiding mood-altering substances:\n\nSleep:\n\nExercise:\n",
  },
  {
    id: "dear_man",
    label: "DEAR MAN (outline)",
    body: "Describe (facts):\n\nExpress (feelings):\n\nAssert (ask):\n\nReinforce (why it helps):\n\nMindful / Appear confident / Negotiate notes:\n",
  },
  {
    id: "opposite_action",
    label: "Opposite action",
    body: "Emotion:\n\nUrge or old habit:\n\nTiny opposite action I can try:\n\nWhat I hope it changes:\n",
  },
  {
    id: "self_soothe",
    label: "Self-soothe (5 senses)",
    body: "Vision:\n\nHearing:\n\nSmell / taste:\n\nTouch:\n\nMovement:\n",
  },
  {
    id: "gratitude_memory",
    label: "Memory for later",
    body: "Three words for today:\n\nOne person or place I want to remember:\n\nOne thing that was hard but I got through:\n",
  },
];
