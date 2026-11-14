/* Screen-transition system — "The Calling Card" v2.
   Data-only module: variant resolution + beat timings, so the choreography is
   testable and the NavTransition component stays purely presentational.

   FORWARD (1100ms, five named beats):
     B1 wind-up 0-120 — vignette bars + speed lines fade in.
     B2 throw 120-440 — red card (with black shadow card 40ms behind) slams in
        with overshoot; screen fully covered at 440; route swaps here.
     B3 stamp+hold 440-820 — destination stamp lands at 420-520 with a ring
        burst and a 60ms screen shake; card pushes in slowly (scale 1→1.03).
     B4 slash 700-820 — white blade at -10° draws across; flash pulse.
     B5 split 820-1100 — card splits along the blade; halves fall away; the new
        screen settles scale 1.04→1.
   BACK "Return to Deck" (550ms): a BLACK card skewed +10° (mirror) sweeps
     right→left with red chevrons, swaps at 210, then POCKETS — shrinks toward
     the top-left corner like a card returning to your hand. Unmistakably
     "going back": black not red, +10° not -10°, horizontal not diagonal,
     pocketed not slashed.
   Battle (story→duel): speed lines full, DUEL stamp, 1300ms.
   Curtain (→story): deep-red card, no blade, 1200ms. */

export type TransitionKind = "forward" | "back";
export type TransitionVariant =
  | "default"     // red calling card, stamp = destination, blade cut, split
  | "utility"     // shorter, no stamp/blade
  | "battle"      // speed lines full + DUEL stamp, 1300ms
  | "curtain"     // deep-red card, no blade, 1200ms
  | "enroll"      // PACIFY stamp, 750ms
  | "back";       // Return to Deck, 550ms fixed

export type TransitionPlan = {
  kind: TransitionKind;
  variant: TransitionVariant;
  durationMs: number;
  coveredMs: number;      // card fully covers the screen — route swaps here
  swapAtMs: number;       // = coveredMs (kept for callers)
  stampAtMs: number | null;   // destination stamp lands (null = no stamp)
  bladeAtMs: number | null;   // white blade draws (null = no blade)
  revealAtMs: number;     // split/carry-off begins (the nav layer calls reveal() then)
  revealMs: number;       // split/carry-off duration
  stampText?: string;     // what the stamp carries (default/battle/enroll only)
};

const UTILITY_PATHS = ["/options", "/howto", "/sfx-test"];
/** Hub screens a player "leaves" — the nav layer maps replace() into these to the
 *  short back mirror (session unwind), everything else it maps forward. */
export const EXIT_PATHS = ["/campaign", "/menu", "/login", "/"];

/** Resolve which variant a navigation needs. `from`/`to` are pathnames
 *  (query strings tolerated). The nav layer passes kind "back" for exits and
 *  explicit unwinds; forward navigations rank battle/curtain/enroll/utility. */
export function resolveVariant(from: string, to: string, kind: TransitionKind): TransitionVariant {
  const a = from.split("?")[0].replace(/\/+$/, "") || "/";
  const b = to.split("?")[0].replace(/\/+$/, "") || "/";
  if (kind === "back") return "back";
  if (a.startsWith("/story") && b.startsWith("/duel")) return "battle";
  if (b.startsWith("/story")) return "curtain";
  if (a.startsWith("/login") || a.startsWith("/load") || a.startsWith("/start")) {
    if (b.startsWith("/login") || b.startsWith("/load") || b.startsWith("/start") || b.startsWith("/menu")) return "enroll";
  }
  if (UTILITY_PATHS.some((p) => b.startsWith(p)) || UTILITY_PATHS.some((p) => a.startsWith(p))) return "utility";
  return "default";
}

/** The stamp text each variant carries — the destination's name, like a calling card. */
export function stampFor(variant: TransitionVariant, to: string): string | null {
  if (variant === "battle") return "DUEL";
  if (variant === "enroll") return "PACIFY";
  if (variant === "default") {
    const path = to.split("?")[0];
    if (path.startsWith("/campaign")) return "THE THIRTEEN";
    if (path.startsWith("/menu")) return "PACIFY";
    if (path.startsWith("/dossier")) return "DOSSIER";
    if (path.startsWith("/profile")) return "PROFILE";
    return "PACIFY";
  }
  return null; // curtain/utility/back carry no stamp
}

const PLANS: Record<TransitionVariant, Omit<TransitionPlan, "kind" | "variant" | "stampText">> = {
  default: { durationMs: 1100, coveredMs: 440, swapAtMs: 440, stampAtMs: 420, bladeAtMs: 700, revealAtMs: 780, revealMs: 320 },
  battle:  { durationMs: 1300, coveredMs: 500, swapAtMs: 500, stampAtMs: 460, bladeAtMs: 800, revealAtMs: 900, revealMs: 400 },
  curtain: { durationMs: 1200, coveredMs: 480, swapAtMs: 480, stampAtMs: null, bladeAtMs: null, revealAtMs: 900, revealMs: 300 },
  enroll:  { durationMs: 750, coveredMs: 300, swapAtMs: 300, stampAtMs: 300, bladeAtMs: 420, revealAtMs: 460, revealMs: 290 },
  utility: { durationMs: 800, coveredMs: 330, swapAtMs: 330, stampAtMs: null, bladeAtMs: null, revealAtMs: 620, revealMs: 180 },
  back:    { durationMs: 550, coveredMs: 210, swapAtMs: 210, stampAtMs: null, bladeAtMs: null, revealAtMs: 260, revealMs: 290 },
};


/** Beat plan for a resolved variant. */
export function planFor(variant: TransitionVariant): TransitionPlan {
  return { kind: variant === "back" ? "back" : "forward", variant, ...PLANS[variant] };
}

export const SFX_CUES = {
  blade: "round.cutFlash",
  stamp: "duel.stamp",
  back: "duel.flip.whoosh",
} as const;
