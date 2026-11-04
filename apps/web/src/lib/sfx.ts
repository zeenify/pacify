/* Shared SFX + BGM bank.
   SFX: Web Audio — every asset decoded once into an AudioBuffer, then a FRESH
   AudioBufferSourceNode per voice. That is what lets a sound overlap itself (the
   old single-HTMLAudioElement design could not, so clash/drain ticks cut each
   other off) and what makes pitch randomisation and sample-accurate scheduling
   possible.
   BGM: one looping HTMLAudioElement, crossfaded on route change, duckable.
   The login button click (or ENTER press) is the browser gesture that unlocks
   audio; initSfx/initBgm() run behind the Load screen's progress bar. */

import { SFX, SFX_NAMES, resolvePitch, resolvePan, type SfxName, type SfxDef } from "./sfx-manifest";

export type PlayOpts = { gain?: number; pitch?: number; pan?: number; at?: number };
export type CueEventLike = { cue: SfxName; at: number; gain?: number; pitch?: number; pan?: number };
export type TimelineHandle = { id: number };

const MAX_VOICES = 24;
const DEFAULT_MAX_PER_CUE = 8;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxBusGain: GainNode | null = null;
let hallConv: ConvolverNode | null = null;
let cathConv: ConvolverNode | null = null;

// BGM state — declared here because the BGM half below owns the behaviour but
// these symbols live in the SFX half's scope.
let bgm: HTMLAudioElement | null = null;
let bgmReadyFlag = false;
let bgmUnlocked = false;
let currentBgmName: string | null = null;
let currentBgmSrc: string | null = null;
let fadeTimer: number | null = null;
let pendingBgmName: string | null = null;

const buffers = new Map<string, AudioBuffer>();
const failed: string[] = [];
const UNIQUE_SRCS = Array.from(new Set(SFX_NAMES.map((n) => SFX[n].src)));

type Voice = { src: AudioBufferSourceNode; name: SfxName; endsAt: number; timeline: number };
let voices: Voice[] = [];
let timelineSeq = 0;
const timelineVoices = new Map<number, Voice[]>();
const lastPlayed = new Map<SfxName, number>();

let unlocked = false;
let ready = false;
let enabled = true;

// three-bus mixer: MAIN multiplies everything; SFX/BGM are per-bus levels
let main = 0.7;
let sfxBus = 0.48;
let bgmBus = 0.6;
let muteMain = false;
let muteSfx = false;
let muteBgm = false;
let duckMul = 1;

// --- procedural impulse responses ---------------------------------------
// Assets ship dry and the reverb lives here only, so the browser IR is defined by
// its perceptual parameters (decay / spectral tilt / pre-delay), not by the
// studio's cue-render IR. Math.random is fine: this is noise, not game RNG.
const IR_PRESETS = {
  hall:      { decay: 1.8, lp: 6500, preDelayMs: 18 },
  cathedral: { decay: 3.2, lp: 4200, preDelayMs: 32 },
} as const;

function makeIrBuffer(ac: AudioContext, preset: keyof typeof IR_PRESETS): AudioBuffer {
  const p = IR_PRESETS[preset];
  const sr = ac.sampleRate;
  const pre = Math.round((p.preDelayMs / 1000) * sr);
  const tail = Math.round(p.decay * sr);
  const buf = ac.createBuffer(1, pre + tail, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < tail; i++) {
    const t = i / tail;
    d[pre + i] = (Math.random() * 2 - 1) * Math.pow(1 - t, p.decay) * 0.5;
  }
  // one-pole lowpass darkens the tail
  let y = 0;
  const a = Math.exp((-2 * Math.PI * p.lp) / sr);
  for (let i = pre; i < d.length; i++) { y = a * y + (1 - a) * d[i]; d[i] = y; }
  return buf;
}

function ensureGraph() {
  if (ctx) return ctx;
  // globalThis, not window: works in workers and keeps the engine constructible
  // under a test runner that stubs AudioContext on the global object.
  const AC: typeof AudioContext | undefined = globalThis.AudioContext ?? (globalThis as any).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch { return null; }
  masterGain = ctx.createGain();
  sfxBusGain = ctx.createGain();
  hallConv = ctx.createConvolver();
  cathConv = ctx.createConvolver();
  hallConv.normalize = true;
  cathConv.normalize = true;
  try {
    hallConv.buffer = makeIrBuffer(ctx, "hall");
    cathConv.buffer = makeIrBuffer(ctx, "cathedral");
  } catch { /* a convolver without an IR is a pass-through; not fatal */ }
  const hallReturn = ctx.createGain();
  const cathReturn = ctx.createGain();
  hallReturn.gain.value = 0.9;
  cathReturn.gain.value = 0.9;
  sfxBusGain.connect(masterGain);
  hallConv.connect(hallReturn).connect(masterGain);
  cathConv.connect(cathReturn).connect(masterGain);
  masterGain.connect(ctx.destination);
  applyBusGains();
  return ctx;
}

function applyBusGains() {
  if (masterGain) masterGain.gain.value = main * (muteMain ? 0 : 1);
  if (sfxBusGain) sfxBusGain.gain.value = sfxBus * (muteSfx ? 0 : 1);
}

function getEffectiveBgmVol() {
  // keep headroom — max 0.85 so SFX still cuts through; duckMul is the cinematic duck
  return main * (muteMain ? 0 : 1) * bgmBus * (muteBgm ? 0 : 1) * 0.85 * duckMul;
}

function applyBgmVolume() {
  if (!bgm) return;
  const eff = getEffectiveBgmVol();
  // clamp — if muted, keep at 0 but don't touch paused state
  bgm.volume = Math.max(0, Math.min(1, eff));
}

export function setVolumes(m?: number, s?: number, b?: number, mm?: boolean, ms?: boolean, mb?: boolean) {
  if (m !== undefined) main = m;
  if (s !== undefined) sfxBus = s;
  if (b !== undefined) bgmBus = b;
  if (mm !== undefined) muteMain = mm;
  if (ms !== undefined) muteSfx = ms;
  if (mb !== undefined) muteBgm = mb;
  applyBusGains();
  applyBgmVolume();
}

export function setSfxEnabled(b: boolean) { enabled = b; }
export function getBgmLevel() { return bgmBus; }
export function getBgmMuted() { return muteBgm || muteMain; }
export function sfxReady() { return ready; }
export function listSfx(): SfxName[] { return SFX_NAMES; }

export function debugAudio() {
  return {
    decoded: buffers.size,
    total: UNIQUE_SRCS.length,
    failed: [...failed],
    liveVoices: voices.length,
    ctxState: ctx?.state ?? "none",
    unlocked,
    enabled,
  };
}

/* Decode every asset. Resolves on the 6s cap rather than blocking the Load screen's
   progress bar; late decodes still land in the map, and play() on an undecoded buffer
   is a silent no-op. */
export async function initSfx(): Promise<void> {
  if (ready) return;
  const ac = ensureGraph();
  if (!ac) { ready = true; return; }
  const work = UNIQUE_SRCS.map(async (src) => {
    try {
      const res = await fetch(src);
      if (!res.ok) { failed.push(`${src}: HTTP ${res.status}`); return; }
      const ab = await res.arrayBuffer();
      buffers.set(src, await ac.decodeAudioData(ab));
    } catch (e) {
      failed.push(`${src}: ${String((e as Error)?.message ?? e)}`);
    }
  });
  await Promise.race([
    Promise.all(work),
    new Promise<void>((r) => setTimeout(r, 6000)),
  ]);
  ready = true;
  applyBusGains();
}

/* MUST be called inside a user-gesture handler. */
export function unlockSfx() {
  unlocked = true;
  const ac = ensureGraph();
  if (ac && ac.state === "suspended") { const p = ac.resume(); if (p) p.catch(() => {}); }
}

function steal(v: Voice) {
  try { v.src.onended = null; v.src.stop(); } catch { /* already stopped */ }
  const i = voices.indexOf(v);
  if (i >= 0) voices.splice(i, 1);
  const tl = timelineVoices.get(v.timeline);
  if (tl) { const j = tl.indexOf(v); if (j >= 0) tl.splice(j, 1); }
}

function allocVoice(name: SfxName, def: SfxDef, opts: PlayOpts, timelineId: number): Voice | null {
  if (!ctx || !sfxBusGain) return null;
  const buf = buffers.get(def.src);
  if (!buf) return null;

  const now = ctx.currentTime;
  const pitch = opts.pitch ?? resolvePitch(def, Math.random);
  const pan = opts.pan ?? resolvePan(def, Math.random);

  const cap = def.maxVoices ?? DEFAULT_MAX_PER_CUE;
  const same = voices.filter((v) => v.name === name);
  if (same.length >= cap) steal(same[0]);
  if (voices.length >= MAX_VOICES) steal(voices[0]);

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = !!def.loop;
  src.playbackRate.value = Math.max(0.05, Math.min(8, pitch));

  const g = ctx.createGain();
  g.gain.value = (def.gain ?? 1) * (opts.gain ?? 1);
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));

  src.connect(g);
  g.connect(p);
  p.connect(sfxBusGain);
  if (def.reverb && def.reverb > 0) {
    const send = ctx.createGain();
    send.gain.value = def.reverb;
    p.connect(send);
    send.connect(def.reverbIR === "cathedral" ? cathConv! : hallConv!);
  }

  const when = now + Math.max(0, (opts.at ?? 0) / 1000);
  const v: Voice = { src, name, endsAt: when + buf.duration / Math.max(0.05, pitch), timeline: timelineId };
  src.onended = () => { const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); };
  try {
    src.start(when);
    // A stop() scheduled at or before the start time means the node never sounds,
    // which is exactly what cancelTimeline relies on for not-yet-started events.
    if (!def.loop) src.stop(v.endsAt + 0.02);
  } catch { return null; }
  voices.push(v);
  return v;
}

export function play(name: SfxName, opts: PlayOpts = {}): void {
  if (!enabled || !unlocked) return;
  if (!ensureGraph()) return;
  const def: SfxDef = SFX[name];
  if (!def) return;
  // Gate BEFORE allocation, so a rejected play costs nothing. cooldownMs is a plain
  // per-cue rate limit: anti-machine-gun for the same cue name. Bursts of a cue are
  // bounded by its maxVoices budget, not by the cooldown.
  if (def.cooldownMs && ctx) {
    const nowMs = ctx.currentTime * 1000;
    const last = lastPlayed.get(name);
    if (last !== undefined && nowMs - last < def.cooldownMs) return;
    lastPlayed.set(name, nowMs);
  }
  allocVoice(name, def, opts, 0);
}

export function playAt(name: SfxName, delayMs: number, opts: PlayOpts = {}): void {
  play(name, { ...opts, at: (opts.at ?? 0) + delayMs });
}

/** Schedule a whole beat's cue list against the AudioContext clock in one call.
    Drift-free and immune to setTimeout throttling. */
export function scheduleTimeline(events: CueEventLike[]): TimelineHandle {
  const id = ++timelineSeq;
  if (enabled && unlocked && ctx) {
    const list: Voice[] = [];
    for (const e of events) {
      const def: SfxDef = SFX[e.cue];
      if (!def) continue;
      const v = allocVoice(e.cue, def, { gain: e.gain, pitch: e.pitch, pan: e.pan, at: e.at }, id);
      if (v) list.push(v);
    }
    timelineVoices.set(id, list);
  } else {
    timelineVoices.set(id, []);
  }
  return { id };
}

export function cancelTimeline(h: TimelineHandle): void {
  const list = timelineVoices.get(h.id);
  if (!list) return;
  for (const v of [...list]) steal(v);
  timelineVoices.delete(h.id);
}

/** Lower the music bus so a cinematic's SFX cut through, then restore.
    multiplier 1 = unducked. */
export function duckBgm(multiplier: number, ms = 250): Promise<void> {
  duckMul = Math.max(0, Math.min(1, multiplier));
  return fadeTo(getEffectiveBgmVol(), ms);
}

// ---- legacy named wrappers (thirteen modules import these; names are load-bearing) ----
export function playHover() { play("ui.hover"); }
export function playClick() { play("ui.click"); }
export function playSliderTick() { play("ui.slider"); }
export function playCardPop() { play("ui.cardPop"); }

// --- BGM ---------------------------------------------------------------
export function initBgm(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (bgmReadyFlag) return Promise.resolve();
  // create element immediately so unlock can work even before canplay
  if (!bgm) {
    try {
      bgm = new Audio();
      bgm.loop = true;
      bgm.preload = "auto";
      bgm.volume = 0;
      // allow cross-origin? not needed for same-origin public files
      applyBgmVolume();
    } catch {}
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        bgmReadyFlag = true;
        resolve();
      }
    };
    setTimeout(finish, 200);
    if (bgm) {
      bgm.addEventListener("canplaythrough", finish, { once: true });
      setTimeout(finish, 3000);
    }
  });
}

export function unlockBgm() {
  if (bgmUnlocked) return;
  bgmUnlocked = true;
  if (!bgm) {
    try {
      bgm = new Audio();
      bgm.loop = true;
      bgm.preload = "auto";
      bgm.volume = 0;
    } catch {
      return;
    }
  }
  // try to unlock via silent play/pause if src already set; otherwise just mark unlocked
  // so next playBgm() will succeed without needing another gesture
  if (bgm.src) {
    try {
      const p = bgm.play();
      if (p)
        p.then(() => {
          bgm!.pause();
          // keep currentTime 0 so next play starts from beginning
          try {
            bgm!.currentTime = 0;
          } catch {}
        }).catch(() => {});
    } catch {}
  }
  applyBgmVolume();
}

/* internal fade helper — linear, cancellable */
function cancelFade() {
  if (fadeTimer !== null) {
    if (typeof window !== "undefined") window.clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function fadeTo(targetVol: number, ms: number): Promise<void> {
  if (!bgm || typeof window === "undefined") return Promise.resolve();
  cancelFade();
  const startVol = bgm.volume;
  const delta = targetVol - startVol;
  if (Math.abs(delta) < 0.01 || ms <= 0) {
    bgm.volume = targetVol;
    return Promise.resolve();
  }
  const steps = Math.max(8, Math.round(ms / 30));
  let step = 0;
  return new Promise((resolve) => {
    fadeTimer = window.setInterval(() => {
      step++;
      const t = Math.min(1, step / steps);
      // ease slightly — linear is fine for now
      if (bgm) bgm.volume = Math.max(0, Math.min(1, startVol + delta * t));
      if (step >= steps) {
        cancelFade();
        if (bgm) bgm.volume = targetVol;
        resolve();
      }
    }, 30);
  });
}

/**
 * Play a BGM track by filename (e.g. "Night Route.mp3").
 * - If same track is already playing, just ensures volume/correct state.
 * - Otherwise crossfades: fades out current over fadeOutMs, swaps src, fades in over fadeInMs.
 * - Respects bus mutes/volumes and loop.
 * - Requires a prior user gesture (unlockBgm) — otherwise will try and fail silently until unlocked.
 */
export async function playBgm(
  track: string | null,
  opts?: { fadeInMs?: number; fadeOutMs?: number; loop?: boolean }
) {
  if (typeof window === "undefined") return;
  // null/empty means stop
  if (!track) {
    await stopBgm(opts?.fadeOutMs ?? 700);
    return;
  }

  const fadeInMs = opts?.fadeInMs ?? 900;
  const fadeOutMs = opts?.fadeOutMs ?? 700;
  const loop = opts?.loop ?? true;

  // lazily ensure element exists
  if (!bgm) {
    try {
      bgm = new Audio();
      bgm.loop = loop;
      bgm.preload = "auto";
      bgm.volume = 0;
    } catch {
      return;
    }
  }
  bgm.loop = loop;

  const src = `/musics/${encodeURIComponent(track)}`;

  // same track already loaded/playing — just refresh volume and ensure playing
  if (currentBgmName === track && currentBgmSrc === src) {
    if (bgm.paused) {
      applyBgmVolume();
      const eff = getEffectiveBgmVol();
      if (eff > 0.01 && !muteBgm && !muteMain) {
        try {
          bgm.volume = 0;
          const p = bgm.play();
          if (p) await p.catch(() => {});
          await fadeTo(eff, Math.min(fadeInMs, 400));
        } catch {}
      }
    } else {
      // already playing, just sync volume
      applyBgmVolume();
    }
    return;
  }

  // if a fade is already in progress for a different pending track, remember newest request
  pendingBgmName = track;

  // fade out current if playing
  if (bgm && !bgm.paused && currentBgmSrc) {
    const eff = getEffectiveBgmVol();
    // only fade if we were audible
    if (bgm.volume > 0.02 && eff > 0.02) {
      await fadeTo(0, fadeOutMs);
    } else {
      bgm.volume = 0;
    }
    try {
      bgm.pause();
    } catch {}
  } else if (bgm) {
    bgm.volume = 0;
    try {
      bgm.pause();
    } catch {}
  }

  // check if a newer request came in while we were fading
  if (pendingBgmName !== track) {
    // a newer playBgm call superseded this one — abort
    return;
  }

  // swap source
  currentBgmName = track;
  currentBgmSrc = src;
  pendingBgmName = null;

  try {
    bgm.src = src;
    bgm.load();
    applyBgmVolume();
    const target = getEffectiveBgmVol();
    // if muted, keep volume 0 but still load/prepare
    if (target < 0.01) {
      bgm.volume = 0;
      // don't play if muted — will play on unmute via setVolumes
      return;
    }
    // start from 0 for fade in
    bgm.volume = 0;
    const p = bgm.play();
    if (p) await p.catch(() => {});
    // fade in to target
    await fadeTo(target, fadeInMs);
  } catch {}
}

export async function stopBgm(fadeMs = 700) {
  if (!bgm) return;
  pendingBgmName = null;
  if (!bgm.paused) {
    await fadeTo(0, fadeMs);
    try {
      bgm.pause();
    } catch {}
  }
  currentBgmName = null;
  currentBgmSrc = null;
}

export function getCurrentBgm(): string | null {
  return currentBgmName;
}

export function bgmReady() {
  return bgmReadyFlag;
}
