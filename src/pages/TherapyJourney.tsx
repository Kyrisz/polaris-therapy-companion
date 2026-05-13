import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BringToTherapyPanel } from "../components/BringToTherapyPanel";
import { PipMessage } from "../components/PipMessage";
import { PipStar } from "../components/PolarisMarks";
import { TherapySessionForms } from "../components/TherapySessionForms";
import { UnifiedSearch } from "../components/UnifiedSearch";
import { PIP_HINTS } from "../pip/pipHints";
import { dismissPipHint, loadPipPrefs } from "../pip/pipStorage";

const TABS = ["prep", "bring", "search"] as const;
type Tab = (typeof TABS)[number];
const THERAPY_TAB_KEY = "dbt-app:therapy-last-tab";

function parseTab(raw: string | null): Tab {
  if (raw && (TABS as readonly string[]).includes(raw)) return raw as Tab;
  return "prep";
}

export default function TherapyJourney() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => {
    const qp = parseTab(searchParams.get("tab"));
    if (searchParams.get("tab")) return qp;
    try {
      return parseTab(localStorage.getItem(THERAPY_TAB_KEY));
    } catch {
      return qp;
    }
  }, [searchParams]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && !(TABS as readonly string[]).includes(t)) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", "prep");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    try {
      localStorage.setItem(THERAPY_TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  function setTab(next: Tab) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div className="therapy-journey-page">
      <header className="card">
        <div className="therapy-head">
          <h2 className="brand-heading">Therapy companion</h2>
          <PipStar size={26} />
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Session prep and debrief, a printable-style bundle, and search across your local logs—nothing is sent
          unless you choose to copy or export it yourself.
        </p>
        <p className="muted" style={{ fontSize: "0.88rem" }}>
          Prefer the full journal? <Link to="/journal">Journal</Link> · Distress tools under{" "}
          <Link to="/tools">Tools</Link>.
        </p>
        {(() => {
          const pip = loadPipPrefs();
          const hint = PIP_HINTS.find((h) => h.screen === "therapy") || null;
          if (!pip.enabled || !hint || pip.dismissedHintIds.includes(hint.id)) return null;
          return (
            <PipMessage
              text={hint.text}
              action={hint.action}
              onDismiss={() => dismissPipHint(hint.id)}
            />
          );
        })()}
      </header>

      <div className="therapy-tabs" role="tablist" aria-label="Therapy sections">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`therapy-tab ${tab === t ? "on" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "prep" ? "Session notes" : t === "bring" ? "Bundle / Print" : "Search"}
          </button>
        ))}
      </div>

      {tab === "prep" ? <TherapySessionForms /> : null}
      {tab === "bring" ? <BringToTherapyPanel /> : null}
      {tab === "search" ? <UnifiedSearch /> : null}
    </div>
  );
}
