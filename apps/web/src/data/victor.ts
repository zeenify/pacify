/* VICTOR — a first-year instructor at Vertex Institute and the one-time
   orientation guide. Every line here is authored, not generated: the same
   words, the same beats, the same voice clips for every player. Keep this file
   the single source of truth — tools/tutorial-voice/generate.mts reads it to
   bake the audio. */

export type VictorPose =
  | "document"
  | "stern"
  | "offer"
  | "disappointed"
  | "composed"
  | "welcome"
  | "speaking";

export type VictorLine = {
  id: string;
  text: string;
  /** Exact Fish text with inline delivery tags. Displayed text stays clean. */
  spoken?: string;
  pose: VictorPose;
  /** Pre-generated mp3 in public/victor/voice — play instantly, never synthesize live. */
  audio: string;
};

const poseArt = (p: VictorPose) => `/victor/opt/${p}.webp`;

export const VICTOR_PORTRAITS: Record<VictorPose, string> = {
  document: poseArt("document"),
  stern: poseArt("stern"),
  offer: poseArt("offer"),
  disappointed: poseArt("disappointed"),
  composed: poseArt("composed"),
  welcome: poseArt("welcome"),
  speaking: poseArt("speaking"),
};

const line = (id: string, pose: VictorPose, text: string, spoken?: string): VictorLine => ({
  id,
  pose,
  text,
  spoken,
  audio: `/victor/voice/${id}.mp3`,
});

/** Spoken as he welcomes the enrollee and reads their file. */
export const VICTOR_INTRO: VictorLine[] = [
  line(
    "v01-welcome",
    "document",
    "Oh, you must be the new enrollee. Welcome to Vertex Institute. You've earned your place among some of the brightest minds, and I trust you'll make good use of it.",
    "[measured, formal delivery, slightly welcoming] Oh, you must be the new enrollee. Welcome to Vertex Institute. [quiet pride, refined authority] You've earned your place among some of the brightest minds, and I trust you'll make good use of it.",
  ),
  line(
    "v02-introduction",
    "stern",
    "I'm Victor, one of the instructors here at Vertex Institute, and I'll be conducting your orientation today. I've reviewed your records, and it seems you have little to no experience at the table.",
    "[composed, professional] I'm Victor, one of the instructors here at Vertex Institute, and I'll be conducting your orientation today. [matter-of-fact, slightly stern] I've reviewed your records, and it seems you have little to no experience at the table.",
  ),
];

/** The offer — choices appear once this line has been read. */
export const VICTOR_OFFER = line(
  "v03-offer",
  "offer",
  "I'd recommend familiarizing yourself with the rules before your first match, so allow me to walk you through the fundamentals. Shall we begin?",
  "[instructor-like, measured delivery] I'd recommend familiarizing yourself with the rules before your first match, so allow me to walk you through the fundamentals. [slight courteous lift in tone] Shall we begin?",
);

/** The only two answers to the offer. Labels live here so the log and the
 *  screen can never drift apart when the script is rewritten. */
export const VICTOR_CHOICES = {
  teach: { id: "teach", label: "YES, I'D LIKE AN EXPLANATION." },
  decline: { id: "decline", label: "NO, I'LL MANAGE ON MY OWN." },
} as const;
export type VictorChoiceId = keyof typeof VICTOR_CHOICES;

/** Declining is allowed. The flag stays false, so Victor will ask again next visit. */
export const VICTOR_DECLINE: VictorLine[] = [
  line(
    "v04-decline",
    "disappointed",
    "I see... Rather confident for someone who hasn't played a single match.",
    "[restrained sigh, mild disapproval] I see... [dry, faintly incredulous] Rather confident for someone who hasn't played a single match.",
  ),
  line(
    "v05-warning",
    "composed",
    "Very well, I'll respect your decision. The table won't make allowances for inexperience, so do try to exercise some caution.",
    "[composed, professional] Very well, I'll respect your decision. [quietly stern, deliberate delivery] The table won't make allowances for inexperience, so do try to exercise some caution.",
  ),
];

/** Accepting hands off to the lessons (next chunk). */
export const VICTOR_ACCEPT: VictorLine[] = [
  line(
    "v06-accept",
    "welcome",
    "Sensible choice. A little preparation now should save you a great deal of trouble later.",
    "[subtle approval, composed] Sensible choice. [slightly warmer, still reserved] A little preparation now should save you a great deal of trouble later.",
  ),
  line(
    "v07-first-lesson",
    "speaking",
    "Then let's begin with the fundamentals. First, you must understand how the table works and what you'll be expected to do during a match.",
    "[instructor-like, measured delivery] Then let's begin with the fundamentals. [deliberate emphasis, authoritative] First, you must understand how the table works and what you'll be expected to do during a match.",
  ),
];

export const VICTOR_ALL_LINES: VictorLine[] = [
  ...VICTOR_INTRO,
  VICTOR_OFFER,
  ...VICTOR_DECLINE,
  ...VICTOR_ACCEPT,
];

export const VICTOR_AUDIO_URLS = VICTOR_ALL_LINES.map((l) => l.audio);

/** Warm the browser cache while the player is still on the start screen.
 *  Resources are retained in module scope — a dropped <audio>/Image object can
 *  be garbage-collected before its preload finishes. */
let warmed = false;
const warmImages: HTMLImageElement[] = [];
const warmAudio: HTMLAudioElement[] = [];

export function preloadVictor() {
  if (typeof window === "undefined" || warmed) return;
  warmed = true;
  for (const src of Object.values(VICTOR_PORTRAITS)) {
    const img = new window.Image();
    img.src = src;
    warmImages.push(img);
  }
  for (const src of VICTOR_AUDIO_URLS) {
    try {
      const a = new Audio();
      a.preload = "auto";
      a.src = src;
      warmAudio.push(a);
    } catch {
      /* audio preload is best-effort */
    }
  }
}
