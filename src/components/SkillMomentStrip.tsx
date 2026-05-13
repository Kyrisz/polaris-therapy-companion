import { Link } from "react-router-dom";

const TOOLS = [
  { to: "/distress", label: "TIPP" },
  { to: "/urge-timer", label: "Urge timer" },
  { to: "/body", label: "Body" },
  { to: "/spiral", label: "Spiral" },
  { to: "/skills", label: "Skills" },
] as const;

export function SkillMomentStrip() {
  return (
    <section className="card skill-moment-strip" aria-label="Quick skills">
      <h3 className="dash-section-title" style={{ marginBottom: "0.35rem" }}>
        In the moment
      </h3>
      <p className="muted" style={{ marginTop: 0 }}>
        One tap to a tool; nothing leaves this device.
      </p>
      <div className="skill-moment-links">
        {TOOLS.map((l) => (
          <Link key={l.to} className="btn secondary btn-compact" to={l.to}>
            {l.label}
          </Link>
        ))}
        <Link className="btn secondary btn-compact" to="/journal?skillLog=distress">
          Log after skill
        </Link>
      </div>
    </section>
  );
}
