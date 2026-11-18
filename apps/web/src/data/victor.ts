/* VICTOR — the Institute's registrar and the one-time orientation guide.
   Every line here is authored, not generated: the same words, the same beats,
   the same voice clips for every player. Keep this file the single source of
   truth — tools/tutorial-voice/generate.mts reads it to bake the audio. */

export type VictorPose = "document" | "stern" | "offer" | "disappointed" | "welcome" | "speaking";

export type VictorLine = {
  id: string;
  text: string;
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
  welcome: poseArt("welcome"),
  speaking: poseArt("speaking"),
};

const line = (id: string, pose: VictorPose, text: string): VictorLine => ({
  id,
  pose,
  text,
  audio: `/victor/voice/${id}.mp3`,
});

/** Spoken as he reads the enrollee's file. */
export const VICTOR_INTRO: VictorLine[] = [
  line(
    "v01-register",
    "document",
    "So. You must be the new enrollee. Victor. I keep this Institute's records — including the parts its students would rather I forgot.",
  ),
  line(
    "v02-file",
    "stern",
    "Your file is brief. No table time. No victories. No losses. In this house, that is not innocence. That is debt.",
  ),
];

/** The offer — choices appear once this line has been read. */
export const VICTOR_OFFER = line(
  "v03-offer",
  "offer",
  "I can teach you how the table actually works — before it teaches you. Well? Shall we begin?",
);

/** The only two answers to the offer. Labels live here so the log and the
 *  screen can never drift apart when the script is rewritten. */
export const VICTOR_CHOICES = {
  teach: { id: "teach", label: "TEACH ME THE TABLE" },
  decline: { id: "decline", label: "I'LL TAKE MY CHANCES" },
} as const;
export type VictorChoiceId = keyof typeof VICTOR_CHOICES;

/** Declining is allowed. The flag stays false, so Victor will ask again next visit. */
export const VICTOR_DECLINE: VictorLine[] = [
  line("v04-decline", "disappointed", "Hm. Another one who mistakes confidence for a hand."),
  line(
    "v05-warning",
    "disappointed",
    "Very well. I will not repeat myself. But the table will — and it charges by the point. Do try not to bleed on the cards.",
  ),
];

/** Accepting hands off to the lessons (next chunk). */
export const VICTOR_ACCEPT: VictorLine[] = [
  line("v06-accept", "welcome", "Good. At least one of you listens."),
  line(
    "v07-first-lesson",
    "speaking",
    "Then we begin where every student should — with the seat they are about to lose.",
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
