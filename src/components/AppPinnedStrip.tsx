import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { labelForPinnedPath, loadPinnedToolsNormalized, resolvePinnedHref } from "../pinnedTools";

export function AppPinnedStrip() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    window.addEventListener("dbt-pins-updated", fn);
    return () => window.removeEventListener("dbt-pins-updated", fn);
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  void tick;
  const pinned = loadPinnedToolsNormalized();
  if (!pinned.length) return null;

  return (
    <div className="nav-pinned-wrap no-print">
      <p className="nav-pinned-label muted">Pinned</p>
      <div className="nav-pinned-strip" role="list" aria-label="Pinned tools">
        {pinned.map((p) => (
          <Link key={p} className="nav-pinned-chip" role="listitem" to={resolvePinnedHref(p)}>
            {labelForPinnedPath(p)}
          </Link>
        ))}
      </div>
    </div>
  );
}
