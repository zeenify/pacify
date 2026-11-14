/* "The Calling Card" v2 screen transitions (design: smart-agent art direction,
   choreography verified beat-by-beat in a standalone prototype). One overlay
   div mounted above the router; ALL content and animation classes are managed
   imperatively (React renders only the empty host) so CSS animations keyed to
   .playing/.playingBack are never disturbed by re-renders. The nav module calls
   play(plan) and gets:
     covered — resolves when the card fully covers the screen (route swaps here)
     reveal() — plays the blade/split tail, resolves when the overlay is gone.
   The split clones the covered card into two clipped halves that fall away
   along the blade line. Back = "Return to Deck": black card pocketed into the
   corner with red chevrons. Reduced motion collapses everything to a fade. */
import { useEffect, useRef } from "react";
import { play } from "../lib/sfx";
import { setNavTransitionController } from "../lib/nav";
import { SFX_CUES, type TransitionPlan } from "../lib/transition";

export type RunningTransition = {
  covered: Promise<void>;
  reveal: () => Promise<void>;
};
export type NavTransitionController = {
  play: (plan: TransitionPlan) => RunningTransition;
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function NavTransition() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNavTransitionController({
      play(p: TransitionPlan): RunningTransition {
        const host = hostRef.current;
        if (!host) { const done = Promise.resolve(); return { covered: done, reveal: () => done }; }
        const usePlan = reducedMotion()
          ? { ...p, durationMs: 220, coveredMs: 110, swapAtMs: 110, stampAtMs: null, bladeAtMs: null, revealAtMs: 110, revealMs: 110 }
          : (() => {
              // QA hook: window.__navScale = N stretches every beat N× for frame capture
              const scale = Number((window as unknown as { __navScale?: number }).__navScale ?? 1);
              const s = (ms: number) => ms * scale;
              return { ...p, durationMs: s(p.durationMs), coveredMs: s(p.coveredMs), swapAtMs: s(p.swapAtMs), stampAtMs: p.stampAtMs === null ? null : s(p.stampAtMs), bladeAtMs: p.bladeAtMs === null ? null : s(p.bladeAtMs), revealAtMs: s(p.revealAtMs), revealMs: s(p.revealMs) };
            })();
        let coverResolve!: () => void;
        let revealResolve!: () => void;
        const covered = new Promise<void>((r) => { coverResolve = r; });
        const revealed = new Promise<void>((r) => { revealResolve = r; });
        const timers: ReturnType<typeof setTimeout>[] = [];
        const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
        const stamp = usePlan.stampAtMs !== null ? (usePlan.stampText ?? "PACIFY") : null;

        host.style.setProperty("--fwd", `${usePlan.durationMs}ms`);
        if (usePlan.variant === "back") {
          host.innerHTML = `
            <div class="nv-back ghost" style="z-index:2"><div class="face"></div></div>
            <div class="nv-back" style="z-index:3"><div class="face"></div></div>
            <div class="nv-chev c1" style="z-index:4"></div><div class="nv-chev c2" style="z-index:4"></div><div class="nv-chev c3" style="z-index:4"></div>`;
        } else {
          host.innerHTML = `
            <div class="nv-lines" style="z-index:1"></div>
            <div class="nv-vig top" style="z-index:1"></div><div class="nv-vig bot" style="z-index:1"></div>
            <div class="nv-card shadow" style="left:-32vw;top:-32vh;z-index:1"><div class="face"></div></div>
            <div class="nv-card main${usePlan.variant === "battle" ? " battle" : ""}${usePlan.variant === "curtain" ? " curtain" : ""}" style="left:-32vw;top:-32vh;z-index:3"><div class="face"></div></div>
            ${stamp ? `<div class="nv-stamp" style="z-index:4">${stamp}</div>` : ""}
            <div class="nv-ring" style="z-index:4"></div>
            ${usePlan.bladeAtMs !== null ? `<div class="nv-blade" style="z-index:5"></div><div class="nv-flash" style="z-index:5"></div>` : ""}`;
        }
        void host.offsetWidth; // force reflow so the play class starts animations deterministically
        host.classList.add(usePlan.variant === "back" ? "playingBack" : "playing");
        host.style.display = "block";

        at(usePlan.coveredMs, () => { coverResolve(); });
        // beat sounds: stamp lands during the hold, blade at the slash, swish on back cover
        if (usePlan.stampAtMs !== null) at(usePlan.stampAtMs, () => play(SFX_CUES.stamp, { gain: 0.8 }));
        if (usePlan.bladeAtMs !== null) at(usePlan.bladeAtMs, () => play(SFX_CUES.blade, { gain: 0.9 }));
        if (usePlan.variant === "back") at(0, () => play(SFX_CUES.back, { gain: 0.7 }));

        return {
          covered,
          reveal: () => {
            // THE SPLIT — clone the covered card into two clipped halves that fall
            // away along the blade line, from the card's exact current transform.
            const card = host.querySelector(".nv-card.main") as HTMLElement | null;
            if (card && !reducedMotion()) {
              const transform = getComputedStyle(card).transform;
              for (const clip of ["inset(0 0 50% 0)", "inset(50% 0 0 0)"]) {
                const half = card.cloneNode(true) as HTMLElement;
                half.style.transform = transform;
                half.style.clipPath = clip;
                half.style.animation = "none";
                half.style.transition = `transform ${usePlan.revealMs}ms cubic-bezier(0.55,0,1,0.45), opacity ${usePlan.revealMs}ms linear`;
                host.appendChild(half);
                requestAnimationFrame(() => {
                  half.style.transform = (clip === "inset(0 0 50% 0)"
                    ? "translate(-8%, -120%) rotate(-5deg) scale(1.03)"
                    : "translate(8%, 120%) rotate(4deg) scale(1.03)");
                  half.style.opacity = "0";
                });
              }
              card.style.display = "none";
              const shadow = host.querySelector(".nv-card.shadow") as HTMLElement | null;
              if (shadow) shadow.style.opacity = "0";
              const page = document.querySelector("ion-app");
              if (page) {
                page.classList.add("navt-settle");
                at(usePlan.revealMs, () => page.classList.remove("navt-settle"));
              }
            }
            at(usePlan.revealMs, () => {
              host.className = "navt";
              host.style.display = "none";
              host.innerHTML = "";
              host.style.removeProperty("--fwd");
              timers.forEach(clearTimeout);
              revealResolve();
            });
            return revealed;
          },
        };
      },
    });
  }, []);

  return <div ref={hostRef} className="navt" style={{ display: "none" }} />;
}
