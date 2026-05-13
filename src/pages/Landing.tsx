import { Link } from "react-router-dom";
import { loadDisplayName } from "../storage";
import { loadSetupWizardStatus } from "../setup/setupWizardStorage";

function greetingLine() {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Landing() {
  const name = loadDisplayName().trim();
  const first = name || "friend";
  const setupStatus = loadSetupWizardStatus();

  return (
    <div className="landing">
      <div className="landing-inner">
        <header className="landing-greeting-block" aria-live="polite">
          <p className="landing-pre">{greetingLine()}</p>
          <h1 className="landing-title brand-heading brand-heading--lg">Hi, {first}.</h1>
          <p className="landing-sub">Take a breath. There&apos;s no rush.</p>
        </header>

        <div className="landing-choices-block" role="group" aria-label="Choose how to continue">
          {setupStatus === "pending" ? (
            <Link className="landing-choice landing-choice--primary" to="/setup">
              <span className="landing-choice-label">First-time setup (recommended)</span>
              <span className="landing-choice-hint">Name, safety card, pins, reminders, and backup—in a few calm steps</span>
            </Link>
          ) : null}
          <Link
            className={
              setupStatus === "pending"
                ? "landing-choice landing-choice--secondary"
                : "landing-choice landing-choice--primary"
            }
            to="/daily"
          >
            <span className="landing-choice-label">Ready to do your check-in?</span>
            <span className="landing-choice-hint">Step-by-step DBT diary card</span>
          </Link>
          <Link className="landing-choice landing-choice--secondary" to="/dashboard">
            <span className="landing-choice-label">Go to Home</span>
            <span className="landing-choice-hint">Check-in, journal, today, and extra tools—one calm screen</span>
          </Link>
        </div>

        <p className="landing-foot muted">
          Your data stays on this device. When you open the app from your home screen, you&apos;ll land here first.
          {setupStatus === "skipped" ? (
            <>
              {" "}
              <Link to="/setup">Finish setup when you are ready</Link>.
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
