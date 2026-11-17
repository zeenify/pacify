/* THE THIRTEEN — campaign roster + refusal-gate content.
 *
 * Names, demeanors and refusal lines are DRAFTS — edit freely; everything is
 * display-only. The gate itself only reads `ready`, `portrait` and `refusals`.
 *
 * How a seat becomes a real fight (one by one, later):
 *   1. set `ready: true`
 *   2. drop the generated portrait into this file's `portrait` path
 *   3. author the personality and add a Character to ai-brain CHARACTERS
 *   4. wire the duel: OPPONENTS in duel.tsx + story encounter for this student
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
    id: 1, card: "2♣", name: "KLEIN", personality: "the cheerful tutorial guy",
    ready: true, portrait: "/students/2clubs9x16.png",
    refusals: { before: [], after: [] }, // Klein always sits down — no refusals
  },
  {
    id: 2, card: "3♣", name: "MERCY", personality: "neutral — placeholder, to be authored",
    ready: false, portrait: "/students/3clubs.png",
    refusals: {
      before: [
        "Oh — you're the one sniffing around the seats.",
        "Sweetheart, Klein eats first-years like you for breakfast. Bring back a win and we'll talk.",
      ],
      after: [
        "You beat Klein? How… sweet. I'll consider it — after I finish my tea.",
      ],
    },
  },
  {
    id: 3, card: "4♣", name: "TALLY", personality: "neutral — placeholder, to be authored",
    ready: false, portrait: "/students/4clubs.png",
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
    // Jaxen — "JAX". The enforcer: bald, pierced, tie loose, red rim light.
    // Blunt and flat, no theatrics — intimidates instead of scheming.
    id: 4, card: "5♣", name: "JAX",
    personality: "blunt enforcer — short flat sentences, zero patience for excuses, would rather stare you down than banter",
    ready: false, portrait: "/students-portrait/5-clubs-portrait.png",
    refusals: {
      before: [
        "No.",
        "Zero wins, all nerve. Win something first — then ask me again.",
      ],
      after: [
        "So the 2♣ fell. Doesn't make you tall enough for me.",
      ],
    },
  },
  {
    // 6♣ — the mocker: tongue out, hands in pockets, stares down his nose at
    // you. Everything is a joke; effort is the funniest part.
    id: 5, card: "6♣", name: "HAYDEN",
    personality: "the resident mocker — never serious, taunts everything, laughs hardest at effort; cruelty as play",
    ready: false, portrait: "/students-portrait/6-clubs-portrait.png",
    refusals: {
      before: [
        "Pfft— hah! You? Challenging ME? Oh, that's rich.",
        "Go win something. Anything. Then I'll start pretending to be scared.",
      ],
      after: [
        "You beat Klein? No way— …you're serious? Okay, NOW I'm listening.",
      ],
    },
  },
  {
    // 7♣ — the gentle ace: glasses, soft smile, the only seat that roots for
    // you. Refuses you out of care, not contempt — she doesn't want you hurt.
    // (Planned love interest — keep her kind, warm, quietly encouraging.)
    id: 6, card: "7♣", name: "HYACINTH",
    personality: "kind bookish honor student — warm and likeable, genuinely encouraging, believes in you before you do",
    ready: false, portrait: "/students-portrait/7-clubs-portrait.png",
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
    // 8♣ — the cat that got the cream: sprawls across her seat, always up to
    // something. Mischievous, not regal — she'd rather toy with you than duel
    // you. For now.
    id: 7, card: "8♣", name: "YANA",
    personality: "mischievous tease — lazy, playful, always three steps into some scheme; treats every duel like a game she can rig",
    ready: false, portrait: "/students-portrait/8-clubs-portrait.png",
    refusals: {
      before: [
        "Ooh, a challenger! Bold. Foolish, but bold. …I'll pass — for now.",
        "Go beat someone first. Then come back and we'll make it interesting.",
      ],
      after: [
        "You beat Klein? Hee… okay, NOW you're fun. Fine — let's play.",
      ],
    },
  },
  {
    // 9♣ — cultured and soft-spoken, a smile that never reaches the eyes.
    // Polite condescension, never a raised voice.
    id: 8, card: "9♣", name: "PRIME",
    personality: "refined, soft-spoken condescension — charming smile that never reaches the eyes, treats challengers as a polite inconvenience",
    ready: false, portrait: "/students-portrait/9-clubs-portrait.png",
    refusals: {
      before: [
        "Oh? Another aspirant. How earnest.",
        "I'd adore indulging you — but bring back a win first. Consider it good manners.",
      ],
      after: [
        "You beat Klein? How charming. Still not enough to trouble me.",
      ],
    },
  },
  {
    // 10♣ — bone-tired, deadpan, running on fumes; phone to the ear and tie
    // undone. The refusal is a sigh, not a scheme.
    id: 9, card: "10♣", name: "SOLEMN",
    personality: "perpetually exhausted — deadpan, low-energy, tie undone, just wants the day to end; refuses with a sigh, not a sneer",
    ready: false, portrait: "/students-portrait/10-clubs-portrait.png",
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
    id: 10, card: "11♣", name: "VANTA", personality: "neutral — placeholder, to be authored",
    ready: false, portrait: "",
    refusals: {
      before: [
        "I only duel reflections of wins.",
        "You haven't got one. Go make it.",
      ],
      after: [
        "Klein's reflection shattered. Yours is still blank.",
      ],
    },
  },
  {
    id: 11, card: "12♣", name: "MONO", personality: "neutral — placeholder, to be authored",
    ready: false, portrait: "",
    refusals: {
      before: [
        "Query: wins. Answer: none.",
        "Insufficient record. Re-approach after one victory.",
      ],
      after: [
        "Record: one. Still insufficient. Re-approach after more.",
      ],
    },
  },
  {
    id: 12, card: "13♣", name: "WRAITH", personality: "neutral — placeholder, to be authored",
    ready: false, portrait: "",
    refusals: {
      before: [
        "I duel the worthy. You're a rumor.",
        "Spread your name with a win first.",
      ],
      after: [
        "Klein whispers about you now. Whispers aren't worth my turn.",
      ],
    },
  },
  {
    id: 13, card: "14♣", name: "CROWN", personality: "neutral — placeholder, to be authored",
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
