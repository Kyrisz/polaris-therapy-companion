import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import diaryCard from "../../data/diary-card.json";
import skillsModules from "../../data/skills-modules.json";
import type { ActionYN, DiaryWeekEntry } from "../types";
import {
  WEEKDAY_LABEL,
  allSkillIds,
  emptyPromptRow,
  findRowIndexForCheckIn,
  loadOrCreateWeek,
  mondayOfWeekContaining,
  persistWeek,
  todayISO,
  weekdayIdFromISO,
} from "../diary/diaryWeekModel";
import { recordGuidedCheckInForDate } from "../journal/streakLogic";
import {
  clearWizardDraft,
  loadWizardDraft,
  saveWizardDraft,
  wizardDraftHasProgress,
} from "../wizard/wizardDraftStorage";

type DiaryCard = typeof diaryCard;
type SkillsFile = typeof skillsModules;

const card = diaryCard as DiaryCard;
const skills = skillsModules as SkillsFile;

/** Urge/action steps only for target slots with a non-empty label (trimmed). */
function buildStepIds(targets: [string, string, string, string]): string[] {
  const ids: string[] = ["intro", "targets", "prompt"];
  card.emotionColumns.forEach((em) => ids.push(`emotion:${em.id}`));
  for (let i = 0; i < 4; i++) {
    if (targets[i]?.trim()) {
      ids.push(`urge:${i}`);
      ids.push(`action:${i}`);
    }
  }
  ids.push("usedSkills");
  skills.modules.forEach((mod) => ids.push(`skills:${mod.id}`));
  ids.push("other", "review");
  return ids;
}

function cloneTargets(t: [string, string, string, string]): [string, string, string, string] {
  return [...t] as [string, string, string, string];
}

export default function DiaryWizard() {
  const [checkInDate, setCheckInDate] = useState(todayISO);
  const [stepIndex, setStepIndex] = useState(0);
  const [savedBanner, setSavedBanner] = useState("");

  const [baseWeek, setBaseWeek] = useState<DiaryWeekEntry | null>(null);
  const [rowIndex, setRowIndex] = useState<number | null>(null);

  const [targets, setTargets] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [prompt, setPrompt] = useState("");
  const [emotions, setEmotions] = useState<Record<string, number>>({});
  const [urges, setUrges] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [actions, setActions] = useState<[ActionYN, ActionYN, ActionYN, ActionYN]>(["", "", "", ""]);
  const [usedSkills, setUsedSkills] = useState(0);
  const [skillsToday, setSkillsToday] = useState<Record<string, boolean>>({});
  const [otherNote, setOtherNote] = useState("");
  const [journalHintDate, setJournalHintDate] = useState<string | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const skipDraftSave = useRef(true);

  const hydrateFromWeek = useCallback((dateISO: string) => {
    const mon = mondayOfWeekContaining(dateISO);
    const week = loadOrCreateWeek(mon);
    const ri = findRowIndexForCheckIn(week.events, dateISO);
    setBaseWeek(week);
    setRowIndex(ri);
    setTargets(cloneTargets(week.targetBehaviors));

    const wd = weekdayIdFromISO(dateISO);
    const skillMap: Record<string, boolean> = {};
    allSkillIds().forEach((id) => {
      skillMap[id] = week.skillsByDay[wd]?.[id] ?? false;
    });

    if (ri !== null) {
      const row = week.events[ri];
      setPrompt(row.prompt || "");
      setEmotions({ ...emptyPromptRow().emotions, ...row.emotions });
      setUrges(row.urges?.length === 4 ? [...row.urges] as typeof urges : [0, 0, 0, 0]);
      setActions(
        row.actions?.length === 4 ? ([...row.actions] as typeof actions) : ["", "", "", ""]
      );
      setUsedSkills(Math.min(7, Math.max(0, row.usedSkills ?? 0)));
      allSkillIds().forEach((id) => {
        skillMap[id] = week.skillsByDay[wd]?.[id] ?? false;
      });
    } else {
      setPrompt("");
      setEmotions({ ...emptyPromptRow().emotions });
      setUrges([0, 0, 0, 0]);
      setActions(["", "", "", ""]);
      setUsedSkills(0);
    }
    setSkillsToday(skillMap);
    setOtherNote(week.otherEventsByWeekday[wd] || "");
    setStepIndex(0);
    setSavedBanner("");
    setJournalHintDate(null);
  }, []);

  useEffect(() => {
    skipDraftSave.current = true;
    setResumeDismissed(false);
    hydrateFromWeek(checkInDate);
    const id = requestAnimationFrame(() => {
      skipDraftSave.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [checkInDate, hydrateFromWeek]);

  useEffect(() => {
    if (skipDraftSave.current) return;
    if (rowIndex === null) return;
    const hasProgress =
      stepIndex > 0 ||
      Boolean(prompt.trim()) ||
      targets.some((t) => t.trim()) ||
      Boolean(otherNote.trim());
    if (!hasProgress) return;
    const t = window.setTimeout(() => {
      saveWizardDraft({
        checkInDate,
        stepIndex,
        targets,
        prompt,
        emotions,
        urges,
        actions,
        usedSkills,
        skillsToday,
        otherNote,
      });
    }, 650);
    return () => window.clearTimeout(t);
  }, [
    checkInDate,
    stepIndex,
    targets,
    prompt,
    emotions,
    urges,
    actions,
    usedSkills,
    skillsToday,
    otherNote,
    rowIndex,
  ]);

  const stepIds = useMemo(() => buildStepIds(targets), [targets]);
  const stepId = stepIds[stepIndex] ?? "review";
  const totalSteps = stepIds.length;

  useEffect(() => {
    setStepIndex((i) => (i >= stepIds.length ? Math.max(0, stepIds.length - 1) : i));
  }, [stepIds]);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".wizard-card h3.wizard-question");
    el?.focus();
  }, [stepIndex, stepId]);
  const weekday = weekdayIdFromISO(checkInDate);
  const weekdayName = WEEKDAY_LABEL[weekday];

  const canProceedFromIntro = rowIndex !== null;

  function next() {
    if (stepId === "intro" && !canProceedFromIntro) return;
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function saveCheckIn() {
    if (baseWeek === null || rowIndex === null) return;
    const week = { ...baseWeek, targetBehaviors: cloneTargets(targets) };
    const row = { ...week.events[rowIndex] };
    row.prompt = prompt.trim();
    row.rowDate = checkInDate;
    row.emotions = { ...emotions };
    const urgesOut = [...urges] as [number, number, number, number];
    const actionsOut = [...actions] as [ActionYN, ActionYN, ActionYN, ActionYN];
    for (let i = 0; i < 4; i++) {
      if (!targets[i]?.trim()) {
        urgesOut[i] = 0;
        actionsOut[i] = "";
      }
    }
    row.urges = urgesOut;
    row.actions = actionsOut;
    row.usedSkills = usedSkills;
    const nextEvents = [...week.events];
    nextEvents[rowIndex] = row;
    week.events = nextEvents;

    const wd = weekdayIdFromISO(checkInDate);
    const daySkills = { ...week.skillsByDay[wd] };
    allSkillIds().forEach((id) => {
      daySkills[id] = skillsToday[id] ?? false;
    });
    week.skillsByDay = { ...week.skillsByDay, [wd]: daySkills };
    week.otherEventsByWeekday = {
      ...week.otherEventsByWeekday,
      [wd]: otherNote.trim(),
    };
    week.createdAt = new Date().toISOString();

    persistWeek(week);
    clearWizardDraft();
    recordGuidedCheckInForDate(checkInDate);
    try {
      window.dispatchEvent(new Event("dbt-streak-updated"));
    } catch {
      /* ignore */
    }
    setSavedBanner("Saved for this device. You can change the date above anytime to check in for another day.");
    setJournalHintDate(checkInDate);
    setBaseWeek(loadOrCreateWeek(week.weekStartMonday));
  }

  const legend = card.usedSkillsColumn.legend;

  const draft = loadWizardDraft();
  const draftResumeSameDate =
    draft &&
    wizardDraftHasProgress(draft) &&
    draft.checkInDate === checkInDate &&
    rowIndex !== null &&
    baseWeek !== null;
  const draftOtherDate =
    draft && wizardDraftHasProgress(draft) && draft.checkInDate !== checkInDate ? draft : null;
  const showResumeHere =
    Boolean(draftResumeSameDate) &&
    !resumeDismissed &&
    draft!.stepIndex > stepIndex;

  function applyDraftResume() {
    const d = loadWizardDraft();
    if (!d || !wizardDraftHasProgress(d)) return;
    setTargets(cloneTargets(d.targets));
    setPrompt(d.prompt);
    setEmotions({ ...d.emotions });
    setUrges([...d.urges]);
    setActions([...d.actions]);
    setUsedSkills(d.usedSkills);
    setSkillsToday({ ...d.skillsToday });
    setOtherNote(d.otherNote);
    const ids = buildStepIds(d.targets);
    setStepIndex(Math.min(Math.max(0, d.stepIndex), Math.max(0, ids.length - 1)));
    setResumeDismissed(true);
  }

  function discardDraft() {
    clearWizardDraft();
    setResumeDismissed(true);
  }

  return (
    <div className="wizard">
      <nav className="wizard-exit" aria-label="Leave check-in">
        <Link to="/dashboard">Exit to Home</Link>
      </nav>

      {draftOtherDate ? (
        <div className="card wizard-resume-banner" role="status">
          <p className="muted" style={{ marginTop: 0 }}>
            You have an unfinished check-in saved for <strong>{draftOtherDate.checkInDate}</strong> (not this date).
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button type="button" className="btn btn-compact" onClick={() => setCheckInDate(draftOtherDate.checkInDate)}>
              Switch to that date
            </button>
            <button type="button" className="btn secondary btn-compact" onClick={discardDraft}>
              Clear saved draft
            </button>
          </div>
        </div>
      ) : null}

      {showResumeHere ? (
        <div className="card wizard-resume-banner" role="region" aria-label="Resume check-in">
          <p className="muted" style={{ marginTop: 0 }}>
            Continue where you left off? Your answers through step <strong>{draft!.stepIndex + 1}</strong> are saved
            only on this device.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button type="button" className="btn btn-compact" onClick={applyDraftResume}>
              Restore draft
            </button>
            <button type="button" className="btn secondary btn-compact" onClick={discardDraft}>
              Clear draft
            </button>
          </div>
        </div>
      ) : null}
      <div className="wizard-top">
        <p className="wizard-kicker">Check-in</p>
        <h2 className="wizard-title">One question at a time</h2>
        <p className="muted wizard-lead">
          Your answers are written to the same diary week as the printable card—without the full grid on
          screen.
        </p>
        <Link className="wizard-link-sheet" to="/diary-sheet">
          Open full diary sheet instead
        </Link>
      </div>

      <div className="wizard-card">
        <div className="wizard-progress">
          <div
            className="wizard-progress-fill"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <p className="wizard-step-count">
          Step {stepIndex + 1} of {totalSteps}
        </p>

        {stepId === "intro" ? (
          <section className="wizard-step">
            <h3 className="wizard-question" tabIndex={-1}>Which day is this check-in for?</h3>
            <p className="muted">
              Today is <strong>{weekdayName}</strong>. You can pick another date in the same week if you are
              catching up.
            </p>
            <label className="field">
              Date
              <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
            </label>
            {!canProceedFromIntro ? (
              <p className="wizard-warning">
                Every row on this week&apos;s card already has a note or date. Free a row on the{" "}
                <Link to="/diary-sheet">full sheet</Link>, or choose a different week by changing the date.
              </p>
            ) : (
              <p className="muted">
                We&apos;ll save this check-in to the week starting{" "}
                <strong>{mondayOfWeekContaining(checkInDate)}</strong>.
              </p>
            )}
          </section>
        ) : null}

        {stepId === "targets" ? (
          <section className="wizard-step">
            <h3 className="wizard-question" tabIndex={-1}>What are your target behaviors this week?</h3>
            <p className="muted">
              Short labels are enough (for example &quot;self-harm&quot;, &quot;drinking&quot;). Only slots you
              name here will get urge and action questions later—leave a box empty if you do not track that column.
            </p>
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="field">
                Target {i + 1} (optional)
                <input
                  type="text"
                  value={targets[i]}
                  onChange={(e) => {
                    const next = [...targets] as [string, string, string, string];
                    next[i] = e.target.value;
                    setTargets(next);
                  }}
                  placeholder="Leave empty to skip urge/action for this column"
                />
              </label>
            ))}
          </section>
        ) : null}

        {stepId === "prompt" ? (
          <section className="wizard-step">
            <h3 className="wizard-question" tabIndex={-1}>What happened—or what was the hardest part to notice today?</h3>
            <p className="muted">Facts only for a moment: who, what, when, where. You can add one short paragraph.</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="Example: Argument with partner before work; felt tight in chest most of the morning."
            />
          </section>
        ) : null}

        {stepId.startsWith("emotion:") ? (
          <section className="wizard-step">
            {(() => {
              const id = stepId.slice("emotion:".length);
              const em = card.emotionColumns.find((c) => c.id === id);
              const v = emotions[id] ?? 0;
              return (
                <>
                  <h3 className="wizard-question" tabIndex={-1}>How strong was {em?.label ?? id}?</h3>
                  <p className="muted">{card.intensityScaleEmotionsUrges.hint}</p>
                  <p className="wizard-big-num">{v}</p>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    value={v}
                    onChange={(e) =>
                      setEmotions((prev) => ({
                        ...prev,
                        [id]: Number(e.target.value),
                      }))
                    }
                  />
                  <div className="wizard-scale-labels">
                    <span>0 none</span>
                    <span>5 strong</span>
                  </div>
                </>
              );
            })()}
          </section>
        ) : null}

        {stepId.startsWith("urge:") ? (
          <section className="wizard-step">
            {(() => {
              const slot = Number(stepId.slice("urge:".length));
              const label = targets[slot]?.trim() ?? "";
              const v = urges[slot];
              return (
                <>
                  <h3 className="wizard-question" tabIndex={-1}>Urge for &quot;{label}&quot;</h3>
                  <p className="muted">0 = no urge, 5 = strongest urge (same as the printed card).</p>
                  <p className="wizard-big-num">{v}</p>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    value={v}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setUrges((u) => {
                        const next = [...u] as [number, number, number, number];
                        next[slot] = n;
                        return next;
                      });
                    }}
                  />
                </>
              );
            })()}
          </section>
        ) : null}

        {stepId.startsWith("action:") ? (
          <section className="wizard-step">
            {(() => {
              const slot = Number(stepId.slice("action:".length));
              const name = targets[slot]?.trim() ?? "";
              const v = actions[slot];
              return (
                <>
                  <h3 className="wizard-question" tabIndex={-1}>Did you act on &quot;{name}&quot;?</h3>
                  <p className="muted">Y or N, like the printed card. Use — if you prefer not to answer.</p>
                  <div className="wizard-yesno">
                    <button
                      type="button"
                      className={`wizard-choice ${v === "" ? "on" : ""}`}
                      onClick={() =>
                        setActions((a) => {
                          const n = [...a] as typeof actions;
                          n[slot] = "";
                          return n;
                        })
                      }
                    >
                      —
                    </button>
                    <button
                      type="button"
                      className={`wizard-choice ${v === "n" ? "on" : ""}`}
                      onClick={() =>
                        setActions((a) => {
                          const n = [...a] as typeof actions;
                          n[slot] = "n";
                          return n;
                        })
                      }
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className={`wizard-choice ${v === "y" ? "on" : ""}`}
                      onClick={() =>
                        setActions((a) => {
                          const n = [...a] as typeof actions;
                          n[slot] = "y";
                          return n;
                        })
                      }
                    >
                      Yes
                    </button>
                  </div>
                </>
              );
            })()}
          </section>
        ) : null}

        {stepId === "usedSkills" ? (
          <section className="wizard-step">
            <h3 className="wizard-question" tabIndex={-1}>Overall, how did skills show up today?</h3>
            <p className="muted">Pick the line that fits best (0–7 from your diary card).</p>
            <div className="wizard-radio-list" role="radiogroup" aria-label="Used skills">
              {legend.map((L) => (
                <label key={L.value} className={`wizard-radio ${usedSkills === L.value ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="usedSkills"
                    checked={usedSkills === L.value}
                    onChange={() => setUsedSkills(L.value)}
                  />
                  <span>
                    <strong>{L.value}</strong> — {L.text}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {stepId.startsWith("skills:") ? (
          <section className="wizard-step">
            {(() => {
              const modId = stepId.slice("skills:".length);
              const mod = skills.modules.find((m) => m.id === modId);
              if (!mod) return null;
              return (
                <>
                  <h3 className="wizard-question" tabIndex={-1}>{mod.name}</h3>
                  <p className="muted">
                    Tap any skill you used on <strong>{weekdayName}</strong>. You can choose none.
                  </p>
                  <div className="wizard-chips">
                    {mod.skills.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`chip ${skillsToday[s.id] ? "on" : ""}`}
                        onClick={() =>
                          setSkillsToday((prev) => ({
                            ...prev,
                            [s.id]: !prev[s.id],
                          }))
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {mod.skills.some((s) => Boolean(s.hint)) ? (
                    <div className="muted wizard-hints">
                      {mod.skills.map((s) =>
                        s.hint ? (
                          <p key={s.id}>
                            <strong>{s.label}:</strong> {s.hint}
                          </p>
                        ) : null
                      )}
                    </div>
                  ) : null}
                </>
              );
            })()}
          </section>
        ) : null}

        {stepId === "other" ? (
          <section className="wizard-step">
            <h3 className="wizard-question" tabIndex={-1}>Anything else to remember for {weekdayName}?</h3>
            <p className="muted">This goes in the &quot;other events&quot; line for that weekday on the card.</p>
            <textarea value={otherNote} onChange={(e) => setOtherNote(e.target.value)} rows={4} />
          </section>
        ) : null}

        {stepId === "review" ? (
          <section className="wizard-step">
            <h3 className="wizard-question" tabIndex={-1}>Review</h3>
            <ul className="wizard-review">
              <li>
                <strong>Date:</strong> {checkInDate} ({weekdayName})
              </li>
              <li>
                <strong>Prompting event:</strong> {prompt.trim() || "(empty)"}
              </li>
              <li>
                <strong>Emotions (0–5):</strong>{" "}
                {card.emotionColumns
                  .map((em) => `${em.label}: ${emotions[em.id] ?? 0}`)
                  .join(" · ")}
              </li>
              <li>
                <strong>Urges / actions:</strong>{" "}
                {[0, 1, 2, 3]
                  .filter((i) => Boolean(targets[i]?.trim()))
                  .map((i) => {
                    const name = targets[i]!.trim();
                    return `${name}: urge ${urges[i]}, act ${actions[i] || "—"}`;
                  })
                  .join(" · ") || "(no named target columns)"}
              </li>
              <li>
                <strong>Skills used today:</strong>{" "}
                {allSkillIds().filter((id) => skillsToday[id]).length || "None selected"}
              </li>
              <li>
                <strong>Used skills code:</strong> {usedSkills}
              </li>
              <li>
                <strong>Other note:</strong> {otherNote.trim() || "(none)"}
              </li>
            </ul>
            {savedBanner ? <p className="wizard-saved">{savedBanner}</p> : null}
            {journalHintDate && savedBanner ? (
              <div className="wizard-journal-nudge card-inset">
                <p className="muted" style={{ marginTop: 0 }}>
                  Want a short journal line while this day is still fresh? Your memory line and day view pull it
                  together with your check-in.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <Link
                    className="btn secondary"
                    to={`/journal?entryDate=${encodeURIComponent(journalHintDate)}&nudge=checkin`}
                  >
                    Open journal for this day
                  </Link>
                  <Link className="btn secondary" to={`/day/${journalHintDate}`}>
                    View this day
                  </Link>
                </div>
              </div>
            ) : null}
            <button type="button" className="btn" onClick={saveCheckIn}>
              Save check-in
            </button>
          </section>
        ) : null}

        <div className="wizard-footer">
          <button type="button" className="btn secondary" onClick={back} disabled={stepIndex === 0}>
            Back
          </button>
          {stepId === "review" ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                clearWizardDraft();
                hydrateFromWeek(checkInDate);
              }}
            >
              Reset this day
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={next}
              disabled={stepId === "intro" && !canProceedFromIntro}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
