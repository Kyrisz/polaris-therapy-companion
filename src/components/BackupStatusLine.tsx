import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadLastBackupExportAt } from "../storage";

type Props = {
  /** When true, omits the extra link (e.g. on Tools → Your data). */
  compact?: boolean;
};

export function BackupStatusLine({ compact }: Props) {
  const [iso, setIso] = useState(() => loadLastBackupExportAt());

  useEffect(() => {
    const fn = () => setIso(loadLastBackupExportAt());
    window.addEventListener("dbt-backup-exported", fn);
    return () => window.removeEventListener("dbt-backup-exported", fn);
  }, []);

  const text = (() => {
    if (!iso) {
      return "You have not downloaded a JSON backup from this app on this device yet. When you can, use the button below or on Home.";
    }
    try {
      const when = new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
      return `Last backup you downloaded here: ${when}.`;
    } catch {
      return "Last backup time could not be read.";
    }
  })();

  return (
    <p className="backup-status-line muted" style={{ marginTop: compact ? 0 : "0.5rem" }}>
      {text}
      {!compact ? (
        <>
          {" "}
          <Link to="/tools#data">
            <strong>Tools → Your data</strong>
          </Link>
        </>
      ) : null}
    </p>
  );
}
