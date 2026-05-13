import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import spiralSupport from "../../data/spiral-support.json";
import { CrisisSupportNote } from "../components/CrisisSupportNote";
import { DictateParagraphControls } from "../components/DictateParagraphControls";
import { appendSpokenChunk } from "../journal/spokenTextAppend";
import type { SpiralEntry } from "../types";
import { loadSpiral, saveSpiral, uid } from "../storage";

type SpiralFile = typeof spiralSupport;

export default function SpiralTracker() {
  const data = spiralSupport as SpiralFile;
  const [stages, setStages] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    data.spiralStages.forEach((s) => {
      init[s.id] = "";
    });
    return init;
  });
  const [peakIntensity, setPeakIntensity] = useState(5);
  const [outcomeNote, setOutcomeNote] = useState("");
  const [msg, setMsg] = useState("");

  const [version, setVersion] = useState(0);
  const entries = useMemo(() => loadSpiral().sort((a, b) => (a.at < b.at ? 1 : -1)), [version]);

  function save() {
    const list = loadSpiral();
    const entry: SpiralEntry = {
      id: uid(),
      at: new Date().toISOString(),
      stages,
      peakIntensity,
      outcomeNote,
    };
    list.push(entry);
    saveSpiral(list);
    setMsg("Spiral log saved.");
    setVersion((v) => v + 1);
    const reset: Record<string, string> = {};
    data.spiralStages.forEach((s) => {
      reset[s.id] = "";
    });
    setStages(reset);
    setPeakIntensity(5);
    setOutcomeNote("");
    window.setTimeout(() => setMsg(""), 2200);
  }

  return (
    <>
      <section className="card">
        <h2>Thought spiral map</h2>
        <p className="muted">
          Structured like a brief chain analysis: trigger → interpretation → emotion → body → urges → skills.
          Prompts from <code>data/spiral-support.json</code>.
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          <Link className="btn secondary btn-compact" to="/journal?skillLog=spiral">
            Log after this tool
          </Link>
        </p>
        <p className="disclaimer">{data.disclaimer}</p>
        <CrisisSupportNote />
      </section>

      <section className="card">
        <h2>Log a spiral</h2>
        {data.spiralStages.map((s) => (
          <label key={s.id} className="field" style={{ marginBottom: "0.65rem" }}>
            <strong>{s.label}</strong>
            <span className="muted" style={{ fontWeight: 400 }}>
              {s.prompt}
            </span>
            <textarea
              value={stages[s.id] ?? ""}
              onChange={(e) =>
                setStages((prev) => ({
                  ...prev,
                  [s.id]: e.target.value,
                }))
              }
            />
            <DictateParagraphControls
              mergeChunk={(chunk) =>
                setStages((prev) => ({
                  ...prev,
                  [s.id]: appendSpokenChunk(prev[s.id] ?? "", chunk),
                }))
              }
            />
          </label>
        ))}
        <label className="field">
          Peak distress (0–10)
          <input
            type="range"
            min={0}
            max={10}
            value={peakIntensity}
            onChange={(e) => setPeakIntensity(Number(e.target.value))}
          />
        </label>
        <label className="field">
          What shifted afterward? (optional)
          <textarea
            value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            placeholder="e.g. TIPP, called friend, cried, slept"
          />
          <DictateParagraphControls mergeChunk={(chunk) => setOutcomeNote((p) => appendSpokenChunk(p, chunk))} />
        </label>
        <button type="button" className="btn" onClick={save}>
          Save spiral log
        </button>
        {msg ? <p className="muted">{msg}</p> : null}
      </section>

      <section className="card">
        <h2>De-escalation reminders</h2>
        {data.de_escalation_skills.map((skill) => (
          <div key={skill.id} style={{ marginBottom: "0.85rem" }}>
            <h3 style={{ margin: "0 0 0.35rem" }}>{skill.name}</h3>
            <ol className="muted" style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {skill.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Recent spiral logs</h2>
        {!entries.length ? (
          <p className="muted">None yet.</p>
        ) : (
          <table className="simple">
            <thead>
              <tr>
                <th>When</th>
                <th>Peak</th>
                <th>Trigger (excerpt)</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 12).map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.at).toLocaleString()}</td>
                  <td>{e.peakIntensity}</td>
                  <td>{(e.stages.trigger || "").slice(0, 120) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
