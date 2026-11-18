/* Victor's static voice player — pre-baked clips, one reused audio element.
   Reusing the SAME element matters on iOS: arming it during the start-screen
   gesture (unlockSfx) lets every later line play without a fresh gesture.
   The streaming voice player in lib/voice.ts owns its own element; the two
   never overlap because the tutorial and story are separate screens. */

import { getEffectiveVoiceVol, subscribeAudioUnlock, subscribeMix } from "./sfx";
import { isVoiceEnabled } from "./voice";
import { loadOptions } from "./options";

/* 44-byte silent WAV — played at volume 0 to unlock the element in a gesture. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

let el: HTMLAudioElement | null = null;
let armed = false;
let gen = 0;

function ensureEl(): HTMLAudioElement | null {
  if (el) return el;
  if (typeof Audio === "undefined") return null;
  try {
    el = new Audio();
    el.preload = "auto";
  } catch {
    return null;
  }
  return el;
}

function applyVolume(a: HTMLAudioElement) {
  a.volume = Math.min(1, getEffectiveVoiceVol() * 1.5);
}

/** Must run inside a user gesture (the start-screen ENTER click). */
export function armVictorVoice() {
  const a = ensureEl();
  if (!a || armed) return;
  armed = true;
  const my = ++gen;
  try {
    a.volume = 0;
    a.src = SILENT_WAV;
    const p = a.play();
    if (p) {
      p.then(() => {
        if (my !== gen) return; // a real line already took the element
        try { a.pause(); a.currentTime = 0; a.removeAttribute("src"); a.load(); } catch { /* detached */ }
        applyVolume(a);
      }).catch(() => applyVolume(a));
    }
  } catch {
    applyVolume(a);
  }
}

// The login/start gesture calls unlockSfx(); ride it, same as lib/voice.ts.
subscribeAudioUnlock(armVictorVoice);
subscribeMix(() => { if (el) applyVolume(el); });

export type VictorPlayHandle = { cancel(): void };

type VictorPlayCallbacks = {
  onPlaying?: () => void;
  onEnd?: (reason: "ended" | "cancelled" | "error" | "disabled") => void;
};

/** Play one pre-baked line. A new call supersedes the previous clip. */
export function playVictorClip(src: string, cb: VictorPlayCallbacks = {}): VictorPlayHandle {
  const a = ensureEl();
  if (!a || !src) {
    cb.onEnd?.("error");
    return { cancel: () => {} };
  }
  if (!isVoiceEnabled() || loadOptions().mutedVoice) {
    cb.onEnd?.("disabled");
    return { cancel: () => {} };
  }
  const my = ++gen;
  let ended = false;
  const finish = (reason: "ended" | "cancelled" | "error") => {
    if (ended || my !== gen) return;
    ended = true;
    cb.onEnd?.(reason);
  };
  a.onplaying = () => { if (my === gen) cb.onPlaying?.(); };
  a.onended = () => finish("ended");
  a.onerror = () => finish("error");
  try { a.pause(); } catch { /* not started */ }
  a.src = src;
  a.currentTime = 0;
  applyVolume(a);
  void a.play().catch(() => finish("error"));
  return {
    cancel: () => {
      if (my !== gen) return; // a newer line already owns the element
      finish("cancelled");
      try { a.pause(); } catch { /* not started */ }
      try { a.removeAttribute("src"); a.load(); } catch { /* detached */ }
      if (el === a) a.onplaying = a.onended = a.onerror = null;
    },
  };
}
