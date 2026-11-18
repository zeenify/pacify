/* Screen-transition choreography and route-derived content.
   The covered entrance runs from the plan's absolute beat anchors. The receiving
   reveal starts only after the destination commits beneath the cover.

   Default/curtain (1400ms): lock-on, slab marquee avalanche, cover at 460,
   scrolling hold, cut at 900, then a 380ms diagonal split. Battle (1800ms) keeps
   its longer face-off; compact utility routes take 1000ms and the back shutter
   (menu exits only) takes 750ms. The login flow steps swap plainly — the heist
   belongs on menu arrival. One artwork composition supplies the hold; lightweight
   covers handle the split.

   `window.__navScale = N` stretches animation, timers and sound offsets N× for
   frame-by-frame QA capture. */

export type TransitionKind = "forward" | "back";
export type TransitionVariant =
  | "default"     // full HEIST TAKEOVER, destination word in the slab marquee
  | "utility"     // compact heist (options/howto/sfx-test)
  | "battle"      // VERSUS SLAM panels + DUEL stamp
  | "curtain"     // heist tuned for entering a story (contact word)
  | "back";       // SHUTTER RETREAT, 750ms — menu exits only

/** Route-flavored content a screen can hand the transition before navigating
 *  (router.push(to, payload)). Everything falls back to derived defaults. */
export type NavPayload = {
  word?: string;      // slab marquee repeats (e.g. "KLEIN")
  vs?: { ln: string; lt?: string; rn: string; rt?: string }; // battle panels
  /** opt in to the SHUTTER RETREAT on a replace (e.g. leaving a refusal scene) —
   *  without it, exits into a hub other than /menu resolve to the full heist. */
  back?: boolean;
};

export type TransitionPlan = {
  kind: TransitionKind;
  variant: TransitionVariant;
  tier: "full" | "compact";
  durationMs: number;
  coveredMs: number;      // card fully covers the screen — route swaps here
  swapAtMs: number;       // = coveredMs (kept for callers)
  stampAtMs: number | null;   // cover impact (SFX)
  bladeAtMs: number | null;   // the diagonal cut draws (null on battle/back)
  revealAtMs: number;     // split begins after page presentation, at this elapsed anchor
  revealMs: number;       // split → teardown duration
  stampText?: string;     // destination label (marquee word fallback)
  payload?: NavPayload;
};

const UTILITY_PATHS = ["/options", "/howto", "/sfx-test"];
const LOGIN_STEPS = ["/login", "/load", "/start"];
const pathOf = (p: string) => p.split("?")[0].replace(/\/+$/, "") || "/";
/** Hub screens a player "leaves" — the nav layer maps replace() into these to
 *  kind "back"; the resolver only plays the shutter when the exit lands on menu. */
export const EXIT_PATHS = ["/campaign", "/menu", "/login", "/"];

/** Resolve which variant a navigation needs. `from`/`to` are pathnames
 *  (query strings tolerated). Returns null for plain swaps — currently the
 *  login→load→start steps, which should not spend a heist on each hop. */
export function resolveVariant(from: string, to: string, kind: TransitionKind): TransitionVariant | null {
  const a = from.split("?")[0].replace(/\/+$/, "") || "/";
  const b = to.split("?")[0].replace(/\/+$/, "") || "/";
  if (kind === "back" && b === "/menu") return "back"; // menu exit buttons
  if (a.startsWith("/story") && b.startsWith("/duel")) return "battle";
  if (b.startsWith("/story") || b.startsWith("/tutorial")) return "curtain";
  if (LOGIN_STEPS.some((p) => a.startsWith(p))) {
    if (LOGIN_STEPS.some((p) => b.startsWith(p))) return null; // plain swap between steps
    if (b === "/menu") return "default"; // the heist plays on menu arrival
  }
  if (UTILITY_PATHS.some((p) => b.startsWith(p)) || UTILITY_PATHS.some((p) => a.startsWith(p))) return "utility";
  return "default";
}

/** Replace-navigations into hub paths unwind with kind "back" — except from the
    login flow, where start→menu is an arrival to celebrate, not an exit. */
export function navKind(to: string, from: string, mode: "push" | "replace"): TransitionKind {
  if (mode === "push") return "forward";
  if (EXIT_PATHS.includes(pathOf(to)) && !LOGIN_STEPS.some((p) => pathOf(from) === p)) return "back";
  return "forward";
}

/** The destination label each variant carries — feeds the slab marquee word. */export function stampFor(variant: TransitionVariant, to: string): string | null {
  if (variant === "battle") return "DUEL";
  if (variant === "default" || variant === "curtain" || variant === "utility") {
    const path = to.split("?")[0];
    if (path.startsWith("/campaign")) return "THE THIRTEEN";
    if (path.startsWith("/menu")) return "PACIFY";
    if (path.startsWith("/dossier")) return "DOSSIER";
    if (path.startsWith("/profile")) return "PROFILE";
    if (path.startsWith("/options")) return "OPTIONS";
    if (path.startsWith("/howto")) return "HOW TO";
    if (path.startsWith("/story")) return "STORY";
    if (path.startsWith("/tutorial")) return "ORIENTATION";
    return "PACIFY";
  }
  return null; // back carries no word
}

/** The marquee word: payload wins, then the derived label. */
export function wordFor(plan: Pick<TransitionPlan, "variant" | "stampText" | "payload">): string {
  const w = plan.payload?.word ?? plan.stampText ?? "PACIFY";
  return w.toUpperCase().slice(0, 12);
}

/** Slab-avalanche marquee texts — compact tiers skip two decorative bands. */
export function slabsFor(word: string, tier: TransitionPlan["tier"] = "full"): string[] {
  const w = `${word} `;
  const rep = (s: string, n: number) => Array(n).fill(s).join("").trim();
  return [
    rep("TAKE YOUR HEART / ", 4),
    rep("NEXT TARGET ", 6),
    "7 ROUNDS · 19 CARDS · ONE WINNER · 7 ROUNDS · 19 CARDS · ONE WINNER",
    rep(w, 9).trim(),
    ...(tier === "full" ? [rep("NO SHIELD · NO MERCY ", 4), rep("TAKE YOUR HEART / ", 4)] : []),
  ];
}

const PLANS: Record<TransitionVariant, Omit<TransitionPlan, "kind" | "variant" | "stampText" | "payload">> = {
  default: { tier: "full",    durationMs: 1400, coveredMs: 460, swapAtMs: 460, stampAtMs: 460, bladeAtMs: 900, revealAtMs: 1020, revealMs: 380 },
  curtain: { tier: "full",    durationMs: 1400, coveredMs: 460, swapAtMs: 460, stampAtMs: 460, bladeAtMs: 900, revealAtMs: 1020, revealMs: 380 },
  battle:  { tier: "full",    durationMs: 1800, coveredMs: 380, swapAtMs: 380, stampAtMs: 380, bladeAtMs: null, revealAtMs: 990, revealMs: 810 },
  utility: { tier: "compact", durationMs: 1000, coveredMs: 310, swapAtMs: 310, stampAtMs: 310, bladeAtMs: 600, revealAtMs: 680,  revealMs: 320 },
  back:    { tier: "full",    durationMs: 750,  coveredMs: 250, swapAtMs: 250, stampAtMs: null, bladeAtMs: null, revealAtMs: 330,  revealMs: 420 },
};

import type { CueEventLike } from "./sfx";

// Kept at the bottom with the rest of the route-independent beat vocabulary.


export type TransitionCues = {
  entrance: readonly CueEventLike[];
  reveal: readonly CueEventLike[];
};

/** Both animation and sound use these same impact/hold beats. The receiving
    timeline is deliberately offset from the presentation commit, not plan setup. */
export function transitionCues(plan: TransitionPlan): TransitionCues {
  if (plan.variant === "back") {
    return {
      entrance: [{ cue: SFX_CUES.back, at: 0, gain: 0.5, pitch: 1 }],
      reveal: [{ cue: SFX_CUES.reveal, at: 0, gain: 0.35, pitch: 1 }],
    };
  }
  const C = plan.coveredMs;
  const B = plan.bladeAtMs;
  return {
    entrance: [
      { cue: SFX_CUES.entrance, at: 0, gain: 0.3, pitch: 1 },
      ...(plan.stampAtMs !== null ? [{ cue: SFX_CUES.stamp, at: C, gain: 0.62, pitch: 1 }] : []),
    ],
    reveal: [
      ...(B !== null ? [{ cue: SFX_CUES.blade, at: 0, gain: 0.5, pitch: 1 }] : []),
      { cue: SFX_CUES.reveal, at: B === null ? 0 : plan.revealAtMs - B, gain: 0.48, pitch: 1 },
      ...(B === null && plan.variant === "battle" ? [{ cue: SFX_CUES.stamp, at: 60, gain: 0.6, pitch: 0.95 }] : []),
    ],
  };
}

/** Beat plan for a resolved variant. */
export function planFor(variant: TransitionVariant): TransitionPlan {
  return { kind: variant === "back" ? "back" : "forward", variant, ...PLANS[variant] };
}

/** QA slow-mo hook — stretches WAAPI, timers, and audio offsets by N. */
export function navScale(): number {
  return Math.max(0.1, Number((globalThis as unknown as { __navScale?: number }).__navScale) || 1);
}

export const reducedNav = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export const SFX_CUES = {
  entrance: "duel.flip.whoosh",
  blade: "round.cutFlash",
  reveal: "round.split",
  stamp: "duel.stamp",
  back: "duel.flip.whoosh",
} as const;
