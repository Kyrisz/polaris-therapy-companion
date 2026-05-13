import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buildDaySummary } from "../journal/daySummary";
import { JournalAccessTools } from "../journal/JournalAccessTools";
import { mergeJournalTags, parseManualTagList } from "../journal/journalTags";
import { JOURNAL_TEMPLATES } from "../journal/journalTemplates";
import { compressImageToJpegDataUrl } from "../journal/photoCompress";
import { speakJournalText, stopSpeaking } from "../journal/voiceOcr";
import type { JournalEntry, JournalReminder, WeekdayId } from "../types";
import {
  loadJournal,
  loadJournalReminders,
  saveJournal,
  saveJournalReminders,
  uid,
} from "../storage";
import { todayISO, WEEKDAY_LABEL, weekdayIdFromISO } from "../diary/diaryWeekModel";

const WD_ORDER: WeekdayId[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function reminderDue(r: JournalReminder, now: Date): boolean {
  if (!r.enabled) return false;
  const wd = weekdayIdFromISO(todayISO());
  if (r.weekdays.length && !r.weekdays.includes(wd)) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const target = r.hour * 60 + r.minute;
  return cur >= target;
}

function reminderDoneToday(r: JournalReminder): boolean {
  const d = todayISO();
  return loadJournal().some((e) => e.entryDate === d && e.reminderId === r.id);
}

export default function Journal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const nudgeHandled = useRef(false);
  const skillLogHandled = useRef(false);
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    const ed = searchParams.get("entryDate");
    if (ed && /^\d{4}-\d{2}-\d{2}$/.test(ed)) {
      setEntryDate(ed);
    }
    if (searchParams.get("nudge") === "checkin" && !nudgeHandled.current) {
      nudgeHandled.current = true;
      setTab("write");
      setBody((b) => (b.trim() ? b : "After today's check-in:\n"));
      const next = new URLSearchParams(searchParams);
      next.delete("nudge");
      setSearchParams(next, { replace: true });
    }
    const sk = searchParams.get("skillLog");
    if (sk && !skillLogHandled.current) {
      skillLogHandled.current = true;
      setTab("write");
      setKind("freeform");
      const labels: Record<string, string> = {
        distress: "Distress toolkit (TIPP)",
        urge: "Urge timer",
        body: "Body cues",
        spiral: "Spiral log",
        skills: "Skills sheet",
      };
      const label = labels[sk] || "A skill or tool";
      setTitle((t) => (t.trim() ? t : `After: ${label}`));
      setBody((b) =>
        b.trim()
          ? b
          : `What I used: ${label}\n\nWhat helped (even a little):\n\n`
      );
      setTagInput((prev) => {
        const merged = new Set([...parseManualTagList(prev), ...parseManualTagList("therapy, skill-use")]);
        return [...merged].join(", ");
      });
      const next = new URLSearchParams(searchParams);
      next.delete("skillLog");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const dueReminders = useMemo(() => {
    const now = new Date();
    return loadJournalReminders().filter((r) => reminderDue(r, now) && !reminderDoneToday(r));
  }, [tick]);

  const [tab, setTab] = useState<"write" | "schedule" | "summary">("write");
  const [entryDate, setEntryDate] = useState(todayISO);
  const [kind, setKind] = useState<JournalEntry["kind"]>("freeform");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fromReminderId, setFromReminderId] = useState<string | undefined>(undefined);
  const [templateId, setTemplateId] = useState("");
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [sumDate, setSumDate] = useState(todayISO);
  const [summaryText, setSummaryText] = useState("");
  const [speakingEntryId, setSpeakingEntryId] = useState<string | null>(null);

  useEffect(() => {
    stopSpeaking();
    setSpeakingEntryId(null);
  }, [tab]);

  const [remLabel, setRemLabel] = useState("Evening reflection");
  const [remHour, setRemHour] = useState(21);
  const [remMin, setRemMin] = useState(0);
  const [remDays, setRemDays] = useState<WeekdayId[]>([]);

  const reminderList = useMemo(() => loadJournalReminders(), [tick]);

  const grouped = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    loadJournal()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .forEach((e) => {
        const arr = m.get(e.entryDate) || [];
        arr.push(e);
        m.set(e.entryDate, arr);
      });
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [tick]);

  const filteredGrouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const from = filterFrom.trim();
    const to = filterTo.trim();
    return grouped
      .map(([date, items]) => {
        const itemsF = items.filter((j) => {
          if (from && date < from) return false;
          if (to && date > to) return false;
          if (!q) return true;
          const blob = `${j.title}\n${j.body}\n${(j.tags || []).join("\n")}`.toLowerCase();
          return blob.includes(q);
        });
        return [date, itemsF] as const;
      })
      .filter(([, items]) => items.length > 0);
  }, [grouped, searchQuery, filterFrom, filterTo]);

  function saveEntry(reminderId?: string) {
    if (!body.trim() && !draftPhoto) return;
    const list = loadJournal();
    const bodyOut = body.trim() || (draftPhoto ? "Photo memory" : "");
    const tags = mergeJournalTags(bodyOut, title.trim(), tagInput);
    const e: JournalEntry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      entryDate,
      kind: reminderId ? "scheduled_reflection" : kind,
      title: title.trim(),
      body: bodyOut,
      tags: tags.length ? tags : undefined,
      reminderId,
      templateId: templateId || undefined,
      photoDataUrl: draftPhoto ?? undefined,
    };
    list.push(e);
    saveJournal(list);
    setBody("");
    setTitle("");
    setTagInput("");
    setFromReminderId(undefined);
    setTemplateId("");
    setDraftPhoto(null);
    setPhotoMsg(null);
    bump();
  }

  function applyTemplate(id: string) {
    const t = JOURNAL_TEMPLATES.find((x) => x.id === id);
    if (!t?.body) {
      setTemplateId(id);
      return;
    }
    if (body.trim() && !window.confirm("Replace your current entry text with this template?")) {
      return;
    }
    setTemplateId(id);
    setBody(t.body);
  }

  async function onAttachPhoto(f: File | null) {
    if (!f) return;
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      const data = await compressImageToJpegDataUrl(f);
      if (!data) setPhotoMsg("That image is still too large. Try a smaller or simpler photo.");
      else setDraftPhoto(data);
    } catch {
      setPhotoMsg("Could not read that image.");
    } finally {
      setPhotoBusy(false);
      const inp = document.getElementById("journal-photo-input") as HTMLInputElement | null;
      if (inp) inp.value = "";
    }
  }

  function addReminder() {
    const list = loadJournalReminders();
    list.push({
      id: uid(),
      label: remLabel.trim() || "Reminder",
      hour: Math.min(23, Math.max(0, remHour)),
      minute: Math.min(59, Math.max(0, remMin)),
      weekdays: remDays,
      enabled: true,
    });
    saveJournalReminders(list);
    bump();
  }

  function toggleReminder(id: string) {
    const list = loadJournalReminders().map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    saveJournalReminders(list);
    bump();
  }

  function deleteReminder(id: string) {
    saveJournalReminders(loadJournalReminders().filter((r) => r.id !== id));
    bump();
  }

  function toggleWeekday(d: WeekdayId) {
    setRemDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function runSummary() {
    setSummaryText(buildDaySummary(sumDate));
  }

  function readEntryAloud(j: JournalEntry) {
    stopSpeaking();
    speakJournalText(j.title, j.body, () => setSpeakingEntryId(null));
    setSpeakingEntryId(j.id);
  }

  return (
    <div className="journal-page">
      <header className="card journal-page-head">
        <div className="journal-page-head-text">
          <h2 className="brand-heading">Journal</h2>
          <p className="muted journal-page-lead">
            Private on this device. Dictate, scan handwriting or print, or type—then save when you are ready. For
            session prep, debrief, and search across logs, open the{" "}
            <Link to="/therapy">
              <strong>Therapy</strong>
            </Link>{" "}
            tab. Mood, weekly review, and backup live under{" "}
            <Link to="/tools">
              <strong>Tools</strong>
            </Link>
            .
          </p>
        </div>
        <Link className="btn secondary btn-compact" to={`/day/${entryDate}`}>
          View this day
        </Link>
      </header>

      {dueReminders.length > 0 ? (
        <div className="card journal-nudge">
          <h3>Time for reflection</h3>
          <p className="muted">
            It&apos;s past one of your reminder times today. When you&apos;re ready, capture a few lines (voice
            or text)—this also feeds your end-of-day summary.
          </p>
          <ul className="muted" style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
            {dueReminders.map((r) => (
              <li key={r.id}>
                <strong>{r.label}</strong> ({String(r.hour).padStart(2, "0")}:
                {String(r.minute).padStart(2, "0")})
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setTab("write");
              setKind("scheduled_reflection");
              setFromReminderId(dueReminders[0].id);
              setTitle(dueReminders[0].label);
            }}
          >
            Start from first reminder
          </button>
        </div>
      ) : null}

      <div className="journal-tabs" role="tablist" aria-label="Journal sections">
        {(["write", "schedule", "summary"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`journal-tab ${tab === t ? "on" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "write" ? "Write" : t === "schedule" ? "Reminders" : "Day summary"}
          </button>
        ))}
      </div>

      {tab === "write" ? (
        <section className="card">
          <h3 className="journal-section-title">New entry</h3>
          {fromReminderId ? (
            <p className="muted">
              Writing for reminder <strong>{title || "scheduled"}</strong>.{" "}
              <button type="button" className="link-button" onClick={() => setFromReminderId(undefined)}>
                Clear
              </button>
            </p>
          ) : null}
          <label className="field">
            Day this entry belongs to
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </label>
          {!fromReminderId ? (
            <label className="field">
              DBT-style template (optional)
              <select
                value={templateId}
                onChange={(e) => {
                  applyTemplate(e.target.value);
                }}
              >
                {JOURNAL_TEMPLATES.map((t) => (
                  <option key={t.id || "none"} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!fromReminderId ? (
            <label className="field">
              Entry type
              <select value={kind} onChange={(e) => setKind(e.target.value as JournalEntry["kind"])}>
                <option value="freeform">Free reflection</option>
                <option value="emotion">Emotion or feeling</option>
                <option value="situation">Something that happened</option>
                <option value="session_prep">Before therapy (prep)</option>
                <option value="session_debrief">After therapy (debrief)</option>
              </select>
            </label>
          ) : null}
          <label className="field" htmlFor="journal-title-input">
            Short title (optional)
            <input
              id="journal-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Work stress"
            />
          </label>
          <div className="field">
            <span className="field-label-block" id="journal-body-label">
              Entry
            </span>
            <JournalAccessTools title={title} body={body} setBody={setBody} />
            <textarea
              id="journal-body-input"
              aria-labelledby="journal-body-label"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type or use Dictate / Scan. Add #tags in the text (e.g. #skills) or list tags below—nothing leaves this device until you export it."
            />
          </div>
          <label className="field" htmlFor="journal-tags-input">
            Tags (optional)
            <input
              id="journal-tags-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Comma-separated, e.g. work, therapy — merged with #hashtags in the entry"
            />
          </label>
          <div className="field">
            <span className="field-label-block">Photo (optional)</span>
            <div className="journal-photo-row">
              <button
                type="button"
                className="btn secondary btn-compact"
                disabled={photoBusy}
                onClick={() => document.getElementById("journal-photo-input")?.click()}
              >
                {photoBusy ? "Compressing…" : "Attach photo"}
              </button>
              {draftPhoto ? (
                <button type="button" className="btn secondary btn-compact" onClick={() => setDraftPhoto(null)}>
                  Remove photo
                </button>
              ) : null}
              <input
                id="journal-photo-input"
                type="file"
                accept="image/*"
                className="visually-hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => void onAttachPhoto(e.target.files?.[0] ?? null)}
              />
            </div>
            {photoMsg ? <p className="journal-a11y-msg">{photoMsg}</p> : null}
            {draftPhoto ? (
              <img className="journal-photo-preview" src={draftPhoto} alt="Attached preview" />
            ) : null}
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
              Photos are compressed and stored in this browser only. Very large libraries may fill storage—export
              a backup from Home occasionally.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => saveEntry(fromReminderId)}>
            Save entry
          </button>
        </section>
      ) : null}

      {tab === "schedule" ? (
        <section className="card">
          <h3 className="journal-section-title">Reflection reminders</h3>
          <p className="muted">
            Local time only. When you open the app on a matching day after that time, we nudge you on this page
            (no background push unless you add that later).
          </p>
          <label className="field">
            Label
            <input type="text" value={remLabel} onChange={(e) => setRemLabel(e.target.value)} />
          </label>
          <div className="grid-2">
            <label className="field">
              Hour (0–23)
              <input type="number" min={0} max={23} value={remHour} onChange={(e) => setRemHour(Number(e.target.value))} />
            </label>
            <label className="field">
              Minute (0–59)
              <input type="number" min={0} max={59} value={remMin} onChange={(e) => setRemMin(Number(e.target.value))} />
            </label>
          </div>
          <p className="muted" style={{ marginBottom: "0.35rem" }}>
            Weekdays (leave all unchecked for every day)
          </p>
          <div className="chips">
            {WD_ORDER.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${remDays.includes(d) ? "on" : ""}`}
                onClick={() => toggleWeekday(d)}
              >
                {WEEKDAY_LABEL[d].slice(0, 3)}
              </button>
            ))}
          </div>
          <button type="button" className="btn" style={{ marginTop: "0.75rem" }} onClick={addReminder}>
            Add reminder
          </button>

          <h4 className="journal-subheading">Your reminders</h4>
          {!reminderList.length ? (
            <p className="muted">None yet.</p>
          ) : (
            <ul className="simple-list">
              {reminderList.map((r) => (
                <li key={r.id} className="journal-rem-row">
                  <div>
                    <strong>{r.label}</strong>{" "}
                    <span className="muted">
                      {String(r.hour).padStart(2, "0")}:{String(r.minute).padStart(2, "0")}{" "}
                      {r.weekdays.length ? `· ${r.weekdays.map((d) => WEEKDAY_LABEL[d].slice(0, 3)).join(", ")}` : "· daily"}
                    </span>
                  </div>
                  <div className="journal-rem-actions">
                    <button type="button" className="btn secondary" onClick={() => toggleReminder(r.id)}>
                      {r.enabled ? "Pause" : "Resume"}
                    </button>
                    <button type="button" className="btn secondary" onClick={() => deleteReminder(r.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "summary" ? (
        <section className="card">
          <h3 className="journal-section-title">End-of-day summary</h3>
          <p className="muted">
            Built from your DBT row, moods, spirals, journal, and memory line for that calendar day—local only
            (not AI). Open the unified{" "}
            <Link to={`/day/${sumDate}`}>day view for {sumDate}</Link> anytime.
          </p>
          <label className="field">
            Date
            <input type="date" value={sumDate} onChange={(e) => setSumDate(e.target.value)} />
          </label>
          <div className="journal-summary-actions">
            <button type="button" className="btn" onClick={runSummary}>
              Generate summary
            </button>
            {summaryText ? (
              <>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => void navigator.clipboard.writeText(summaryText)}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => speakJournalText("", summaryText)}
                  disabled={!summaryText.trim()}
                >
                  Read aloud
                </button>
                <button type="button" className="btn secondary" onClick={() => stopSpeaking()}>
                  Stop reading
                </button>
              </>
            ) : null}
          </div>
          {summaryText ? (
            <pre className="journal-summary-out">{summaryText}</pre>
          ) : (
            <p className="muted">Generate to see your day in one place.</p>
          )}
        </section>
      ) : null}

      <section className="card">
        <h3 className="journal-section-title">Recent entries</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Search by word or filter by the day the entry belongs to.
        </p>
        <div className="journal-search-row">
          <label className="field journal-search-field">
            Search
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Title, body, or tags"
              aria-label="Filter journal entries by text"
            />
          </label>
          <label className="field journal-search-field">
            From date
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </label>
          <label className="field journal-search-field">
            To date
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </label>
        </div>
        {!grouped.length ? (
          <p className="muted">No journal entries yet—when you are ready, add one above.</p>
        ) : !filteredGrouped.length ? (
          <p className="muted">No entries match this search. Try different words or clear the date filters.</p>
        ) : (
          filteredGrouped.slice(0, 14).map(([date, items]) => (
            <div key={date} className="journal-day-block">
              <h4 className="journal-day-title">{date}</h4>
              {items.map((j) => (
                <div key={j.id} className="journal-entry-snippet">
                  <div className="journal-entry-meta">
                    <span className="muted">
                      {new Date(j.createdAt).toLocaleString()} · {j.kind.replace(/_/g, " ")}
                    </span>
                    <button
                      type="button"
                      className="btn secondary btn-compact journal-listen-btn"
                      onClick={() => readEntryAloud(j)}
                      disabled={!j.body.trim() && !j.title.trim() && !j.photoDataUrl}
                    >
                      {speakingEntryId === j.id ? "Playing…" : "Listen"}
                    </button>
                  </div>
                  {j.title ? <strong>{j.title}</strong> : null}
                  {j.tags && j.tags.length ? (
                    <div className="journal-tags" aria-label="Tags">
                      {j.tags.map((t) => (
                        <span key={t} className="journal-tag">
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>{j.body}</p>
                  {j.photoDataUrl ? (
                    <img className="journal-photo-preview" src={j.photoDataUrl} alt="" loading="lazy" />
                  ) : null}
                </div>
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
