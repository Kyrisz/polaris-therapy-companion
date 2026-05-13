import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CrisisSupportNote } from "../components/CrisisSupportNote";
import { DictateParagraphControls } from "../components/DictateParagraphControls";
import { appendSpokenChunk } from "../journal/spokenTextAppend";
import { stashSetupWizardStep } from "../setup/setupWizardStorage";
import { loadSafetyPlan, saveSafetyPlan } from "../storage";

export default function SafetyPlan() {
  const [searchParams] = useSearchParams();
  const fromSetup = searchParams.get("from") === "setup";
  const initial = loadSafetyPlan();
  const [whoCanHelp, setWhoCanHelp] = useState(initial.whoCanHelp);
  const [crisisNumbers, setCrisisNumbers] = useState(initial.crisisNumbers);
  const [groundingList, setGroundingList] = useState(initial.groundingList);
  const [ifThenPlan, setIfThenPlan] = useState(initial.ifThenPlan);
  const [environmentNotes, setEnvironmentNotes] = useState(initial.environmentNotes);
  const [msg, setMsg] = useState("");

  function save() {
    saveSafetyPlan({
      whoCanHelp: whoCanHelp.trim(),
      crisisNumbers: crisisNumbers.trim(),
      groundingList: groundingList.trim(),
      ifThenPlan: ifThenPlan.trim(),
      environmentNotes: environmentNotes.trim(),
      updatedAt: "",
    });
    setMsg("Saved on this device only.");
    window.setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div className="safety-plan-page">
      <section className="card">
        <h2>Safety &amp; crisis card</h2>
        {fromSetup ? (
          <p className="setup-return-banner">
            <Link
              to="/setup"
              onClick={() => stashSetupWizardStep(2)}
            >
              ← Back to setup
            </Link>
          </p>
        ) : null}
        <p className="muted">
          Fill this in once and update when your plan changes. It stays in your browser—nothing is sent anywhere. This
          is not emergency routing; if you are in immediate danger, use local emergency services or a crisis line you
          trust.
        </p>
        <CrisisSupportNote />
      </section>

      <section className="card">
        <label className="field">
          People or roles I can reach out to
          <textarea
            value={whoCanHelp}
            onChange={(e) => setWhoCanHelp(e.target.value)}
            rows={3}
            placeholder="e.g. Partner Alex · friend Sam · therapist Tuesday"
          />
          <DictateParagraphControls mergeChunk={(chunk) => setWhoCanHelp((p) => appendSpokenChunk(p, chunk))} />
        </label>
        <label className="field">
          Crisis numbers or chat links I trust
          <textarea
            value={crisisNumbers}
            onChange={(e) => setCrisisNumbers(e.target.value)}
            rows={3}
            placeholder="988 (US) · local warm line · text line you have used before"
          />
          <DictateParagraphControls mergeChunk={(chunk) => setCrisisNumbers((p) => appendSpokenChunk(p, chunk))} />
        </label>
        <label className="field">
          Grounding that has worked before (short list)
          <textarea
            value={groundingList}
            onChange={(e) => setGroundingList(e.target.value)}
            rows={4}
            placeholder="Cold water on wrists · 4-7-8 breathing · name five blue things"
          />
          <DictateParagraphControls mergeChunk={(chunk) => setGroundingList((p) => appendSpokenChunk(p, chunk))} />
        </label>
        <label className="field">
          If I notice early warning signs, I will…
          <textarea
            value={ifThenPlan}
            onChange={(e) => setIfThenPlan(e.target.value)}
            rows={4}
            placeholder="If I start pacing and Googling symptoms → put phone in kitchen drawer and text one person."
          />
          <DictateParagraphControls mergeChunk={(chunk) => setIfThenPlan((p) => appendSpokenChunk(p, chunk))} />
        </label>
        <label className="field">
          Environment or meds notes (optional)
          <textarea
            value={environmentNotes}
            onChange={(e) => setEnvironmentNotes(e.target.value)}
            rows={2}
            placeholder="Anything you want future-you to remember in a hard moment."
          />
          <DictateParagraphControls mergeChunk={(chunk) => setEnvironmentNotes((p) => appendSpokenChunk(p, chunk))} />
        </label>
        <button type="button" className="btn" onClick={save}>
          Save safety card
        </button>
        {msg ? (
          <p className="muted" style={{ marginTop: "0.65rem" }}>
            {msg}
          </p>
        ) : null}
      </section>

      <p className="muted" style={{ textAlign: "center", fontSize: "0.88rem" }}>
        <Link to="/tools">← Tools</Link>
      </p>
    </div>
  );
}
