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
    "Ward is particularly useful for countering gimmicks, as it blocks their effects. Against an ordinary number card, however, it has a power of five and competes accordingly.",
    "[instructor-like, explanatory] Ward is particularly useful for countering gimmicks, as it blocks their effects. [matter-of-fact] Against an ordinary number card, however, it has a power of five and competes accordingly.",
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
    "Oracle reveals two random cards from your opponent's hand, giving you a glimpse of what they're holding and a better idea of what they might play next.",
    "[quietly instructive] Oracle reveals two random cards from your opponent's hand, giving you a glimpse of what they're holding and a better idea of what they might play next.",
  ),
  line("g11-exec-play", "offer", "Let's move on to Executioner. Play it, and pay attention to the condition it sets.", "[measured, deliberate] Let's move on to Executioner. Play it, and pay attention to the condition it sets."),
  line(
    "g12-exec-explain",
    "stern",
    "If your opponent plays a card with a power of seven or higher, their score is reduced to zero. One careless play can cost them everything they've accumulated.",
    "[quietly stern, deliberate delivery] If your opponent plays a card with a power of seven or higher, their score is reduced to zero. [dry, faintly ominous] One careless play can cost them everything they've accumulated.",
  ),
  line("g13-reversal-play", "offer", "And last, we have Reversal. This one can turn a comfortable lead into a rather uncomfortable deficit, so go ahead and play it.", "[slightly wry, composed] And last, we have Reversal. This one can turn a comfortable lead into a rather uncomfortable deficit, so go ahead and play it."),
  line(
    "g14-reversal-explain",
    "speaking",
    "Reversal scores the round, then exchanges both players' scores. If your opponent has been building a substantial lead, it can turn that advantage against them in a single move.",
    "[measured, faintly wry] Reversal scores the round, then exchanges both players' scores. [slight emphasis] If your opponent has been building a substantial lead, it can turn that advantage against them in a single move.",
  ),
];

/** Conclusion — plays on the duel table right after Reversal's lesson; the tap
 *  that follows walks the player to the menu for the last word. */
export const VICTOR_TRICKS_FINAL: VictorLine = line(
  "g16-tutorial-complete",
  "composed",
  "And with that, you've learned everything you need to know about the game itself. The rest of your education, however, will be considerably less forgiving.",
  "[composed, instructor-like] And with that, you've learned everything you need to know about the game itself. [slight emphasis] The rest of your education, however, will be considerably less forgiving.",
);

/** Menu invitation — one line on the main menu; the highlighted CAMPAIGN row is
 *  the only way forward, and clicking it hands off to the board briefing. */
export const VICTOR_MENU_INVITE: VictorLine = line(
  "g23-menu-campaign",
  "offer",
  "Your orientation is complete. Everything from here on happens at the campaign board — thirteen seats, thirteen opponents. Click CAMPAIGN, and I'll make the introductions.",
  "[measured, faintly encouraging] Your orientation is complete. [guiding] Everything from here on happens at the campaign board — thirteen seats, thirteen opponents. [slight emphasis] Click CAMPAIGN, and I'll make the introductions.",
);

/** Board briefing — g17–g22, delivered over the live seat list while the
 *  spotlight dims everything but what each line points at. The last tap
 *  completes the tutorial and hands them the board. */
export const VICTOR_BRIEFING: VictorLine[] = [
  line(
    "g17-the-thirteen",
    "speaking",
    "Here at Vertex Institute, thirteen students have distinguished themselves as the finest card players among the first-year class. Collectively, they are known as the Thirteen, and each holds a seat — a rank represented by a playing card, beginning with the Two of Clubs and ending with the Ace of Clubs.",
    "[measured, quietly authoritative] Here at Vertex Institute, thirteen students have distinguished themselves as the finest card players among the first-year class. [slight emphasis] Collectively, they are known as the Thirteen, and each holds a seat — a rank represented by a playing card, beginning with the Two of Clubs and ending with the Ace of Clubs.",
  ),
  line(
    "g18-their-ranking",
    "composed",
    "Their rankings reflect their standing among those thirteen students, with each successive card representing a more formidable opponent. The Two of Clubs may sit at the bottom of the list, but don't mistake that for weakness. Every one of them has earned their place among the best in this institute.",
    "[instructor-like, explanatory] Their rankings reflect their standing among those thirteen students, with each successive card representing a more formidable opponent. [measured caution] The Two of Clubs may sit at the bottom of the list, but don't mistake that for weakness. [firm] Every one of them has earned their place among the best in this institute.",
  ),
  line(
    "g19-the-challenge",
    "stern",
    "You'll be facing them one at a time, starting with the Two of Clubs and working your way up to the Ace. Each victory brings you closer to the top, but don't expect the challenges to remain comfortable for long. These students are here because they're exceptionally good at what they do.",
    "[quietly stern, deliberate delivery] You'll be facing them one at a time, starting with the Two of Clubs and working your way up to the Ace. [measured] Each victory brings you closer to the top, but don't expect the challenges to remain comfortable for long. [firm] These students are here because they're exceptionally good at what they do.",
  ),
  line(
    "g20-first-opponent",
    "offer",
    "You'll find them all on the board in front of you. Choose a seat to challenge, and you'll be taken to your match. Your first opponent waits at the bottom of the rankings: Klein, at the Two of Clubs.",
    "[measured, faintly encouraging] You'll find them all on the board in front of you. [guiding] Choose a seat to challenge, and you'll be taken to your match. [slight emphasis] Your first opponent waits at the bottom of the rankings: Klein, at the Two of Clubs.",
  ),
  line(
    "g21-final-warning",
    "stern",
    "One final word of advice. Don't underestimate anyone on that board. This is no casual exercise, and the students you'll be facing won't go easy on you. If you intend to reach the Ace, you'll have to earn every step along the way.",
    "[low, restrained warning] One final word of advice. [deliberate] Don't underestimate anyone on that board. This is no casual exercise, and the students you'll be facing won't go easy on you. [quiet, firm close] If you intend to reach the Ace, you'll have to earn every step along the way.",
  ),
  line(
    "g22-exit",
    "composed",
    "Well then, I believe your orientation is complete. Best of luck at the table. You'll need it.",
    "[formal, quietly confident] Well then, I believe your orientation is complete. [dry, almost warm] Best of luck at the table. You'll need it.",
  ),
];

export const VICTOR_ALL_LINES: VictorLine[] = [
  ...VICTOR_INTRO,
  VICTOR_OFFER,
  ...VICTOR_DECLINE,
  ...VICTOR_ACCEPT,
  ...VICTOR_DUEL,
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
