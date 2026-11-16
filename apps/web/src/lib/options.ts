/* Game options — persisted to localStorage, applied to live systems.
   Every change takes effect IMMEDIATELY (no apply/save step) so previews are real. */
import { setVolumes, setSfxEnabled } from "./sfx";
import { setVoiceEnabled as setVoicePlayerEnabled } from "./voice";

const KEY = "pacify_options";

export type GameOptions = {
  mainVol: number; // 0-100 — multiplies every sound bus
  sfxVol: number; // 0-100 — UI blips
  bgmVol: number; // 0-100 — page background music (bus ready, music soon)
  voiceVol: number; // 0-100 — Klein's spoken lines (streamed from the server)
  sfxOn: boolean;
  mutedMain: boolean;
  mutedSfx: boolean;
  mutedBgm: boolean;
  mutedVoice: boolean; // hard disable: no line is ever FETCHED while muted
};

export const DEFAULT_OPTIONS: GameOptions = {
  mainVol: 70,
  sfxVol: 48,
  bgmVol: 60,
  voiceVol: 80,
  sfxOn: true,
  mutedMain: false,
  mutedSfx: false,
  mutedBgm: false,
  mutedVoice: false,
};

export function loadOptions(): GameOptions {
  if (typeof window === "undefined") return { ...DEFAULT_OPTIONS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_OPTIONS };
    return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(o: GameOptions) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(o));
  } catch {}
}

/* push current options into the running game */
export function applyOptions(o: GameOptions) {
  setVolumes(
    o.mainVol / 100,
    o.sfxVol / 100,
    o.bgmVol / 100,
    o.mutedMain,
    o.mutedSfx,
    o.mutedBgm,
    o.voiceVol / 100,
    o.mutedVoice
  );
  setSfxEnabled(o.sfxOn);
  // Hard disable rides the player itself: muted => nothing is ever FETCHED.
  setVoicePlayerEnabled(!o.mutedVoice);
}
