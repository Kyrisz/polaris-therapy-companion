import { useEffect, useMemo, useState } from "react";
import { mondayContainingLocalDate } from "../diary/diaryWeekModel";
import { DictateParagraphControls } from "./DictateParagraphControls";
import { appendSpokenChunk } from "../journal/spokenTextAppend";
import { loadWeeklyIntention, saveWeeklyIntention } from "../storage";

export function WeeklyIntentionCard() {
  const thisMon = mondayContainingLocalDate(new Date());
  const [tick, setTick] = useState(0);
  const stored = useMemo(() => {
    void tick;
    return loadWeeklyIntention();
  }, [tick, thisMon]);
  const [text, setText] = useState("");
  const [skillTag, setSkillTag] = useState("");

  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    window.addEventListener("dbt-weekly-intention-updated", fn);
    return () => window.removeEventListener("dbt-weekly-intention-updated", fn);
  }, []);

  useEffect(() => {
    if (stored?.weekStartMonday === thisMon) {
      setText(stored.text);
      setSkillTag(stored.skillTag);
    } else {
      setText("");
      setSkillTag("");
    }
  }, [stored, thisMon]);

  const prevWeek =
    stored && stored.weekStartMonday !== thisMon && (stored.text.trim() || stored.skillTag.trim())
      ? stored
      : null;

  function save() {
    saveWeeklyIntention({
      weekStartMonday: thisMon,
      text: text.trim(),
      skillTag: skillTag.trim(),
    });
    setTick((n) => n + 1);
  }

  return (
    <section className="card weekly-intention-card" aria-labelledby="weekly-intention-heading">
      <h3 id="weekly-intention-heading" className="dash-section-title">
        This week I&apos;m practicing…
      </h3>
      <p className="muted" style={{ marginTop: 0 }}>
        A single gentle focus for the week starting <strong>{thisMon}</strong>—no streak, no score.
      </p>
      {prevWeek ? (
        <p className="muted weekly-intention-prev" style={{ fontSize: "0.88rem" }}>
          Last week ({prevWeek.weekStartMonday}):{" "}
          <em>
            {[prevWeek.text, prevWeek.skillTag].filter(Boolean).join(" · ") || "—"}
          </em>
        </p>
      ) : null}
      <label className="field">
        Intention or reminder (optional)
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Notice urges without acting · one kind text when I feel alone"
        />
        <DictateParagraphControls mergeChunk={(chunk) => setText((p) => appendSpokenChunk(p, chunk))} />
      </label>
      <label className="field">
        Skill or theme tag (optional)
        <input
          type="text"
          value={skillTag}
          onChange={(e) => setSkillTag(e.target.value)}
          placeholder="e.g. TIPP, opposite action, self-validation"
          maxLength={80}
        />
        <DictateParagraphControls mergeChunk={(chunk) => setSkillTag((p) => appendSpokenChunk(p, chunk))} />
      </label>
      <button type="button" className="btn secondary btn-compact" onClick={save}>
        Save for this week
      </button>
    </section>
  );
}
