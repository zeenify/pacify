/* Navigation bridge — mirrors expo-router's stable module-level `router`
   singleton. react-router's useNavigate() identity shifts with router state,
   which would re-trigger effects that were written against the stable
   expo-router `router` object (deps: []). Screens import { router } from here
   and keep their original empty dependency arrays.

   Every navigation runs through the "Calling Card Cut" screen transition:
   slabs cover the screen → route swaps under cover → blade/split reveal.
   Exits (replace into a hub) unwind with the short back mirror. */
import { useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { EXIT_PATHS, planFor, resolveVariant, stampFor } from "./transition";
import type { RunningTransition } from "../components/NavTransition";

let nav: NavigateFunction | null = null;
let currentPath = "/";
let controller: { play: (plan: import("./transition").TransitionPlan) => RunningTransition } | null = null;
let playing = false;
let pending: { to: string; mode: "push" | "replace" } | null = null;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Mounted once inside the router (App) — keeps the bridge pointed at the
    live navigate function. Renders nothing. */
export function RouterBridge() {
  nav = useNavigate();
  const location = useLocation();
  currentPath = location.pathname;
  return null;
}

/** NavTransition mounts this to hand the bridge its overlay controller. */
export function setNavTransitionController(impl: NonNullable<typeof controller>) {
  controller = impl;
}

const pathOf = (to: string) => to.split("?")[0].replace(/\/+$/, "") || "/";
const isExit = (to: string) => EXIT_PATHS.some((p) => p === pathOf(to));

async function go(to: string, mode: "push" | "replace") {
  if (!nav) return;
  if (pathOf(to) === pathOf(currentPath) && mode === "push") return;
  const kind = mode === "push" ? "forward" : isExit(to) ? "back" : "forward";
  if (!controller) {
    // Transition layer not mounted yet (or reduced-motion bypass) — plain swap.
    nav(to, { replace: mode === "replace" });
    return;
  }
  // A navigation during a transition is QUEUED (last one wins), never dropped —
  // dropping made real users lose clicks when they moved during a tail.
  if (playing) { pending = { to, mode }; return; }
  playing = true;
  try {
    const plan = planFor(resolveVariant(currentPath, to, kind));
    plan.stampText = stampFor(plan.variant, to) ?? undefined;
    const run = controller.play(plan);
    await run.covered;
    nav(to, { replace: mode === "replace" });
    // Two frames so the new route has painted, then the designed black hold
    // before the reveal (blade/split) starts — the hold is part of the feel.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await sleep(Math.max(0, plan.revealAtMs - plan.coveredMs) + 40);
    await run.reveal();
  } finally {
    playing = false;
    if (pending) { const next = pending; pending = null; void Promise.resolve().then(() => go(next.to, next.mode)); }
  }
}

export const router = {
  /** expo-router router.push equivalent */
  push(to: string) {
    void go(to, "push");
  },
  /** expo-router router.replace equivalent */
  replace(to: string) {
    void go(to, "replace");
  },
};
