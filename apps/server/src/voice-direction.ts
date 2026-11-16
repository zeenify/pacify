import type { KleinPose } from "./encounter-types.js";
import type { RoundResult } from "./personality.js";

/** A Fish S2 delivery direction: a [bracket] tag, optionally placed immediately
 *  before a supporting word (`before`) rather than prepended to the whole line. */
export type VoiceDirection = { tag: string; before?: string };

// Vocal-event tags enact a sound, so they only land when the line's own words
// carry that sound ("[laughing] hahaha" works; "[laughing] that's funny" falls
// flat). Each cue is matched case-insensitively and the tag is placed right
// before the matched word. Long laughs read as [laughing], short ones [chuckling].
const VOCAL_CUES: { re: RegExp; tag: string }[] = [
  { re: /\bhahaha(?:ha)*\b/i, tag: "laughing" },
  { re: /\b(?:heh(?:eh)*|haha)\b/i, tag: "chuckling" },
  { re: /\b(?:ouch|ow|ugh|oof)\b/i, tag: "sigh" },
  { re: /\b(?:whew|phew)\b/i, tag: "exhale" },
  { re: /\b(?:whoa|woah|wow)\b/i, tag: "gasp" },
];

/** The earliest supporting vocal cue in the line, or null when none exists. */
export function vocalCue(text: string): VoiceDirection | null {
  let best: { tag: string; before: string; at: number } | null = null;
  for (const { re, tag } of VOCAL_CUES) {
    const m = text.match(re);
    if (m && m.index !== undefined && (best === null || m.index < best.at)) {
      best = { tag, before: m[0], at: m.index };
    }
  }
  return best ? { tag: best.tag, before: best.before } : null;
}

// Delivery-style tags color HOW a line is said and work on any text, so these
// come straight from the authored pose / server-derived stance / round outcome.
export function poseStyle(pose: KleinPose): string {
  switch (pose) {
    case "welcoming": return "warm";
    case "playful": return "playful";
    case "calculating": return "sly";
    case "thoughtful": return "soft voice";
    case "serious": return "low voice";
    default: return "";
  }
}

export function stanceStyle(stance: string): string {
  switch (stance) {
    case "smug": return "smug";
    case "performing": return "playful";
    case "confident": return "confident";
    case "guarded": return "hesitant";
    default: return "";
  }
}

/** Round outcome from Klein's perspective: he scored more → excited, less → sad. */
export function revealStyle(result: RoundResult): string {
  if (result.kleinPts > result.youPts) return "excited";
  if (result.kleinPts < result.youPts) return "sad";
  return "";
}

/** One direction per line: a content-supported vocal tag wins (it lands better),
 *  otherwise the delivery style, otherwise nothing. */
export function deliveryFor(text: string, style: string): VoiceDirection | null {
  const vocal = vocalCue(text);
  if (vocal) return vocal;
  return style ? { tag: style } : null;
}