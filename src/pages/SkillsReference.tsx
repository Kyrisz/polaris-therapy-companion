import skillsModules from "../../data/skills-modules.json";
import diaryCard from "../../data/diary-card.json";
import { Link } from "react-router-dom";

const skills = skillsModules as typeof skillsModules;
const card = diaryCard as typeof diaryCard;

export default function SkillsReference() {
  return (
    <div className="skills-ref-page">
      <section className="card">
        <h2>Skills cheat sheet</h2>
        <p className="muted">
          Static reminders from your diary card materials—same names as on the printable sheet. Not personalized
          advice; use with your therapist when you can.
        </p>
        <p className="muted">
          Emotion scale on the card: <strong>{card.intensityScaleEmotionsUrges.hint}</strong>
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          <Link className="btn secondary btn-compact" to="/journal?skillLog=skills">
            Log after a skill
          </Link>
        </p>
      </section>

      {skills.modules.map((mod) => (
        <section key={mod.id} className="card skills-ref-mod">
          <h3 className="skills-ref-mod-title">
            {mod.name}{" "}
            <span className="muted" style={{ fontWeight: 500, fontSize: "0.85rem" }}>
              (section {mod.sectionNumber})
            </span>
          </h3>
          <ul className="skills-ref-list">
            {mod.skills.map((s) => (
              <li key={s.id}>
                <strong>{s.label}</strong>
                {s.hint ? <span className="muted"> — {s.hint}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card">
        <h3>Used skills code (0–7)</h3>
        <ul className="skills-ref-list muted">
          {card.usedSkillsColumn.legend.map((L) => (
            <li key={L.value}>
              <strong>{L.value}</strong> — {L.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
