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
    "Each round, we'll select one card and place it face down on the table.",
    "[measured, instructive] Each round, we'll select one card and place it face down on the table.",
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
    "Your ten defeats my seven, since the higher-powered card wins the round.",
    "[instructor-like, measured delivery] Your ten defeats my seven, since the higher-powered card wins the round.",
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
    "My two is weaker than your twelve. However, both cards are Good, and that changes the result entirely.",
    "[measured, explanatory delivery] My two is weaker than your twelve. However, both cards are Good, and that changes the result entirely.",
  ),
  line(
    "d13-nullified-explanation",
    "stern",
    "When both players use cards of the same alignment, whether Good against Good or Bad against Bad, the round is nullified regardless of their power.",
    "[deliberate, authoritative delivery] When both players use cards of the same alignment, whether Good against Good or Bad against Bad, the round is nullified regardless of their power.",
  ),
  line(
    "d14-foundation",
    "welcome",
    "Those are the fundamentals of how a round is played, how scoring works, and why card alignment matters. With that understood, let's proceed to what makes this game interesting.",
    "[composed, instructional] Those are the fundamentals of how a round is played, how scoring works, and why card alignment matters. [slightly more engaging, measured delivery] With that understood, let's proceed to what makes this game interesting.",
  ),
];

/** Gimmick-card primer — plays before the first lesson so the gimmicks are
 *  explained before the player is asked to use one. */
export const VICTOR_TRICKS_INTRO: VictorLine = line(
  "g00-gimmick-intro",
  "composed",
  "What makes this game require intelligence is the gimmick cards. These are special cards that has unique effects or do something with the game.",
  "[measured, instructive] What makes this game require intelligence is the gimmick cards. [slight emphasis] These are special cards that has unique effects or do something with the game.",
);

/** Gimmick-card crash course — one quick setup and one clear explanation each. */
export const VICTOR_TRICKS: VictorLine[] = [
  line("g01-void-play", "offer", "We'll begin with Void. Go ahead and play it.", "[measured, instructive] We'll begin with Void. Go ahead and play it."),
  line(
    "g02-void-explain",
    "speaking",
    "Void simply cancels the clash entirely. Neither player earns points, and both cards are destroyed.",
    "[composed, matter-of-fact] Void simply cancels the clash entirely. Neither player earns points, and both cards are destroyed.",
  ),
  line("g03-ward-play", "offer", "Now, let's see how Ward handles a gimmick. Play it for me.", "[guiding, composed] Now, let's see how Ward handles a gimmick. Play it for me."),
  line(
    "g04-ward-explain",
    "composed",
    "Ward is particularly useful for countering gimmicks, as it blocks their effects.",
    "[instructor-like, explanatory] Ward is particularly useful for countering gimmicks, as it blocks their effects.",
  ),
  line("g05-echo-play", "offer", "For our next demonstration, I'd like you to use Echo. Select it from your hand.", "[measured, slightly encouraging] For our next demonstration, I'd like you to use Echo. Select it from your hand."),
  line(
    "g06-echo-explain",
    "speaking",
    "Echo nullifies the current round, but doubles the points awarded in the next one.",
    "[clear, deliberate delivery] Echo nullifies the current round, but doubles the points awarded in the next one.",
  ),
  line("g07-eclipse-play", "offer", "Eclipse is a little more interesting. Let's put it into play and see what it changes.", "[composed, authoritative] Eclipse is a little more interesting. Let's put it into play and see what it changes."),
  line(
    "g08-eclipse-explain",
    "stern",
    "Eclipse nullifies the current round and removes alignment protection for the next two. During that time, Good can clash with Good, and Bad with Bad, without the usual protection preventing them from scoring.",
    "[measured, explanatory delivery] Eclipse nullifies the current round and removes alignment protection for the next two. [deliberate emphasis] During that time, Good can clash with Good, and Bad with Bad, without the usual protection preventing them from scoring.",
  ),
  line("g09-oracle-play", "offer", "Now, let's turn our attention to Oracle. Play it, and take a look at what your opponent is holding.", "[guiding, composed] Now, let's turn our attention to Oracle. Play it, and take a look at what your opponent is holding."),
  line(
    "g10-oracle-explain",
    "speaking",
    "Oracle reveals two random cards from your opponent's hand.",
    "[quietly instructive] Oracle reveals two random cards from your opponent's hand.",
  ),
  line("g11-exec-play", "offer", "Let's move on to Executioner. Play it, and pay attention to the condition it sets.", "[measured, deliberate] Let's move on to Executioner. Play it, and pay attention to the condition it sets."),
  line(
    "g12-exec-explain",
    "stern",
    "If your opponent plays a card with a power of seven or higher, their score is reduced to zero.",
    "[quietly stern, deliberate delivery] If your opponent plays a card with a power of seven or higher, their score is reduced to zero.",
  ),
  line("g13-reversal-play", "offer", "And last, we have Reversal. This one can turn a comfortable lead into a rather uncomfortable deficit, so go ahead and play it.", "[slightly wry, composed] And last, we have Reversal. This one can turn a comfortable lead into a rather uncomfortable deficit, so go ahead and play it."),
  line(
    "g14-reversal-explain",
    "speaking",
    "Reversal scores the round, then exchanges both players' scores.",
    "[measured, faintly wry] Reversal scores the round, then exchanges both players' scores.",
  ),
];

/** Conclusion — plays on the duel table right after Reversal's lesson; the tap
 *  that follows walks the player to the menu for the last word. */
export const VICTOR_TRICKS_FINAL: VictorLine = line(
  "g16-tutorial-complete",
  "composed",
  "And with that, you should be prepared facing a real opponent. The game is incredibly simple... But please, try your best not to lose your mind.",
  "[composed, instructor-like] And with that, you should be prepared facing a real opponent. The game is incredibly simple... [low tone, ominous] But please, try your best not to lose your mind.",
);

/** Menu invitation — one line on the main menu; the highlighted CAMPAIGN row is
 *  the only way forward, and clicking it hands off to the board briefing. */
export const VICTOR_MENU_INVITE: VictorLine = line(
  "g23-menu-campaign",
  "offer",
  "Your orientation is complete. Click Campaign to meet the students you'll be facing.",
  "[measured, guiding] Your orientation is complete. Click Campaign to meet the students you'll be facing.",
);

/** Board briefing — delivered over the live seat list while the spotlight dims
 *  everything but what each line points at; the second-to-last line pins Klein,
 *  and the last tap completes the tutorial and hands them the board. */
export const VICTOR_BRIEFING: VictorLine[] = [
  line(
    "g17-the-thirteen",
    "speaking",
    "The campaign board holds thirteen of the institute's finest first-year players, collectively known as the Thirteen.",
    "[measured, explanatory] The campaign board holds thirteen of the institute's finest first-year players, collectively known as the Thirteen.",
  ),
  line(
    "g20-first-opponent",
    "offer",
    "You may challenge any of them anytime, but be careful, some of them have terrible attitudes.",
    "[guiding, composed] You may challenge any of them anytime, but be careful, some of them have terrible attitudes.",
  ),
  line(
    "g21-final-warning",
    "stern",
    "After all, they are the top 13 first-year students in this academy, so most of them are condescending bastards. I recommend challenging Klein first. He's the 2 of clubs.",
    "[quietly stern] After all, they are the top 13 first-year students in this academy, so most of them are condescending bastards. [measured, guiding] I recommend challenging Klein first. He's the 2 of clubs.",
  ),
  line(
    "g22-exit",
    "composed",
    "Well then, best of luck. One piece of advice: try not to get manipulated, coerced, or tricked. If you die, the academy doesn't hold accountability.",
    "[formal, composed] Well then, best of luck. [chuckling, exclaiming] One piece of advice: try not to get manipulated, coerced, or tricked. [serious, deadly low tone] If you die, the academy doesn't hold accountability.",
  ),
];

export const VICTOR_ALL_LINES: VictorLine[] = [
  ...VICTOR_INTRO,
  VICTOR_OFFER,
  ...VICTOR_DECLINE,
  ...VICTOR_ACCEPT,
  ...VICTOR_DUEL,
  VICTOR_TRICKS_INTRO,
  ...VICTOR_TRICKS,
  VICTOR_TRICKS_FINAL,
  VICTOR_MENU_INVITE,
  ...VICTOR_BRIEFING,
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
