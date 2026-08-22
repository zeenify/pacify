/* Game options — persisted to localStorage, applied to live systems.
   Every change takes effect IMMEDIATELY (no apply/save step) so previews are real. */
import { Platform } from "react-native";
import { setVolumes, setSfxEnabled } from "./sfx";

const web = Platform.OS === "web";
const KEY = "pacify_options";

export type GameOptions = {
  mainVol: number; // 0-100 — multiplies every sound bus
  sfxVol: number; // 0-100 — UI blips
  bgmVol: number; // 0-100 — page background music (bus ready, music soon)
  sfxOn: boolean;
  reduceMotion: boolean;
};

export const DEFAULT_OPTIONS: GameOptions = {
  mainVol: 70,
  sfxVol: 48,
  bgmVol: 60,
  sfxOn: true,
  reduceMotion: false,
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
  setVolumes(o.mainVol / 100, o.sfxVol / 100, o.bgmVol / 100);
  setSfxEnabled(o.sfxOn);
  if (web && typeof document !== "undefined") {
    document.body.classList.toggle("p5-reduce", o.reduceMotion);
  }
}
