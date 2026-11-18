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

/** Guided sample duel — the full fundamentals walkthrough. */
export const VICTOR_DUEL: VictorLine[] = [
  line(
    "d01-tutorial-match",
    "composed",
    "Rather than simply explaining the rules, I'll walk you through a tutorial match. We'll play a few rounds together so you can see how everything works in practice.",
    "[instructor-like, measured delivery] Rather than simply explaining the rules, I'll walk you through a tutorial match. We'll play a few rounds together so you can see how everything works in practice.",
  ),
  line(
    "d02-draw-cards",
    "speaking",
    "First, we each draw seven cards. These will be the cards available to us throughout the match.",
    "[guiding, composed] First, we each draw seven cards. [slight emphasis] These will be the cards available to us throughout the match.",
  ),
  line(
    "d03-seven-rounds",
    "composed",
    "A match consists of up to seven rounds, with each round giving us an opportunity to play one card.",
    "[instructor-like, explanatory] A match consists of up to seven rounds, with each round giving us an opportunity to play one card.",
  ),
  line(
    "d04-place-cards",
    "speaking",
    "Each round, we'll select one card and place it face down on the table. Neither of us will know what the other has chosen until they're revealed.",
    "[measured, instructive] Each round, we'll select one card and place it face down on the table. Neither of us will know what the other has chosen until they're revealed.",
  ),
  line(
    "d05-reveal-cards",
    "composed",
    "Once both cards have been placed, we'll reveal them simultaneously to see how they compare.",
    "[clear, deliberate delivery] Once both cards have been placed, we'll reveal them simultaneously to see how they compare.",
  ),
  line(
    "d06-select-card",
    "offer",
    "Now, let's put that into practice. Select the ten from your hand, and I'll respond with a seven.",
    "[guiding, slightly encouraging] Now, let's put that into practice. Select the ten from your hand, and I'll respond with a seven.",
  ),
  line(
    "d07-round-result",
    "speaking",
    "Your ten defeats my seven, since the higher-powered card wins the round. But winning does not mean you receive the full power of your card; your score is determined by the difference between the two.",
    "[instructor-like, measured delivery] Your ten defeats my seven, since the higher-powered card wins the round. [slight emphasis] But winning does not mean you receive the full power of your card; your score is determined by the difference between the two.",
  ),
  line(
    "d08-score-display",
    "composed",
    "You can see your score here. Since your ten exceeds my seven by three, you've earned three points, which have been added to your total.",
    "[guiding, matter-of-fact] You can see your score here. [deliberate emphasis] Since your ten exceeds my seven by three, you've earned three points, which have been added to your total.",
  ),
  line(
    "d09-card-alignment",
    "speaking",
    "Now, there's another rule you need to understand before we continue. Every card has an alignment, either Good or Bad, which you can distinguish by their colors.",
    "[instructor-like, explanatory] Now, there's another rule you need to understand before we continue. Every card has an alignment, either Good or Bad, which you can distinguish by their colors.",
  ),
  line(
    "d10-alignment-colors",
    "composed",
    "Good cards are green, while Bad cards are red. These alignments matter just as much as the power of the cards, because they can determine whether a round earns any points at all.",
    "[clear, instructive delivery] Good cards are green, while Bad cards are red. These alignments matter just as much as the power of the cards, because they can determine whether a round earns any points at all.",
  ),
  line(
    "d11-play-twelve",
    "offer",
    "For our next round, play the twelve. I'll respond with a two, and both cards will share the same alignment. Watch.",
    "[guiding, composed] For our next round, play the twelve. I'll respond with a two, and both cards will share the same alignment. Watch.",
  ),
  line(
    "d12-nullified-result",
    "speaking",
    "My two is weaker than your twelve, so under normal circumstances, you would win this round. However, both cards are Good, and that changes the result entirely.",
    "[measured, explanatory delivery] My two is weaker than your twelve, so under normal circumstances, you would win this round. However, both cards are Good, and that changes the result entirely.",
  ),
  line(
    "d13-nullified-explanation",
    "stern",
    "When both players use cards of the same alignment, whether Good against Good or Bad against Bad, the round is nullified. No points are awarded to either player, regardless of how much power separates the cards.",
    "[deliberate, authoritative delivery] When both players use cards of the same alignment, whether Good against Good or Bad against Bad, the round is nullified. [slight emphasis] No points are awarded to either player, regardless of how much power separates the cards.",
  ),
  line(
    "d14-foundation",
    "welcome",
    "Those are the fundamentals of how a round is played, how scoring works, and why card alignment matters. With that understood, let's proceed to what makes this game interesting.",
    "[composed, instructional] Those are the fundamentals of how a round is played, how scoring works, and why card alignment matters. [slightly more engaging, measured delivery] With that understood, let's proceed to what makes this game interesting.",
  ),
];

/** Gimmick-card crash course — one quick setup and one clear explanation each. */
export const VICTOR_TRICKS: VictorLine[] = [
  line("g01-void-play", "offer", "First, Void. Play it.", "[instructor-like, measured delivery] First, Void. Play it."),
  line(
    "g02-void-explain",
    "speaking",
    "Void cancels the round completely. No points, no clash — both cards are destroyed.",
    "[clear, instructive delivery] Void cancels the round completely. [slight emphasis] No points, no clash — both cards are destroyed.",
  ),
  line("g03-ward-play", "offer", "Next, Ward. Play it.", "[guiding, composed] Next, Ward. Play it."),
  line(
    "g04-ward-explain",
    "composed",
    "Ward blocks an opposing gimmick and scores five points. Against a number, it simply fights at power five.",
    "[clear, instructive delivery] Ward blocks an opposing gimmick and scores five points. [matter-of-fact] Against a number, it simply fights at power five.",
  ),
  line("g05-echo-play", "offer", "Now, Echo. Play it.", "[guiding, composed] Now, Echo. Play it."),
  line(
    "g06-echo-explain",
    "speaking",
    "Echo cancels this round and doubles the next round's points. Play it a round early and make the next one count.",
    "[clear, instructive delivery] Echo cancels this round and doubles the next round's points. [slight emphasis] Play it a round early and make the next one count.",
  ),
  line("g07-eclipse-play", "offer", "Eclipse. Play it.", "[instructor-like, measured delivery] Eclipse. Play it."),
  line(
    "g08-eclipse-explain",
    "stern",
    "Eclipse cancels the round and drops alignment shields for two rounds. Same-type cards will score full damage while the shields are down.",
    "[clear, instructive delivery] Eclipse cancels the round and drops alignment shields for two rounds. [deliberate emphasis] Same-type cards will score full damage while the shields are down.",
  ),
  line("g09-oracle-play", "offer", "Oracle. Play it.", "[guiding, composed] Oracle. Play it."),
  line(
    "g10-oracle-explain",
    "speaking",
    "Oracle shows you two of your opponent's cards. A single peek can decide which card is safe to play.",
    "[clear, instructive delivery] Oracle shows you two of your opponent's cards. [slight emphasis] A single peek can decide which card is safe to play.",
  ),
  line("g11-exec-play", "offer", "Executioner. Play it.", "[instructor-like, measured delivery] Executioner. Play it."),
  line(
    "g12-exec-explain",
    "stern",
    "If your opponent plays a number of seven or higher, Executioner wipes their entire score. Save it for their strongest card.",
    "[clear, instructive delivery] If your opponent plays a number of seven or higher, Executioner wipes their entire score. [deliberate emphasis] Save it for their strongest card.",
  ),
  line("g13-reversal-play", "offer", "Finally, Reversal. Play it.", "[guiding, composed] Finally, Reversal. Play it."),
  line(
    "g14-reversal-explain",
    "speaking",
    "Reversal scores the round, then swaps both totals. The bigger their lead, the harder it turns against them.",
    "[clear, instructive delivery] Reversal scores the round, then swaps both totals. [slight emphasis] The bigger their lead, the harder it turns against them.",
  ),
  line(
    "g15-final",
    "welcome",
    "That is every gimmick. The rest is knowing when to use them.",
    "[composed, instructional] That is every gimmick. [slightly warmer, still reserved] The rest is knowing when to use them.",
  ),
];

export const VICTOR_ALL_LINES: VictorLine[] = [
  ...VICTOR_INTRO,
  VICTOR_OFFER,
  ...VICTOR_DECLINE,
  ...VICTOR_ACCEPT,
  ...VICTOR_DUEL,
  ...VICTOR_TRICKS,
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
