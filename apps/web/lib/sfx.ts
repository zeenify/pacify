/* Shared SFX bank — ONE Audio per sound, loaded once, gesture-unlocked once.
   The login button click (or ENTER press) is the browser gesture that unlocks audio;
   initSfx() runs behind the Load screen's progress bar. */
import { Platform } from "react-native";

const web = Platform.OS === "web";
let hover: HTMLAudioElement | null = null;
let unlocked = false;
let ready = false;
let enabled = true;
/* three-bus mixer: MAIN multiplies everything; SFX/BGM are per-bus levels */
let main = 0.7;
let sfxBus = 0.48;
let bgmBus = 0.6;

function applyHoverVolume() {
  if (!hover) return;
  hover.volume = Math.max(0, Math.min(0.25, main * sfxBus * 0.25));
}

export function setVolumes(m?: number, s?: number, b?: number) {
  if (m !== undefined) main = m;
  if (s !== undefined) sfxBus = s;
  if (b !== undefined) bgmBus = b;
  applyHoverVolume();
}

export function setSfxEnabled(b: boolean) {
  enabled = b;
}

export function getBgmLevel() {
  return bgmBus;
}

export function initSfx(): Promise<void> {

export function initSfx(): Promise<void> {
  if (!web || typeof window === "undefined") return Promise.resolve();
  if (ready) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      hover = new Audio("/hover.wav");
      hover.volume = 0.12;
      hover.preload = "auto";
      const done = () => {
        if (!ready) {
          ready = true;
          resolve();
        }
      };
      hover.addEventListener("canplaythrough", done, { once: true });
      hover.addEventListener("loadeddata", done, { once: true });
      setTimeout(done, 4000); // never hang the load bar on a slow file
    } catch {
      resolve();
    }
  });
}

/* must be called INSIDE a user-gesture handler */
export function unlockSfx() {
  if (!web || !hover || unlocked) {
    unlocked = true;
    return;
  }
  try {
    const p = hover.play();
    if (p)
      p.then(() => {
        hover!.pause();
        hover!.currentTime = 0;
      }).catch(() => {});
  } catch {}
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

export function sfxReady() {
  return ready;
}
