import { useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { applyBackupImport, parseBackupJson, previewBackupPayload } from "../export/backupImport";
import type { AppBackupPayload } from "../export/backupExport";

type Props = {
  onApplied?: () => void;
};

export function BackupImportPanel({ onApplied }: Props) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<AppBackupPayload | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [doneMsg, setDoneMsg] = useState("");

  function reset() {
    setError("");
    setPayload(null);
    setDoneMsg("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    reset();
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseBackupJson(text);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setPayload(parsed.payload);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(f, "utf-8");
  }

  function confirmImport() {
    if (!payload) return;
    try {
      applyBackupImport(payload, mode);
      setDoneMsg(mode === "replace" ? "Replaced local data with this backup." : "Merged backup into your local data.");
      setPayload(null);
      if (fileRef.current) fileRef.current.value = "";
      onApplied?.();
      try {
        window.dispatchEvent(new Event("dbt-streak-updated"));
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  const preview = payload ? previewBackupPayload(payload) : null;

  return (
    <div className="backup-import-panel">
      <label className="field" htmlFor={`${id}-file`}>
        Choose a backup JSON file
        <input
          id={`${id}-file`}
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
        />
      </label>

      {error ? (
        <p className="backup-import-error" role="alert">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="card-inset backup-import-preview">
          <p className="muted" style={{ marginTop: 0 }}>
            <strong>Preview</strong> (exported {preview.exportedAt.slice(0, 19).replace("T", " ")} local time)
          </p>
          <ul className="backup-import-counts muted">
            <li>
              <strong>{preview.diaryWeeks}</strong> diary week blocks
            </li>
            <li>
              <strong>{preview.journal}</strong> journal entries
            </li>
            <li>
              <strong>{preview.mood}</strong> mood logs · <strong>{preview.spiral}</strong> spirals
            </li>
            <li>
              <strong>{preview.weekly}</strong> weekly reviews
            </li>
            <li>
              <strong>{preview.dailyLegacy}</strong> legacy daily rows
            </li>
            <li>
              <strong>{preview.dayTaglineKeys}</strong> memory-line days
            </li>
          </ul>

          <fieldset className="backup-import-modes">
            <legend className="field-label-inline">How to apply</legend>
            <label className="wizard-radio">
              <input
                type="radio"
                name={`${id}-mode`}
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
              />
              <span>
                <strong>Merge</strong> — combine with what is already here (same diary week Monday is merged row by
                row; journal and mood entries union by id; memory lines from the file overwrite same dates).{" "}
                <strong>Check-in streak is not changed</strong> in merge mode.
              </span>
            </label>
            <label className="wizard-radio">
              <input
                type="radio"
                name={`${id}-mode`}
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              <span>
                <strong>Replace all</strong> — this browser&apos;s app data becomes exactly this backup (cannot undo
                except from another backup).
              </span>
            </label>
          </fieldset>

          <div className="backup-import-actions">
            <button type="button" className="btn" onClick={confirmImport}>
              Import now
            </button>
            <button type="button" className="btn secondary btn-compact" onClick={reset}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {doneMsg ? (
        <p className="wizard-saved" role="status">
          {doneMsg}
        </p>
      ) : null}
    </div>
  );
}
