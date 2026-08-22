/* Game options — persisted to localStorage, applied to live systems.
   Every change takes effect IMMEDIATELY (no apply/save step) so previews are real. */
import { Platform } from "react-native";
import { setSfxVolume, setSfxEnabled } from "./sfx";

const web = Platform.OS === "web";
const KEY = "pacify_options";

export type TextSpeed = "SLOW" | "NORMAL" | "FAST";
export type GameOptions = {
  sfxVol: number; // 0-100 (display %); internally scaled
  sfxOn: boolean;
  reduceMotion: boolean;
  textSpeed: TextSpeed;
};

export const DEFAULT_OPTIONS: GameOptions = {
  sfxVol: 48,
  sfxOn: true,
  reduceMotion: false,
  textSpeed: "NORMAL",
};

export function loadOptions(): GameOptions {
  if (!web || typeof window === "undefined") return { ...DEFAULT_OPTIONS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_OPTIONS };
    return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(o: GameOptions) {
  if (!web || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(o));
  } catch {}
}

/* push current options into the running game */
export function applyOptions(o: GameOptions) {
  setSfxVolume((o.sfxVol / 100) * 0.25); // hover blip tops out gentle
  setSfxEnabled(o.sfxOn);
  if (web && typeof document !== "undefined") {
    document.body.classList.toggle("p5-reduce", o.reduceMotion);
  }
}
