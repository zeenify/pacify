/* One tutorial transcript across the whole orientation flow.
   The intro and the guided duel are separate screens, but the player should be
   able to open the log at any point and see everything that has been said or
   chosen since they pressed ENTER. Session-scoped, cleared on a fresh run. */

export type TutorialLogEntry = { id: string; speaker: "VICTOR" | "YOU"; text: string };

const KEY = "pacify_tutorial_log_v1";
let memory: TutorialLogEntry[] = [];

function read(): TutorialLogEntry[] {
  if (typeof window === "undefined") return memory;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : memory;
  } catch {
    return memory;
  }
}

function write(entries: TutorialLogEntry[]) {
  memory = entries;
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* storage full/blocked */ }
}

export function loadTutorialLog(): TutorialLogEntry[] {
  return read();
}

/** Append once (id is the dedupe key) and return the merged transcript. */
export function appendTutorialLog(entry: TutorialLogEntry): TutorialLogEntry[] {
  const current = read();
  if (current.some((e) => e.id === entry.id)) return current;
  const next = [...current, entry];
  write(next);
  return next;
}

export function clearTutorialLog() {
  write([]);
}
