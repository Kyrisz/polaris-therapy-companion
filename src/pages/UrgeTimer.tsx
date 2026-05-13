import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CrisisSupportNote } from "../components/CrisisSupportNote";
import type { UrgeTimerSession } from "../types";
import { appendUrgeTimerSession, loadUrgeTimerLog, uid } from "../storage";

const PRESETS = [5, 10, 15, 20] as const;

export default function UrgeTimer() {
  const [label, setLabel] = useState("");
  const [minutes, setMinutes] = useState<number>(10);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [remainingSec, setRemainingSec] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [logTick, setLogTick] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const log = useMemo(() => {
    void logTick;
    return loadUrgeTimerLog();
  }, [logTick]);

  useEffect(() => {
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    };
  }, []);

  function start() {
    if (phase === "running") return;
    const sec = Math.max(1, minutes) * 60;
    setRemainingSec(sec);
    setStartedAt(new Date().toISOString());
    setPhase("running");
    setNote("");
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          if (intervalRef.current != null) window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          window.setTimeout(() => setPhase("done"), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function stopEarly() {
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPhase("done");
    setRemainingSec(0);
  }

  function saveSession() {
    if (!startedAt) return;
    const entry: UrgeTimerSession = {
      id: uid(),
      label: label.trim() || "Urge",
      plannedMinutes: minutes,
      startedAt,
      completedAt: new Date().toISOString(),
      note: note.trim(),
    };
    appendUrgeTimerSession(entry);
    setPhase("idle");
    setStartedAt(null);
    setRemainingSec(0);
    setLogTick((n) => n + 1);
  }

  function discardSession() {
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPhase("idle");
    setStartedAt(null);
    setRemainingSec(0);
  }

  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;

  return (
    <div className="urge-timer-page">
      <section className="card">
        <h2>Urge timer</h2>
        <p className="muted">
          Label what you are riding out, set a timer, and stay with it. When time is up, add a short note if you want.
          Inspired by urge surfing—this is a simple timer, not medical advice.
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          <Link className="btn secondary btn-compact" to="/journal?skillLog=urge">
            Log after this tool
          </Link>
        </p>
        <CrisisSupportNote />
      </section>

      <section className="card">
        {phase === "idle" ? (
          <>
            <label className="field">
              What are you sitting with? (optional)
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. urge to text them" />
            </label>
            <label className="field">
              Minutes
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {PRESETS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn" onClick={start}>
              Start timer
            </button>
          </>
        ) : null}

        {phase === "running" ? (
          <div className="urge-timer-active">
            <p className="urge-timer-clock" aria-live="polite">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </p>
            <p className="muted">{label.trim() || "Urge"} · {minutes} min session</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button type="button" className="btn secondary" onClick={stopEarly}>
                Time is up (end now)
              </button>
            </div>
          </div>
        ) : null}

        {phase === "done" ? (
          <>
            <p className="muted">Timer ended. Optional note for you later:</p>
            <label className="field">
              Note
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What shifted, if anything?" />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button type="button" className="btn" onClick={saveSession}>
                Save to log
              </button>
              <button type="button" className="btn secondary" onClick={discardSession}>
                Skip saving
              </button>
            </div>
          </>
        ) : null}
      </section>

      {log.length ? (
        <section className="card">
          <h3 className="dash-section-title">Recent sessions</h3>
          <ul className="urge-timer-log muted">
            {log.slice(0, 12).map((e) => (
              <li key={e.id}>
                <strong>{e.label}</strong> · {e.plannedMinutes} min ·{" "}
                {new Date(e.completedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                {e.note ? (
                  <>
                    <br />
                    {e.note}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="muted" style={{ textAlign: "center", fontSize: "0.88rem" }}>
        <Link to="/distress">TIPP &amp; opposite action</Link>
        {" · "}
        <Link to="/tools">← Tools</Link>
      </p>
    </div>
  );
}
