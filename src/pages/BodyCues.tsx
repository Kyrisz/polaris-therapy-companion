import { useState } from "react";
import { Link } from "react-router-dom";
import bodyCues from "../../data/body-cues.json";

type BodyFile = typeof bodyCues;

export default function BodyCues() {
  const data = bodyCues as BodyFile;
  const [selected, setSelected] = useState<string | null>(null);
  const cue = data.cues.find((c) => c.id === selected);

  return (
    <>
      <section className="card">
        <h2>Body cues → possible feelings</h2>
        <p className="muted">
          Data from <code>data/body-cues.json</code>. This is interoceptive psychoeducation: the same body cue
          can mean different things for different people and moments.
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          <Link className="btn secondary btn-compact" to="/journal?skillLog=body">
            Log after this tool
          </Link>
        </p>
        <p className="disclaimer">{data.disclaimer}</p>
      </section>

      <section className="card">
        <h2>Pick a sensation</h2>
        <div className="chips">
          {data.cues.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${selected === c.id ? "on" : ""}`}
              onClick={() => setSelected(c.id)}
            >
              {c.bodyArea}: {c.sensation}
            </button>
          ))}
        </div>
      </section>

      {cue ? (
        <section className="card">
          <h2>What this might pair with</h2>
          <p>
            <span className="badge">{cue.bodyArea}</span>
          </p>
          <p className="muted">{cue.sensation}</p>
          <h3>Possible feelings (hypotheses)</h3>
          <ul>
            {cue.possibleFeelings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <h3>Regulation ideas (general)</h3>
          <p>{cue.regulation_hint}</p>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            {data.references_note}
          </p>
        </section>
      ) : null}
    </>
  );
}
