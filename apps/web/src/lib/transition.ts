/* Screen-transition system — "Calling Card Cut" design.
   Data-only module: variant resolution + beat timings, so the choreography is
   testable and the NavTransition component stays purely presentational.

   FORWARD (600ms): red slab sweeps left→right (hard ease-in), black slab 50ms
   behind, 100ms covered hold (route swaps here), white blade cut flourish at
   -28°, then the slab splits along the cut to reveal the new screen.
   BACK (400ms): one black slab sweeps right→left, 40ms black beat, carries off.
   Battle (story→duel): double slab, speed lines, DUEL stamp, +200ms.
   Curtain (→story): deep-red slab, vertical split, no blade, +120ms.
   Utility (options/howto/sfx-test): black only, no blade, -100ms. */

export type TransitionKind = "forward" | "back";
export type TransitionVariant =
  | "default"     // red + black slabs, blade cut
  | "utility"     // black only, no blade, -100ms
  | "battle"      // story→duel: speed lines + DUEL stamp, +200ms
  | "curtain"     // →story: deep red vertical split, +120ms
  | "enroll"      // login→load→start flow: white slab + PACIFY stamp, +150ms
  | "back";       // single black slab right→left, fixed 400ms

export type TransitionPlan = {
  kind: TransitionKind;
  variant: TransitionVariant;
  /** Total duration in ms (back is fixed; forward varies by variant). */
  durationMs: number;
  /** Beat timings within the plan. */
  coverMs: number;     // slabs fully cover the screen
  swapAtMs: number;    // route swaps (inside the covered hold)
  bladeAtMs: number | null;  // white blade cut flourish (null = none)
  revealMs: number;    // slab split / carry-off reveal
};

const FORWARD_BASE = { coverMs: 220, swapAtMs: 260, bladeAtMs: 300, revealMs: 300 };
const DURATIONS: Record<TransitionVariant, number> = {
  default: 600,
  utility: 500,
  battle: 800,
  curtain: 720,
  enroll: 750,
  back: 400,
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

/** Beat plan for a resolved variant. */
export function planFor(variant: TransitionVariant): TransitionPlan {
  if (variant === "back") {
    return { kind: "back", variant, durationMs: 400, coverMs: 150, swapAtMs: 160, bladeAtMs: null, revealMs: 210 };
  }
  const base = { ...FORWARD_BASE, kind: "forward" as const, variant, durationMs: DURATIONS[variant] };
  if (variant === "utility") {
    return { ...base, coverMs: 180, swapAtMs: 220, bladeAtMs: null, revealMs: 240 };
  }
  if (variant === "battle") {
    // Battle holds the DUEL stamp inside the covered beat before the cut.
    return { ...base, coverMs: 300, swapAtMs: 340, bladeAtMs: 420, revealMs: 340 };
  }
  if (variant === "curtain") {
    // No blade — the deep-red slab splits vertically for a slow curtain feel.
    return { ...base, bladeAtMs: null, revealMs: 360 };
  }
  if (variant === "enroll") {
    // PACIFY stamp lands inside the hold, then the blade.
    return { ...base, coverMs: 260, swapAtMs: 300, bladeAtMs: 360, revealMs: 320 };
  }
  return base;
}

export const SFX_CUES = {
  blade: "round.cutFlash",
  stamp: "duel.stamp",
  back: "duel.flip.whoosh",
} as const;
