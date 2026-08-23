/* Shared SFX + BGM bank — ONE Audio per sound, loaded once, gesture-unlocked once.
   The login button click (or ENTER press) is the browser gesture that unlocks audio;
   initSfx/initBgm() run behind the Load screen's progress bar. BGM crossfades on route change. */
import { Platform } from "react-native";

const web = Platform.OS === "web";

// --- buses ---------------------------------------------------------------
let hover: HTMLAudioElement | null = null;
let click: HTMLAudioElement | null = null;
let slider: HTMLAudioElement | null = null;
let card: HTMLAudioElement | null = null;
let bgm: HTMLAudioElement | null = null;

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

// BGM state
let bgmReadyFlag = false;
let bgmUnlocked = false;
let currentBgmName: string | null = null;
let currentBgmSrc: string | null = null;
let fadeTimer: number | null = null;
let pendingBgmName: string | null = null;

function getEffectiveSfxVol() {
  return main * (muteMain ? 0 : 1) * sfxBus * (muteSfx ? 0 : 1) * 0.25;
}
function getLoudSfxVol() {
  return main * (muteMain ? 0 : 1) * sfxBus * (muteSfx ? 0 : 1) * 0.92;
}

function getEffectiveBgmVol() {
  // keep headroom — max 0.85 so SFX still cuts through
  return main * (muteMain ? 0 : 1) * bgmBus * (muteBgm ? 0 : 1) * 0.85;
}

function applyHoverVolume() {
  const eff = getEffectiveSfxVol();
  const loud = getLoudSfxVol();
  if (hover) hover.volume = Math.max(0, Math.min(0.35, eff * 1.1));
  if (click) click.volume = Math.max(0, Math.min(1.0, loud));
  if (slider) slider.volume = Math.max(0, Math.min(0.95, loud * 0.92));
  if (card) card.volume = Math.max(0, Math.min(1.0, Math.max(loud * 1.25, 0.42)));
}

function applyBgmVolume() {
  if (!bgm) return;
  const eff = getEffectiveBgmVol();
  // clamp — if muted, keep at 0 but don't touch paused state
  bgm.volume = Math.max(0, Math.min(1, eff));
}

// allow bgm.ts to trigger volume refresh without circular import
export function setVolumes(m?: number, s?: number, b?: number, mm?: boolean, ms?: boolean, mb?: boolean) {
  if (m !== undefined) main = m;
  if (s !== undefined) sfxBus = s;
  if (b !== undefined) bgmBus = b;
  if (mm !== undefined) muteMain = mm;
  if (ms !== undefined) muteSfx = ms;
  if (mb !== undefined) muteBgm = mb;
  applyHoverVolume();
  applyBgmVolume();
  // if BGM was muted and now unmuted, ensure it resumes
  if (web && bgm && !bgm.paused && bgm.volume === 0 && !muteBgm && !muteMain) {
    applyBgmVolume();
  }
}

export function setSfxEnabled(b: boolean) {
  enabled = b;
}

export function getBgmLevel() {
  return bgmBus;
}

export function getBgmMuted() {
  return muteBgm || muteMain;
}

// --- SFX ---------------------------------------------------------------
export function initSfx(): Promise<void> {
  if (!web || typeof window === "undefined") return Promise.resolve();
  if (ready) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      hover = new Audio("/hover.wav");
      hover.volume = 0.12;
      hover.preload = "auto";
      click = new Audio("/sfx/click.wav");
      click.preload = "auto";
      slider = new Audio("/sfx/slider.wav");
      slider.preload = "auto";
      card = new Audio("/sfx/card.wav");
      card.preload = "auto";
      // set initial volumes via bus
      applyHoverVolume();
      let loaded = 0;
      const need = 4;
      const oneDone = () => {
        loaded++;
        if (loaded >= 1 && !ready) {
          // resolve on first file ready — don't wait for all 4
          ready = true;
          applyHoverVolume();
          resolve();
        }
      };
      const done = () => {
        if (!ready) {
          ready = true;
          applyHoverVolume();
          resolve();
        }
      };
      hover.addEventListener("canplaythrough", oneDone, { once: true });
      hover.addEventListener("loadeddata", oneDone, { once: true });
      click.addEventListener("canplaythrough", oneDone, { once: true });
      slider.addEventListener("canplaythrough", oneDone, { once: true });
      card.addEventListener("canplaythrough", oneDone, { once: true });
      setTimeout(done, 4000);
    } catch {
      resolve();
    }
  });
}

/* must be called INSIDE a user-gesture handler */
export function unlockSfx() {
  if (!web || unlocked) {
    unlocked = true;
    return;
  }
  const tryUnlock = (a: HTMLAudioElement | null) => {
    if (!a) return;
    try {
      const p = a.play();
      if (p)
        p.then(() => {
          a.pause();
          a.currentTime = 0;
        }).catch(() => {});
    } catch {}
  };
  tryUnlock(hover);
  tryUnlock(click);
  tryUnlock(slider);
  tryUnlock(card);
  unlocked = true;
}

export function playHover() {
  if (!web || !hover || !unlocked || !enabled) return;
  try {
    hover.currentTime = 0;
    applyHoverVolume();
    const p = hover.play();
    if (p) p.catch(() => {});
  } catch {}
}

export function playClick() {
  if (!web || !click || !unlocked || !enabled) return;
  try {
    click.currentTime = 0;
    applyHoverVolume();
    const p = click.play();
    if (p) p.catch(() => {});
  } catch {}
}

let lastSliderAt = 0;
export function playSliderTick() {
  if (!web || !slider || !unlocked || !enabled) return;
  const now = Date.now();
  if (now - lastSliderAt < 45) return; // throttle so drag doesn't spam
  lastSliderAt = now;
  try {
    slider.currentTime = 0;
    applyHoverVolume();
    const p = slider.play();
    if (p) p.catch(() => {});
  } catch {}
}

export function playCardPop() {
  if (!web || !card || !unlocked || !enabled) return;
  try {
    card.currentTime = 0;
    applyHoverVolume();
    const p = card.play();
    if (p) p.catch(() => {});
  } catch {}
}

export function sfxReady() {
  return ready;
}

// --- BGM ---------------------------------------------------------------
export function initBgm(): Promise<void> {
  if (!web || typeof window === "undefined") return Promise.resolve();
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
  if (!web) {
    bgmUnlocked = true;
    return;
  }
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
    if (web && typeof window !== "undefined") window.clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function fadeTo(targetVol: number, ms: number): Promise<void> {
  if (!web || !bgm || typeof window === "undefined") return Promise.resolve();
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
  if (!web || typeof window === "undefined") return;
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
  if (!web || !bgm) return;
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
