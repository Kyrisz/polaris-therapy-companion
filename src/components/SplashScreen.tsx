import { useEffect, useMemo, useState } from "react";
import { PolarisStarMark } from "./PolarisMarks";

type Props = {
  title: string;
  subtitle?: string;
  durationMs?: number;
  onDone: () => void;
};

function prefersReducedMotion(): boolean {
  try {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

export function SplashScreen({ title, subtitle, durationMs, onDone }: Props) {
  const reduce = useMemo(() => prefersReducedMotion(), []);
  const ms = durationMs ?? (reduce ? 250 : 1100);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let leaveTimer: number | null = null;
    const id = window.setTimeout(() => {
      setLeaving(true);
      leaveTimer = window.setTimeout(() => onDone(), reduce ? 80 : 240);
    }, ms);
    return () => {
      window.clearTimeout(id);
      if (leaveTimer != null) window.clearTimeout(leaveTimer);
    };
  }, [ms, onDone, reduce]);

  return (
    <div className={`splash ${leaving ? "splash--leave" : ""}`} aria-label="Loading">
      <div className="splash-inner">
        <div className="splash-mark" aria-hidden="true">
          <PolarisStarMark size={62} className="splash-star" />
          <span className="splash-sparkle" />
          <span className="splash-sparkle splash-sparkle--b" />
          <span className="splash-sparkle splash-sparkle--c" />
        </div>
        <div className="splash-title">{title}</div>
        {subtitle ? <div className="splash-sub">{subtitle}</div> : null}
      </div>
    </div>
  );
}

