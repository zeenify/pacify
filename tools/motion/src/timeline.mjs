/* Timeline: turns narration.json into absolute act boundaries and per-line local
   times. Visual beats key off line start/end, so swapping `est` for measured TTS
   durations reflows every act with no other change. */

export function buildTimeline(narration, fps) {
  const acts = [];
  let cursor = 0;

  for (const act of narration.acts) {
    const lines = [];
    let t = act.lead;
    for (const line of act.lines) {
      const dur = line.measured ?? line.est;
      lines.push({ id: line.id, text: line.text, start: t, end: t + dur });
      t += dur + (line.gap ?? 0);
    }
    const duration = t + act.tail;
    acts.push({
      id: act.id,
      title: act.title,
      start: cursor,
      end: cursor + duration,
      duration,
      lines,
    });
    cursor += duration;
  }

  const total = cursor;
  return {
    acts,
    total,
    fps,
    totalFrames: Math.round(total * fps),
  };
}

/** Which act owns absolute time t, and the local time inside it. */
export function locate(tl, t) {
  for (const a of tl.acts) {
    if (t >= a.start && t < a.end) return { act: a, local: t - a.start };
  }
  const last = tl.acts[tl.acts.length - 1];
  return { act: last, local: Math.min(last.duration, Math.max(0, t - last.start)) };
}

/** Local start/end of a line id within its act, or null. */
export function lineWindow(act, id) {
  const l = act.lines.find((x) => x.id === id);
  return l ? { start: l.start, end: l.end } : null;
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
