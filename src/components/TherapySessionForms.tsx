import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mergeJournalTags } from "../journal/journalTags";
import type { JournalEntry } from "../types";
import { loadJournal, saveJournal, uid } from "../storage";

export function TherapySessionForms() {
  const [searchParams] = useSearchParams();
  const focusHandled = useRef(false);
  const prepRef = useRef<HTMLElement | null>(null);
  const debRef = useRef<HTMLElement | null>(null);
  const [sessionDate, setSessionDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [prepBring, setPrepBring] = useState("");
  const [prepGoal, setPrepGoal] = useState("");
  const [debTakeaway, setDebTakeaway] = useState("");
  const [debTheme, setDebTheme] = useState("");
  const [debNext, setDebNext] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const f = (searchParams.get("focus") || "").toLowerCase();
    if (!f || focusHandled.current) return;
    focusHandled.current = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (f === "prep") prepRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (f === "debrief") debRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [searchParams]);

  function savePrep() {
    const body = `What I want to bring up:\n${prepBring.trim()}\n\nOne goal for this session:\n${prepGoal.trim()}`;
    if (!prepBring.trim() && !prepGoal.trim()) {
      setMsg("Add a line or two for prep before saving.");
      window.setTimeout(() => setMsg(""), 2500);
      return;
    }
    const title = `Before session (${sessionDate})`;
    const tags = mergeJournalTags(body, title, "therapy, session-prep");
    const e: JournalEntry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      entryDate: sessionDate,
      kind: "session_prep",
      title,
      body,
      tags: tags.length ? tags : undefined,
    };
    const list = loadJournal();
    list.push(e);
    saveJournal(list);
    setPrepBring("");
    setPrepGoal("");
    setMsg("Saved prep to your journal.");
    window.setTimeout(() => setMsg(""), 2500);
  }

  function saveDebrief() {
    const body = `Takeaway:\n${debTakeaway.trim()}\n\nTheme or skill:\n${debTheme.trim()}\n\nCarry into next week:\n${debNext.trim()}`;
    if (!debTakeaway.trim() && !debTheme.trim() && !debNext.trim()) {
      setMsg("Add something for debrief before saving.");
      window.setTimeout(() => setMsg(""), 2500);
      return;
    }
    const title = `After session (${sessionDate})`;
    const tags = mergeJournalTags(body, title, "therapy, session-debrief");
    const e: JournalEntry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      entryDate: sessionDate,
      kind: "session_debrief",
      title,
      body,
      tags: tags.length ? tags : undefined,
    };
    const list = loadJournal();
    list.push(e);
    saveJournal(list);
    setDebTakeaway("");
    setDebTheme("");
    setDebNext("");
    setMsg("Saved debrief to your journal.");
    window.setTimeout(() => setMsg(""), 2500);
  }

  return (
    <div className="therapy-session-forms">
      <section className="card" ref={(el) => (prepRef.current = el)}>
        <h3 className="dash-section-title">Before session</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Saves as a journal entry tagged for therapy—private on this device.
        </p>
        <label className="field">
          Session day (calendar)
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
        </label>
        <label className="field">
          What I want to bring up
          <textarea rows={4} value={prepBring} onChange={(e) => setPrepBring(e.target.value)} placeholder="Topics, worries, wins—short bullets are fine." />
        </label>
        <label className="field">
          One goal for this session
          <textarea rows={2} value={prepGoal} onChange={(e) => setPrepGoal(e.target.value)} placeholder="e.g. Ask about medication fear · practice describing one conflict calmly" />
        </label>
        <button type="button" className="btn" onClick={savePrep}>
          Save prep to journal
        </button>
      </section>

      <section className="card" ref={(el) => (debRef.current = el)}>
        <h3 className="dash-section-title">After session</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Same day field as above; adjust if you debrief on a different calendar day.
        </p>
        <label className="field">
          Main takeaway
          <textarea rows={3} value={debTakeaway} onChange={(e) => setDebTakeaway(e.target.value)} />
        </label>
        <label className="field">
          Skill or theme that stood out
          <input type="text" value={debTheme} onChange={(e) => setDebTheme(e.target.value)} />
        </label>
        <label className="field">
          One thing to try before next time
          <textarea rows={2} value={debNext} onChange={(e) => setDebNext(e.target.value)} />
        </label>
        <button type="button" className="btn secondary" onClick={saveDebrief}>
          Save debrief to journal
        </button>
      </section>

      {msg ? (
        <p className="wizard-saved" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
