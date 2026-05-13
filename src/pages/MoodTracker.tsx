import { useMemo, useState } from "react";
import diaryCard from "../../data/diary-card.json";
import type { MoodEntry } from "../types";
import { loadMood, saveMood, uid } from "../storage";

const presetEmotions = diaryCard.emotionColumns.map((e) => e.label);
const extraEmotions = ["Calm", "Overwhelmed", "Irritable", "Peaceful", "Disconnected"];
const allEmotions = Array.from(new Set([...presetEmotions, ...extraEmotions])).sort((a, b) =>
  a.localeCompare(b)
);

export default function MoodTracker() {
  const [mood, setMood] = useState(5);
  const [picked, setPicked] = useState<string[]>([]);
  const [bodyNote, setBodyNote] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  const [version, setVersion] = useState(0);
  const entries = useMemo(() => loadMood().sort((a, b) => (a.at < b.at ? 1 : -1)), [version]);

  function toggle(em: string) {
    setPicked((p) => (p.includes(em) ? p.filter((x) => x !== em) : [...p, em]));
  }

  function save() {
    const list = loadMood();
    const entry: MoodEntry = {
      id: uid(),
      at: new Date().toISOString(),
      mood,
      emotions: picked,
      bodyNote,
      notes,
    };
    list.push(entry);
    saveMood(list);
    setMsg("Logged.");
    setVersion((v) => v + 1);
    setPicked([]);
    setBodyNote("");
    setNotes("");
    window.setTimeout(() => setMsg(""), 2000);
  }

  return (
    <>
      <section className="card">
        <h2>Mood and emotions</h2>
        <p className="muted">
          Quick check-in: overall mood (0 unpleasant → 10 pleasant or okay), emotions, and where you feel it
          in your body. Emotion labels overlap with your diary card options plus a few common add-ons.
        </p>
        <label className="field">
          Mood ({mood} / 10)
          <input type="range" min={0} max={10} value={mood} onChange={(e) => setMood(Number(e.target.value))} />
        </label>
        <h3>Emotions right now</h3>
        <div className="chips">
          {allEmotions.map((em) => (
            <button
              key={em}
              type="button"
              className={`chip ${picked.includes(em) ? "on" : ""}`}
              onClick={() => toggle(em)}
            >
              {em}
            </button>
          ))}
        </div>
        <label className="field" style={{ marginTop: "0.75rem" }}>
          Body sensations (optional)
          <input
            type="text"
            value={bodyNote}
            onChange={(e) => setBodyNote(e.target.value)}
            placeholder="e.g. tight chest, heavy legs, jaw clench"
          />
        </label>
        <label className="field">
          Notes (optional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context, needs, next step" />
        </label>
        <button type="button" className="btn" onClick={save}>
          Log mood
        </button>
        {msg ? <p className="muted">{msg}</p> : null}
      </section>

      <section className="card">
        <h2>Recent logs</h2>
        {!entries.length ? (
          <p className="muted">No mood logs yet.</p>
        ) : (
          <table className="simple">
            <thead>
              <tr>
                <th>When</th>
                <th>Mood</th>
                <th>Emotions</th>
                <th>Body</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 14).map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.at).toLocaleString()}</td>
                  <td>{e.mood}</td>
                  <td>{e.emotions.join(", ") || "—"}</td>
                  <td>{e.bodyNote || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
