import { useState } from "react";
import { Link } from "react-router-dom";
import { CrisisSupportNote } from "../components/CrisisSupportNote";
import { SkillMomentStrip } from "../components/SkillMomentStrip";

type TippKey = "T" | "I" | "P1" | "P2";

const TIPP: { key: TippKey; title: string; body: string }[] = [
  {
    key: "T",
    title: "T — Temperature (brief)",
    body: "Cool face with water or a cool pack, or step into cooler air—short and safe, not long enough to harm skin.",
  },
  {
    key: "I",
    title: "I — Intense exercise (brief)",
    body: "Move hard for a few minutes only if your body allows it: stairs, brisk walk, wall push-ups—then check in with breath.",
  },
  {
    key: "P1",
    title: "P — Paced breathing",
    body: "Slow exhale longer than inhale for a few cycles. Count if it helps. Pair with the Urge timer if you want a set window.",
  },
  {
    key: "P2",
    title: "P — Paired muscle relaxation",
    body: "Tense a muscle group for a few seconds, release, notice the contrast. Move through shoulders, hands, jaw.",
  },
];

const OPPOSITE_PROMPTS = [
  {
    title: "Opposite action — emotion fit",
    body: "If the emotion fits the facts, problem-solve. If it does not fit the facts, consider acting opposite to the emotion’s urge (small step, safe for you).",
  },
  {
    title: "Tiny opposite examples",
    body: "Urge to isolate → one short message to someone safe. Urge to shut down → splash water and name three sounds. Urge to spiral → stand up and change rooms for two minutes.",
  },
];

export default function DistressToolkit() {
  const [tippDone, setTippDone] = useState<Record<TippKey, boolean>>({
    T: false,
    I: false,
    P1: false,
    P2: false,
  });

  return (
    <div className="distress-toolkit-page">
      <section className="card">
        <h2>Distress toolkit</h2>
        <p className="muted">
          Short reminders aligned with DBT distress tolerance (TIPP) and opposite action—not a substitute for skills
          training or therapy. Use what is safe for your body and situation.
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          <Link className="btn secondary btn-compact" to="/urge-timer">
            Open urge timer
          </Link>
          {" "}
          <Link className="btn secondary btn-compact" to="/journal?skillLog=distress">
            Log after this tool
          </Link>
        </p>
        <CrisisSupportNote />
      </section>

      <SkillMomentStrip />

      <section className="card">
        <h3 className="dash-section-title">TIPP — check what you tried</h3>
        <p className="muted dash-lead">Tap each line after you have given it an honest try (even briefly).</p>
        <ul className="distress-tipp-list">
          {TIPP.map((step) => (
            <li key={step.key}>
              <label className="distress-tipp-row">
                <input
                  type="checkbox"
                  checked={tippDone[step.key]}
                  onChange={(e) => setTippDone((d) => ({ ...d, [step.key]: e.target.checked }))}
                />
                <span>
                  <strong>{step.title}</strong>
                  <span className="muted"> {step.body}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {Object.values(tippDone).every(Boolean) ? (
          <p className="wizard-saved" role="status">
            You have moved through each TIPP idea once—nice work. Rest or return to what you were doing when you are
            ready.
          </p>
        ) : null}
      </section>

      <section className="card">
        <h3 className="dash-section-title">Opposite action — prompts</h3>
        {OPPOSITE_PROMPTS.map((b) => (
          <div key={b.title} className="distress-block">
            <h4 className="distress-block-title">{b.title}</h4>
            <p className="muted">{b.body}</p>
          </div>
        ))}
      </section>

      <p className="muted" style={{ textAlign: "center", fontSize: "0.88rem" }}>
        <Link to="/safety">Safety card</Link>
        {" · "}
        <Link to="/tools">← Tools</Link>
      </p>
    </div>
  );
}
