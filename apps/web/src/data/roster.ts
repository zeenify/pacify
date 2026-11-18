/* THE THIRTEEN — campaign roster + refusal-gate content.
 *
 * Names, demeanors and refusal lines match the approved character direction;
 * everything is display-only. The gate itself only reads `ready`, `portrait`
 * and `refusals`.
 *
 * How a seat becomes a real fight (seats 1-12 are live — story + duel + AI
 * persona + memory each). For the remaining seat (13 / Ace):
 *   1. set `ready: true`
 *   2. drop the generated portrait into this file's `portrait` path
 *   3. author the personality and add a Character to ai-brain CHARACTERS
 *   4. add a StoryProfile in apps/server/src/story-profiles.ts + OPPONENTS in duel.tsx
 *
 * Portrait convention: generated art goes to /dialog-images/{n}-clubs/ (mirrors
 * Klein's 2-clubs set). Until it exists, seats fall back to the campaign club
 * art, and seats with no art at all show an empty stage (bubble carries it).
 */
import type { SceneLine } from "../lib/encounter";

export type RosterStudent = {
  /** Seat number — 1 is Klein (2♣), seat N plays the (N+1)♣. */
  id: number;
  card: string;
  /** Codename shown on the name tag and the campaign grid. DRAFT — edit me. */
  name: string;
  /** Neutral placeholder until each character is authored one by one. */
  personality: string;
  /** true = a real fight exists for this seat (story + duel + AI persona). */
  ready: boolean;
  /** Art shown in the refusal scene. "" = empty stage until art is generated. */
  portrait: string;
  /** Refusal scene lines. `before` = the player has zero wins; `after` = they
   *  have at least one (beat Klein) but this seat still won't fight them. */
  refusals: { before: string[]; after: string[] };
};

export const ROSTER: RosterStudent[] = [
  {
    id: 1, card: "2♣", name: "KLEIN",
    personality: "cheerful tutorial guy — friendly, goofy, self-deprecating; sly and strong underneath, never admits it",
    ready: true, portrait: "/students/2clubs9x16.png",
    refusals: { before: [], after: [] }, // Klein always sits down — no refusals
  },
  {
    // Sato — composed and aloof. Impeccable politeness with distance
    // built in; offers tea he rarely pours. Selective acceptance, not cruelty.
    id: 2, card: "3♣", name: "SATO",
    personality: "composed and aloof — impeccable politeness with distance; condescending warmth, selective acceptance",
    ready: true, portrait: "/students/3clubs.png",
    refusals: {
      before: [
        "Hmm. You're the one making noise at the bottom of the chart.",
        "Sit if you like. I haven't decided you're worth the tea yet.",
      ],
      after: [
        "You beat Klein? Hah. Curiosity noted. That isn't respect — sit down.",
      ],
    },
  },
  {
    // Nathalie — the exacting auditor. Proud, sharp, trusts numbers
    // over people; quietly enjoys finding the error nobody else caught.
    id: 3, card: "4♣", name: "NATHALIE",
    personality: "exacting and proud — precise, sharp, trusts numbers over promises; respects demonstrated results only",
    ready: true, portrait: "/students/4clubs.png",
    refusals: {
      before: [
        "Record check: zero wins, zero standing.",
        "The ledger says no. The ledger always says no.",
      ],
      after: [
        "One win on record. The margin matters more than the fact — bring me a number I respect.",
      ],
    },
  },
  {
    // Jaxen — the brawler: bald, pierced, bad manners, short temper.
    // Solves arguments with his fists; the card table frustrates him.
    id: 4, card: "5♣", name: "JAXEN",
    personality: "brawler — bad manners, short temper, always resorts to fighting; respects the ones who keep getting up",
    ready: true, portrait: "/students-portrait/5-clubs-portrait.png",
    refusals: {
      before: [
        "The hell do you want? A duel? You don't look like you can take a hit.",
        "Win something first. Then I'll bother breaking a sweat.",
      ],
      after: [
        "So you took down the Pierce kid. And? You still look soft. Sit down.",
      ],
    },
  },
  {
    // 6♣ — Hayden, Klein's younger brother. Twisted and creepy: hunts
    // for the moment fear arrives, smiles when he finds it. Playful one second,
    // perfectly still the next. The brother angle adds dimension — never an excuse.
    id: 5, card: "6♣", name: "HAYDEN",
    personality: "the menace of the table — loud, foul-mouthed, laughs like crazy, trash-talks every play to tilt you; having fun, never actually angry",
    ready: true, portrait: "/students-portrait/6-clubs-portrait.png",
    refusals: {
      before: [
        "Oh, you want a piece of me? [laughing] Bro, you're not ready. Go lose to my brother first.",
        "Nah. [cackling] Come back when you can survive Klein. This? This would just be mean.",
      ],
      after: [
        "You beat Klein?! [wheezing] Oh, that's hilarious. Fine, fine. Let's see how long YOUR luck lasts, dumbass.",
      ],
    },
  },
  {
    // 7♣ — Hyacinth. Genuinely kind and likeable by everyone: warm,
    // sincere, remembers what people say. Hesitates out of care, but plays
    // straight once she sits down — kindness is never her handicap.
    // (Planned love interest — keep her kind, warm, quietly encouraging.)
    id: 6, card: "7♣", name: "HYACINTH",
    personality: "genuinely kind and likeable by everyone — warm, sincere, attentive; competitive without cruelty",
    ready: true, portrait: "/students-portrait/7-clubs-portrait.png",
    refusals: {
      before: [
        "You want to challenge me? That's really sweet… but I don't want to see you get hurt.",
        "Grow your record a little first — show me how far you can go. I'll be cheering for you.",
      ],
      after: [
        "You beat Klein? I knew you had it in you. …Okay. Show me what else you can do.",
      ],
    },
  },
  {
    // 8♣ — Yana, mischievous like Cupid. The self-appointed
    // matchmaker: loves, crushes, rumors and embarrassment are her toys.
    // Playful, never cruel — she rigs hearts, never duels.
    id: 7, card: "8♣", name: "YANA",
    personality: "mischievous like cupid — matchmaking menace; love, rumors and embarrassment are her toys; playful, never cruel",
    ready: true, portrait: "/students-portrait/8-clubs-portrait.png",
    refusals: {
      before: [
        "Ooh, a challenger! Bold. …Tell me, is there someone you're trying to impress?",
        "Go win something first. Then come back — I adore an underdog story.",
      ],
      after: [
        "You beat Klein? Hee… okay, NOW you're fun. Fine — let's play. Loser admits who they came here for.",
      ],
    },
  },
  {
    // 9♣ — Tristan (Geto-like): soft-spoken, charismatic, and
    // absolutely certain he is right. Gracious warmth and quiet contempt in the
    // same smile; hierarchy is his sincere belief, not a performance.
    id: 8, card: "9♣", name: "TRISTAN",
    personality: "soft-spoken absolute certainty (Geto-like) — gracious, charismatic, quietly dehumanizing; warmth and contempt in one smile",
    ready: true, portrait: "/students-portrait/9-clubs-portrait.png",
    refusals: {
      before: [
        "Oh? Another aspirant. How earnest.",
        "There's no need to look so offended. Wanting something badly has never made anybody worthy of it.",
      ],
      after: [
        "You beat Klein? How charming. Still not enough to trouble me.",
      ],
    },
  },
  {
    // 10♣ — Noir. Bone-tired, deadpan, running on fumes; phone to the
    // ear and tie undone. The refusal is a sigh, not a scheme.
    id: 9, card: "10♣", name: "NOIR",
    personality: "perpetually exhausted — deadpan, low-energy, tie undone; the refusal is a sigh, not a scheme",
    ready: true, portrait: "/students-portrait/10-clubs-portrait.png",
    refusals: {
      before: [
        "Ugh… another one. Can this wait? I'm exhausted.",
        "Win something first. Then maybe I'll have the energy to say no properly.",
      ],
      after: [
        "So Klein lost. Great. …Yeah, I'm still tired. Ask me later.",
      ],
    },
  },
  {
    // J♣ — Anthony Kruger. The broker: immaculate, procedural, transactional.
    // Every favor at Vertex crosses his desk, every favor has fine print, and
    // he keeps one hand behind his back. The courtesy is the wrapping.
    id: 10, card: "11♣", name: "ANTHONY",
    personality: "immaculate dealmaker — courteous, procedural, transactional; every kindness has a rate and one hand stays hidden",
    ready: true, portrait: "/students/jackclubs.png",
    refusals: {
      before: [
        "The terms of this table require a record. Yours is blank. I don't write blank contracts.",
        "I could make an exception. Exceptions have interest. Come back with a win and we'll discuss rates.",
      ],
      after: [
        "So the record exists now. Fine. Sit, and read everything I say carefully before you agree to it.",
      ],
    },
  },
  {
    // Q♣ — Cecilia Rose. The sweet venom: teasing, playful, evil. Acts kind
    // and cute while the cruelty giggles through. Compliments are measurements;
    // she has never needed a cruel word, which is exactly the problem.
    id: 11, card: "12♣", name: "CECILIA",
    personality: "sweet venom — teasing, playful, evil; acts kind and cute while the malice giggles through; compliments that land like pins",
    ready: true, portrait: "/students/queenclubs.png",
    refusals: {
      before: [
        "Aww, you want to challenge little old me? That's adorable. Come back when you've won literally anything, cutie.",
        "No no no, don't make that face! I'd hate to see you sad... well. 'Hate' is such a strong word. Win first, sweetheart.",
      ],
      after: [
        "You beat Klein? Ohmygosh, good for you!! Now sit down before I change my mind about being nice.",
      ],
    },
  },
  {
    // K♣ — Reeve Vasilevsky. The strategist: calm, composed, glacial. Announces
    // outcomes instead of taunting and gives ground deliberately to watch what
    // you do with it. Yana's older brother.
    id: 12, card: "13♣", name: "REEVE",
    personality: "glacial strategist — calm, composed, absolute; announces outcomes instead of taunting; gives ground to see what you do with it",
    ready: true, portrait: "/students/kingclubs.png",
    refusals: {
      before: [
        "The position says no. A blank record against this seat is a lost opening. Play someone else first.",
        "I don't take walks. Bring me a win, and I will show you the board as I see it.",
      ],
      after: [
        "You beat Klein. Noted. The position changed. Sit, and we will see how far.",
      ],
    },
  },
  {
    id: 13, card: "14♣", name: "LUKE", personality: "unrevealed — away on a special exam, never met in person",
    ready: false, portrait: "",
    refusals: {
      before: [
        "The throne doesn't notice ants.",
        "Earn a single crown first — even the 2♣ counts.",
      ],
      after: [
        "You took the 2♣. The view from fourteen is better. Climb.",
      ],
    },
  },
];

export function rosterStudent(id: number): RosterStudent | null {
  return ROSTER.find((s) => s.id === id) ?? null;
}

/** The refusal scene as story-screen lines: student speaks, no pose switching,
 *  no voice tickets (fully local — the server never hears about refusals). */
export function refusalScene(student: RosterStudent, playerHasWins: boolean): { chapter: string; lines: SceneLine[] } {
  const lines = (playerHasWins ? student.refusals.after : student.refusals.before)
    .map((text) => ({ text, pose: "neutral" as const }));
  return { chapter: "REFUSED", lines };
}
