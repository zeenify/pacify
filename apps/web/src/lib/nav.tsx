/* Navigation bridge — mirrors expo-router's stable module-level `router`
   singleton. react-router's useNavigate() identity shifts with router state,
   which would re-trigger effects that were written against the stable
   expo-router `router` object (deps: []). Screens import { router } from here
   and keep their original empty dependency arrays.

   Every navigation runs through the "HEIST TAKEOVER" screen transition:
   the art covers the screen → route swaps under cover → cut/split reveal.
   Exits (replace into a hub) unwind with the back shutter. Screens can hand
   the transition route-flavored content via push(to, payload) — the battle
   VS names, the story contact word, calling-card copy. */
import { useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { navKind, navScale, planFor, reducedNav, resolveVariant, stampFor, type NavPayload } from "./transition";
import type { RunningTransition } from "../components/NavTransition";

let nav: NavigateFunction | null = null;
let currentPath = "/";
let controller: { play: (plan: import("./transition").TransitionPlan) => RunningTransition } | null = null;
let playing = false;
let activeNav: { to: string; mode: "push" | "replace" } | null = null;
let pending: { to: string; mode: "push" | "replace"; payload?: NavPayload } | null = null;
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
export function setNavTransitionController(impl: typeof controller) {
  controller = impl;
}

type IonPageElement = HTMLElement & { componentOnReady?: () => Promise<void> };

function visibleIonPage(): IonPageElement | null {
  return Array.from(document.querySelectorAll<IonPageElement>("ion-router-outlet .ion-page"))
    .find((el) => !el.classList.contains("ion-page-hidden") && !el.classList.contains("ion-page-invisible")) ?? null;
}

/** Ionic mounts the next page ion-page-invisible before its navigation commit.
    The visible page + RouterBridge pathname cover both fresh pages and reused
    query-only pages. componentOnReady and two paint boundaries settle the DOM;
    one overall deadline guarantees that a slow page cannot strand the overlay. */
async function presentedPage(to: string): Promise<void> {
  if (reducedNav()) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return;
  }
  const destination = pathOf(to);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const wait = async () => {
    let page: IonPageElement | null = null;
    for (let frames = 0; frames < 90; frames++) {
      page = visibleIonPage();
      if (currentPath === destination && page) break;
      await nextFrame();
    }
    if (currentPath === destination && page) await page.componentOnReady?.().catch(() => {});
    await nextFrame();
    await nextFrame();
  };
  try {
    await Promise.race([wait(), new Promise<void>((resolve) => { timer = setTimeout(resolve, 1500 * navScale()); })]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

const pathOf = (to: string) => to.split("?")[0].replace(/\/+$/, "") || "/";

async function go(to: string, mode: "push" | "replace", payload?: NavPayload) {
  if (!nav) return;
  if (pathOf(to) === pathOf(currentPath) && mode === "push") return;
  const kind = payload?.back ? "back" : navKind(to, currentPath, mode);
  if (!controller) {
    // Transition layer not mounted yet — plain swap.
    nav(to, { replace: mode === "replace" });
    return;
  }
  // A navigation during a transition is QUEUED (last one wins), never dropped —
  // dropping made real users lose clicks when they moved during a tail.
  if (playing) {
    // Ignore a duplicate of the navigation already running (e.g. a second exit
    // click) AND a duplicate queued one. Both would replay the same transition.
    if (activeNav && pathOf(activeNav.to) === pathOf(to) && activeNav.mode === mode) return;
    if (pending && pathOf(pending.to) === pathOf(to) && pending.mode === mode) return;
    pending = { to, mode, payload };
    return;
  }
  // Fire only for a navigation that will actually play — screens gate input on
  // this, so an ignored duplicate must not make the story look "navigating".
  window.dispatchEvent(new Event("pacify:nav-start"));
  playing = true;
  activeNav = { to, mode };
  try {
    const variant = payload?.back ? "back" : resolveVariant(currentPath, to, kind);
    if (variant === null) {
      // Login flow steps (login→load→start) swap plainly — the heist belongs on
      // menu arrival, not on every hop where the only click is "start".
      nav(to, { replace: mode === "replace" });
      return;
    }
    const plan = planFor(variant);
    if (reducedNav()) {
      // Collapse to the component's reduced-motion beat shape.
      plan.durationMs = 220; plan.coveredMs = 110; plan.swapAtMs = 110;
      plan.stampAtMs = null; plan.bladeAtMs = null; plan.revealAtMs = 110; plan.revealMs = 110;
    }
    plan.stampText = stampFor(plan.variant, to) ?? undefined;
    plan.payload = payload;
    const scale = reducedNav() ? 1 : navScale();
    const started = performance.now();
    const run = controller.play(plan);
    try {
      await run.covered;
      nav(to, { replace: mode === "replace" });
      await presentedPage(to);
      // Keep the name/panel hold intact even when the page commits immediately.
      await sleep(Math.max(0, plan.bladeAtMs ?? plan.revealAtMs) * scale - (performance.now() - started));
      await run.reveal();
    } catch {
      // A route/component error must not strand a blocking overlay or the queue.
      await Promise.race([run.reveal(), sleep(2200 * scale)]);
    }
  } finally {
    playing = false;
    activeNav = null;
    if (pending) { const next = pending; pending = null; void Promise.resolve().then(() => go(next.to, next.mode, next.payload)); }
    else window.dispatchEvent(new Event("pacify:nav-settled"));
  }
}

/** Dialogue waits until the destination is uncovered before starting speech. */
export const navigationInProgress = () => playing;

export const router = {
  /** expo-router router.push equivalent — payload feeds the transition art */
  push(to: string, payload?: NavPayload) {
    void go(to, "push", payload);
  },
  /** expo-router router.replace equivalent */
  replace(to: string, payload?: NavPayload) {
    void go(to, "replace", payload);
  },
};
