/* Voice player — Klein's spoken lines.
   Transport: POST {ticket} -> ${API_URL}/voice, streaming MP3 (credentials: include).
   Playback: MediaSource("audio/mpeg") where supported — playback starts before the
   clip finishes downloading and arbitrary chunk boundaries are handled by MSE
   (sourceBuffer.mode = "sequence", so concatenated MPEG frames need no timestamps).
   Browsers without MSE get a BOUNDED in-memory fallback (whole clip, ≤8MB, then a
   blob URL). Every failure path lands back on text-only play; voice never blocks
   gameplay (screens only react to callbacks).

   SCREEN CONTRACT (story/duel):
   - onBeforePlay fires when audio is confirmed playable and BEFORE any sample
     sounds. Reveal the full line synchronously inside it; the player waits TWO
     requestAnimationFrames (setTimeout fallback off-DOM) before calling play(),
     so the revealed text is painted first.
   - onStart fires when audio is actually audible; onEnd ALWAYS fires exactly once,
     last, with a reason: "ended" | "cancelled" (cancel/supersede/route-leave) |
     "disabled" (voice switched off) | "error" (onError fired just before). No-op
     plays (disabled / pre-unlock / empty ticket) still fire onEnd exactly once.
   - PLAYING MODEL — one voice at a time, two ways to arrive:
     * Default (supersede): the new playVoice cuts the current line (its onEnd
       arrives as "cancelled"). Player-driven advance (story) wants exactly this.
     * { queue: true } (conversation): the speaking line is never cut. The new
       line parks in a single PENDING slot, prefetches while it waits, and starts
       after a short breath once the current line ends. A newer arrival replaces
       the pending line (its onEnd fires "cancelled" immediately — it never
       played). stopVoice()/route-leave flushes both slots. The queue survives
       only a line that ended (or errored) on its own; an explicit cancel means
       silence now. Stale-line guards should still compare line ids in onEnd.
     * voiceBusy() reports "a line is speaking or waiting" for screens that hold
       UI (bubbles, dots) while the chain drains.
   - cancel() is idempotent; after a natural end it is a harmless no-op.

   PREFETCH: prefetchVoice(ticket) warms at most ONE next line — a newer prefetch
   replaces the older (aborting it), cancel() aborts it, and any playVoice of a
   DIFFERENT ticket evicts it. playVoice(sameTicket) ADOPTS the prefetch: the
   original live stream (or the completed buffer) continues under the session with
   no duplicate request, and the old prefetch handle becomes permanently inert —
   after adoption only the playVoice handle (or stopVoice()) controls playback.
   Bounded to one slot and 8MB. The player never self-initiates a fetch: do NOT
   prefetch unselected reply choices — only tickets you pass reach the provider.

   MIXER/UNLOCK: voice is its own bus on the sfx mixer — effective element volume
   is main * (mutedMain) * voiceVol * (mutedVoice). MAIN mute silences voices
   (playback continues silently so onEnd timing stays consistent) and is fully
   independent of SFX mute. The VOICE mute toggle in options is a hard disable:
   off => nothing is ever fetched and the current play aborts. Audio arming rides
   the existing login gesture through sfx.unlockSfx() — no screen changes needed.

   PRIVACY/PROVIDER NOTE: spoken dialogue (which may include the player's name) is
   synthesized by Fish Audio; its terms allow data use for model improvement. The
   chosen public voice clone is not marked as Fish-licensed — availability is not
   proof of rights clearance. Keep voice optional end to end. */

import { API_URL } from "./api";
import {
  audioUnlocked,
  getEffectiveVoiceVol,
  subscribeAudioUnlock,
  subscribeMix,
} from "./sfx";

export type VoiceEndReason = "ended" | "cancelled" | "error" | "disabled";
export type VoiceHandle = { cancel(): void };
export type VoicePhase = "idle" | "pending" | "speaking";
export type VoicePlayCallbacks = {
  onBeforePlay?: () => void;
  onStart?: () => void;
  onEnd?: (reason: VoiceEndReason) => void;
  onError?: (err: unknown) => void;
};

/* Bounded fallback: a buffered whole clip may never exceed this. */
const FALLBACK_MAX_BYTES = 8 * 1024 * 1024;
/* Playable-or-bust watchdog: also doubles as the fetch/first-byte timeout. */
const FIRST_AUDIO_TIMEOUT_MS = 10_000;
const MSE_OPEN_TIMEOUT_MS = 4_000;
const CANPLAY_TIMEOUT_MS = 8_000;
/* Seconds of buffered audio required before streaming playback may begin
   (a single MPEG frame can be ~13ms; starting on that would stutter). */
const MIN_START_BUFFERED = 0.35;
/* Paint beats between onBeforePlay and audio.play() — full-line reveal lands first. */
const START_FRAMES = 2;
/* Breath between queued lines — consecutive speech without a beat sounds like
   one run-on clip; a short pause reads as the character finishing their turn. */
const LINE_GAP_MS = 250;

/* 44-byte header + zero data bytes — a valid silent WAV used to arm the element
   inside the login gesture (same trick as the BGM unlock). */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

type ChunkSource = {
  mime: string; // "" until response headers arrive
  next(): Promise<Uint8Array | null>;
  abort(): void;
};

type Session = {
  gen: number;
  ticket: string;
  cb: VoicePlayCallbacks;
  phase: VoicePhase;
  beginCalled: boolean; // startPlayback entered (onBeforePlay fired)
  ended: boolean;
  source: ChunkSource | null;
  el: HTMLAudioElement | null;
  ms: MediaSource | null;
  sb: SourceBuffer | null;
  objUrl: string | null;
  timers: ReturnType<typeof setTimeout>[];
};

let el: HTMLAudioElement | null = null;
let armed = false;
let current: Session | null = null;
/* Conversation mode: the NEXT line, parked while `current` finishes. One deep —
   a newer arrival replaces it (stale chatter must not pile up). */
let pending: Session | null = null;
/* Armed while a finished line's LINE_GAP breath is running; the pending line
   promotes when it fires. Cleared by every flush path. */
let promoteTimer: ReturnType<typeof setTimeout> | null = null;
let genSeq = 0;
let enabled = true;

// ---- prefetch (single bounded slot) --------------------------------------
type Prefetch = {
  ticket: string;
  mime: string;
  chunks: Uint8Array[]; // unconsumed tail (session drains via shift)
  bytes: number;
  waiters: Array<() => void>;
  src: ChunkSource | null; // underlying stream, owned by the pump loop
  done: boolean;
  failed: boolean;
  dead: boolean;
  adopted: boolean;
};
let prefetchSlot: Prefetch | null = null;

// ---- small helpers --------------------------------------------------------
function safeCall(fn: (() => void) | undefined) {
  if (!fn) return;
  try { fn(); } catch { /* a screen bug must never kill the player */ }
}

function mseSupported(): boolean {
  const MS = (globalThis as any).MediaSource;
  if (!MS || typeof MS.isTypeSupported !== "function") return false;
  try { return !!MS.isTypeSupported("audio/mpeg"); } catch { return false; }
}

function paintBeats(n: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    } else {
      setTimeout(resolve, 32 * n); // off-DOM fallback (tests, workers)
    }
  });
}

function waitEvent(target: any, ev: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;
    const cleanup = () => {
      clearTimeout(timer);
      try { target.removeEventListener(ev, on); } catch { /* fake targets */ }
    };
    const on = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error(`VOICE WAIT TIMEOUT ${ev}`));
    }, timeoutMs);
    try {
      target.addEventListener(ev, on);
      // The event may already be in its past (sourceopen on a warm MediaSource).
      if (target.readyState === "open") on();
    } catch (err) {
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// ---- shared element --------------------------------------------------------
function ensureEl(): HTMLAudioElement | null {
  if (el) return el;
  if (typeof Audio === "undefined") return null;
  try {
    el = new Audio();
    el.preload = "auto";
  } catch {
    return null;
  }
  el.addEventListener("ended", () => {
    const s = current;
    if (s && !s.ended) endSession(s, "ended");
  });
  el.addEventListener("error", () => {
    const s = current;
    if (!s || s.ended) return;
    const code = (el as any)?.error?.code;
    failSession(s, new Error(`VOICE ELEMENT ERROR${code ? " " + code : ""}`));
  });
  return el;
}

function applyVoiceVolume(target?: HTMLAudioElement | null) {
  const e = target ?? el;
  // Voice is its own bus and used to sit at main(0.7) * voice(0.8) = 0.56 —
  // clearly audible but too quiet under the dialogue mix. Boost here (not in
  // the default bus) so it applies to returning players with saved options too;
  // HTMLAudioElement.volume clamps at 1, so mutes and the slider still work.
  if (e) e.volume = Math.min(1, getEffectiveVoiceVol() * 1.5);
}

/* Called inside the login gesture (via sfx.unlockSfx subscribers): a volume-0
   play/pause covers the element with user activation, like unlockBgm does. */
function arm() {
  const e = ensureEl();
  if (!e || armed || current) return;
  armed = true;
  try {
    const myGen = genSeq;
    e.volume = 0;
    e.src = SILENT_WAV;
    const p = e.play();
    if (p)
      p.then(() => {
        // A real session took over (it owns src + volume) — do not pause its audio.
        if (genSeq !== myGen || current) return;
        try { e.pause(); e.currentTime = 0; } catch { /* already reset */ }
        applyVoiceVolume(e);
      }).catch(() => { applyVoiceVolume(e); });
  } catch { applyVoiceVolume(e); }
}

// ---- transport -------------------------------------------------------------
async function openTicketStream(ticket: string, register: (s: ChunkSource) => void): Promise<ChunkSource> {
  const ctrl = new AbortController();
  // Registered BEFORE the fetch so teardown can always abort, even pre-headers.
  const source: ChunkSource = {
    mime: "",
    abort: () => { try { ctrl.abort(); } catch { /* aborted already */ } },
    next: async () => { throw new Error("VOICE STREAM NOT READY"); },
  };
  register(source);
  let res: Response;
  try {
    res = await fetch(API_URL + "/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
      credentials: "include",
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new Error(`VOICE NETWORK ${(err as Error)?.name ?? "ERROR"}`);
  }
  if (!res.ok) throw new Error(`VOICE HTTP ${res.status}`);
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (mime && !mime.startsWith("audio/")) throw new Error(`VOICE BAD MIME ${mime}`);
  source.mime = mime || "audio/mpeg";
  const body = res.body;
  if (!body) {
    // No streaming response support: one synthetic chunk after the full download.
    const ab = await res.arrayBuffer();
    let sent = false;
    source.next = async () => {
      if (sent) return null;
      sent = true;
      return new Uint8Array(ab);
    };
    return source;
  }
  const reader = body.getReader();
  source.next = async () => {
    const r = await reader.read();
    return r.done ? null : r.value;
  };
  return source;
}

// ---- session lifecycle -----------------------------------------------------
function endSession(s: Session, reason: VoiceEndReason) {
  if (s.ended) return;
  s.ended = true;
  teardownSession(s);
  if (current === s) {
    current = null;
    // The queue survives only a line that finished (or failed) on its own —
    // an explicit cancel/abort means the caller wants silence right now.
    if (reason === "ended" || reason === "error") schedulePromotion();
    else flushQueue("cancelled");
  }
  if (pending === s) {
    pending = null;
    dropQueuePrefetch(s);
  }
  safeCall(() => s.cb.onEnd?.(reason)); // LAST, after all state changes
}

function cancelSession(s: Session) {
  endSession(s, "cancelled");
}

function failSession(s: Session, err: unknown) {
  if (s.ended) return;
  safeCall(() => s.cb.onError?.(err));
  endSession(s, "error");
}

/* Conversation handoff: after the breath, the parked line becomes the speaking
   line. Reads `pending` at FIRE time so a line parked during the gap promotes. */
function schedulePromotion() {
  if (!pending) return;
  if (promoteTimer) clearTimeout(promoteTimer);
  promoteTimer = setTimeout(() => {
    promoteTimer = null;
    const s = pending;
    pending = null;
    if (!s || s.ended || current) return;
    current = s;
    void runSession(s, takeAdopted(s.ticket));
  }, LINE_GAP_MS);
}

/* A parked line's prefetch is its fuel — dropped with it, or it downloads on. */
function dropQueuePrefetch(s: Session) {
  if (prefetchSlot && prefetchSlot.ticket === s.ticket) stopPrefetch(prefetchSlot);
}

/* Silence now: drop the parked line and any promotion in flight. */
function flushQueue(reason: VoiceEndReason) {
  if (promoteTimer) { clearTimeout(promoteTimer); promoteTimer = null; }
  const s = pending;
  pending = null;
  if (s) dropQueuePrefetch(s);
  if (s && !s.ended) endSession(s, reason);
}

function teardownSession(s: Session) {
  for (const t of s.timers) clearTimeout(t);
  s.timers = [];
  try { s.source?.abort(); } catch { /* aborted already */ }
  s.source = null;
  const e = s.el;
  if (e) {
    try { e.pause(); } catch { /* never started */ }
    // Detach cleanly: removing src + load() releases the MediaSource/blob.
    try { e.removeAttribute("src"); e.load(); } catch { /* already detached */ }
  }
  s.el = null;
  s.ms = null;
  s.sb = null;
  if (s.objUrl) {
    try { URL.revokeObjectURL(s.objUrl); } catch { /* already revoked */ }
    s.objUrl = null;
  }
}

async function startPlayback(s: Session): Promise<void> {
  if (s.beginCalled || s.ended || !s.el) return;
  s.beginCalled = true;
  safeCall(s.cb.onBeforePlay); // screen reveals the full line NOW (synchronously)
  await paintBeats(START_FRAMES);
  if (s.ended) return;
  applyVoiceVolume(s.el);
  try {
    await s.el.play();
  } catch (err) {
    throw new Error(`VOICE PLAY BLOCKED ${(err as Error)?.name ?? ""}`.trim());
  }
  if (s.ended) return;
  s.phase = "speaking";
  safeCall(s.cb.onStart);
}

function beginPlayback(s: Session): Promise<void> {
  return startPlayback(s).catch((err) => {
    if (!s.ended) failSession(s, err);
  });
}

async function runSession(s: Session, adopted: ChunkSource | null) {
  // Watchdog: covers hung fetches, silent MSE failures and never-playable clips.
  s.timers.push(setTimeout(() => {
    if (!s.ended && !s.beginCalled) failSession(s, new Error("VOICE START TIMEOUT"));
  }, FIRST_AUDIO_TIMEOUT_MS));
  try {
    const source = adopted ?? (await openTicketStream(s.ticket, (src) => { s.source = src; }));
    if (s.ended) return;
    if (!s.source) s.source = source;
    const mime = source.mime;
    const useMse = mseSupported() && (mime === "" || mime.startsWith("audio/mpeg"));
    if (useMse) await runMse(s, source);
    else await runBuffered(s, source);
  } catch (err) {
    if (s.ended) return; // superseded/aborted: endSession already fired once
    failSession(s, err);
  }
}

/* MSE path — playback begins before the download completes. The read loop is the
   single producer; pump() is the single consumer chained by "updateend". */
async function runMse(s: Session, source: ChunkSource) {
  const e = (s.el = ensureEl());
  if (!e) throw new Error("VOICE ELEMENT UNAVAILABLE");
  const ms = new MediaSource();
  s.ms = ms;
  s.objUrl = URL.createObjectURL(ms);
  e.pause();
  applyVoiceVolume(e);
  e.src = s.objUrl;
  await waitEvent(ms, "sourceopen", MSE_OPEN_TIMEOUT_MS);
  if (s.ended) return;
  const sb = ms.addSourceBuffer("audio/mpeg");
  try { sb.mode = "sequence"; } catch { /* older engines keep "segments" */ }
  s.sb = sb;

  const queue: Uint8Array[] = [];
  let streamDone = false;

  const tryStart = () => {
    if (s.beginCalled || s.ended) return;
    let enough = false;
    try {
      const b = e.buffered;
      enough = b.length > 0 && b.end(b.length - 1) >= MIN_START_BUFFERED;
    } catch { enough = false; }
    if (enough) void beginPlayback(s);
  };

  const maybeFinish = () => {
    if (s.ended || !streamDone || sb.updating || queue.length > 0) return;
    try { if (ms.readyState === "open") ms.endOfStream(); } catch { /* already ended */ }
    // A clip shorter than the start threshold still gets its moment.
    if (!s.beginCalled) void beginPlayback(s);
  };

  const pump = () => {
    if (s.ended) return;
    if (sb.updating || queue.length === 0) { maybeFinish(); return; }
    const chunk = queue.shift()!;
    try { sb.appendBuffer(chunk as Uint8Array<ArrayBuffer>); } catch (err) { failSession(s, err); return; }
    const onUpd = () => {
      sb.removeEventListener("updateend", onUpd);
      if (s.ended) return;
      tryStart();
      pump();
    };
    sb.addEventListener("updateend", onUpd);
  };

  for (;;) {
    const chunk = await source.next();
    if (s.ended) return;
    if (chunk === null) break;
    queue.push(chunk);
    pump();
  }
  streamDone = true;
  maybeFinish();
}

/* Buffered fallback — no MSE (or a non-MP3 audio mime): accumulate the whole clip
   under a hard byte cap, then play from a blob URL. */
async function runBuffered(s: Session, source: ChunkSource) {
  const e = (s.el = ensureEl());
  if (!e) throw new Error("VOICE ELEMENT UNAVAILABLE");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const chunk = await source.next();
    if (s.ended) return;
    if (chunk === null) break;
    chunks.push(chunk);
    bytes += chunk.byteLength;
    if (bytes > FALLBACK_MAX_BYTES) throw new Error("VOICE CLIP TOO LARGE");
  }
  const blob = new Blob(chunks as BlobPart[], { type: source.mime || "audio/mpeg" });
  s.objUrl = URL.createObjectURL(blob);
  e.pause();
  applyVoiceVolume(e);
  e.src = s.objUrl;
  await waitEvent(e, "canplay", CANPLAY_TIMEOUT_MS);
  if (s.ended) return;
  await beginPlayback(s);
}

// ---- prefetch --------------------------------------------------------------
function flushWaiters(p: Prefetch) {
  for (const w of p.waiters.splice(0)) w();
}

function stopPrefetch(p: Prefetch) {
  p.dead = true;
  if (prefetchSlot === p) prefetchSlot = null;
  try { p.src?.abort(); } catch { /* aborted already */ }
  p.src = null;
  flushWaiters(p);
}

/* The pump loop is the ONLY reader of the prefetch stream; adopted sessions
   consume through the shared queue, which is what makes mid-flight handoff
   race-free (never two concurrent read() calls on one reader). */
function pumpPrefetch(p: Prefetch) {
  void (async () => {
    try {
      const src = await openTicketStream(p.ticket, (s0) => { p.src = s0; });
      if (p.dead) return;
      p.mime = src.mime || "audio/mpeg";
      for (;;) {
        const chunk = await src.next();
        if (p.dead) return;
        if (chunk === null) { p.done = true; break; }
        p.bytes += chunk.byteLength;
        p.chunks.push(chunk);
        if (p.bytes > FALLBACK_MAX_BYTES) {
          p.failed = true;
          stopPrefetch(p);
          return;
        }
        flushWaiters(p);
      }
    } catch {
      if (p.dead) return;
      p.failed = true;
    }
    flushWaiters(p);
  })();
}

function adoptedSource(p: Prefetch): ChunkSource {
  return {
    mime: p.mime || "audio/mpeg",
    abort: () => stopPrefetch(p),
    next: async () => {
      for (;;) {
        if (p.chunks.length > 0) return p.chunks.shift()!;
        if (p.done) return null;
        if (p.failed) throw new Error("VOICE PREFETCH FAILED");
        if (p.dead) return null;
        await new Promise<void>((resolve) => p.waiters.push(resolve));
      }
    },
  };
}

/* Adoption removes the slot; the old prefetch handle's cancel() checks ownership
   and becomes permanently inert so it can never stop audio the session owns. */
function takeAdopted(ticket: string): ChunkSource | null {
  const p = prefetchSlot;
  if (!p) return null;
  if (p.ticket !== ticket) { stopPrefetch(p); return null; }
  prefetchSlot = null;
  if (p.failed) { stopPrefetch(p); return null; } // stream fresh; server cache absorbs it
  p.adopted = true;
  return adoptedSource(p);
}

// ---- public API ------------------------------------------------------------
export function playVoice(
  ticket: string,
  cb: VoicePlayCallbacks = {},
  opts: { queue?: boolean } = {},
): VoiceHandle {
  const gen = ++genSeq;
  const s: Session = {
    gen,
    ticket,
    cb,
    phase: "pending",
    beginCalled: false,
    ended: false,
    source: null,
    el: null,
    ms: null,
    sb: null,
    objUrl: null,
    timers: [],
  };
  const handle: VoiceHandle = { cancel: () => cancelSession(s) };
  // Gates run BEFORE any network work: disabled/pre-unlock/empty => no fetch ever.
  if (!ticket) { endSession(s, "cancelled"); return handle; }
  if (!enabled) { endSession(s, "disabled"); return handle; }
  if (!audioUnlocked()) { endSession(s, "cancelled"); return handle; }
  const idle = !current && !pending && !promoteTimer;
  if (opts.queue && !idle) {
    // Conversation mode: the speaking line is sacred — park behind it instead.
    // A redundant park (same line already active) is a no-op that still fires
    // the handle's onEnd exactly once.
    if (current && !current.ended && current.ticket === ticket) { endSession(s, "cancelled"); return handle; }
    if (pending) endSession(pending, "cancelled"); // newest context wins the slot
    pending = s;
    prefetchVoice(ticket); // warm the handoff — no dead air after the breath
    return handle;
  }
  // Supersede mode (and an idle queue-mode table): everything yields now.
  if (current) endSession(current, "cancelled");
  flushQueue("cancelled");
  current = s;
  const adopted = takeAdopted(ticket);
  void runSession(s, adopted);
  return handle;
}

export function stopVoice() {
  const s = current;
  if (s) cancelSession(s); // endSession's cancelled path also flushes the queue
  else flushQueue("cancelled");
}

/** True while a line is speaking, waiting, or mid-breath — screens hold their
 *  UI (bubbles, no dots) until the chain drains instead of cutting it. */
export function voiceBusy(): boolean {
  return !!(pending || promoteTimer || (current && !current.ended));
}

export function prefetchVoice(ticket: string): VoiceHandle {
  if (prefetchSlot) stopPrefetch(prefetchSlot);
  prefetchSlot = null;
  // Disabled / pre-unlock: fetch nothing, return an inert handle.
  if (!ticket || !enabled || !audioUnlocked()) return { cancel: () => {} };
  const p: Prefetch = {
    ticket,
    mime: "",
    chunks: [],
    bytes: 0,
    waiters: [],
    src: null,
    done: false,
    failed: false,
    dead: false,
    adopted: false,
  };
  prefetchSlot = p;
  pumpPrefetch(p);
  return {
    cancel: () => {
      // Inert once adopted or otherwise evicted: adopted playback belongs to the session.
      if (p.adopted || prefetchSlot !== p) return;
      stopPrefetch(p);
    },
  };
}

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (!on) {
    const s = current;
    if (s) endSession(s, "disabled");
    else flushQueue("cancelled");
  }
}

export function isVoiceEnabled() {
  return enabled;
}

export function voicePhase(): VoicePhase {
  return current && !current.ended ? current.phase : "idle";
}

/* Test/QA introspection — never used by gameplay. */
export function debugVoice() {
  return {
    enabled,
    unlocked: audioUnlocked(),
    armed,
    phase: voicePhase(),
    mse: mseSupported(),
    busy: voiceBusy(),
    queue: pending ? { ticket: pending.ticket, phase: pending.phase } : null,
    prefetch: prefetchSlot
      ? { ticket: prefetchSlot.ticket, bytes: prefetchSlot.bytes, done: prefetchSlot.done, failed: prefetchSlot.failed }
      : null,
  };
}

// Module wiring: ride the sfx mixer and the login gesture. Both are one-way
// imports (sfx never imports voice), so no screens need extra wiring.
subscribeMix(() => applyVoiceVolume());
subscribeAudioUnlock(arm);
if (audioUnlocked()) arm();
