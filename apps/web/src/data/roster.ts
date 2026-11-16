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
    // 7♣ — the honor-society analyst: adjusts her glasses, grades your record
    // out loud. Polite on the surface, condescending underneath.
    id: 6, card: "7♣", name: "HYACINTH",
    personality: "smug honor-student analyst — quantifies everything, backhanded praise, grades your résumé to your face",
    ready: false, portrait: "/students-portrait/7-clubs-portrait.png",
    refusals: {
      before: [
        "Accessing your record… error. File empty.",
        "Bring me a win. Then we'll review your application.",
      ],
      after: [
        "One win, noted. The margin was unimpressive — but I'll allow the retry.",
      ],
    },
  },
  {
    // 8♣ — the effortless aristocrat: leans back like the room is her sofa,
    // half-lidded gaze. Refuses you like declining an audience.
    id: 7, card: "8♣", name: "YANA",
    personality: "effortless aristocrat — languid, unbothered, bored; refuses you the way royalty declines an audience",
    ready: false, portrait: "/students-portrait/8-clubs-portrait.png",
    refusals: {
      before: [
        "Mm? Oh. Were you saying something?",
        "Come back when you're worth sitting up for.",
      ],
      after: [
        "You beat Klein? How industrious. …Fine. You may sit.",
      ],
    },
  },
  {
    id: 8, card: "9♣", name: "PRIME", personality: "neutral — placeholder, to be authored",
    ready: false, portrait: "",
    refusals: {
      before: [
        "You are, statistically, unproven.",
        "Prime seats don't play exhibitions. Factor in a win first.",
      ],
      after: [
        "One victory is not a proven theorem. Repeat it, then apply to me.",
      ],
    },
  },
  {
    id: 9, card: "10♣", name: "SOLEMN", personality: "neutral — placeholder, to be authored",
    ready: false, portrait: "",
    refusals: {
      before: [
        "Another face that hasn't bled for a seat.",
        "Grief earns nothing here. Neither do you. …Yet.",
      ],
      after: [
        "So the first chain broke. Twelve remain. Mine isn't next.",
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
