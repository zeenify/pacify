/* "Calling Card Cut" screen transitions (design: docs/superpowers + smart-agent art direction).
   One overlay mounted above the router. The nav module calls play(plan) and gets:
     covered — resolves when the slabs fully hide the screen (route swaps here)
     reveal() — plays the blade/split reveal, resolves when the overlay is gone.
   Presentational only: variant resolution and beat timings live in lib/transition. */
import { useEffect, useState } from "react";
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

type Phase = "idle" | "cover" | "hold" | "reveal";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function NavTransition() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [plan, setPlan] = useState<TransitionPlan | null>(null);

  useEffect(() => {
    setNavTransitionController({
      play(p: TransitionPlan): RunningTransition {
        // __navSlow = true stretches every beat 3x — a QA hook for frame-by-frame
        // capture of the choreography (screenshots are slower than the phases).
        const slow = (window as unknown as { __navSlow?: boolean }).__navSlow === true;
        const scale = slow ? 3 : 1;
        const usePlan = reducedMotion()
          ? { ...p, durationMs: 220, coverMs: 110, swapAtMs: 110, bladeAtMs: null, revealMs: 110 }
          : {
              ...p,
              durationMs: p.durationMs * scale,
              coverMs: p.coverMs * scale,
              swapAtMs: p.swapAtMs * scale,
              bladeAtMs: p.bladeAtMs === null ? null : p.bladeAtMs * scale,
              revealMs: p.revealMs * scale,
            };
        let coverResolve!: () => void;
        let revealResolve!: () => void;
        const covered = new Promise<void>((r) => { coverResolve = r; });
        const revealed = new Promise<void>((r) => { revealResolve = r; });
        const timers: ReturnType<typeof setTimeout>[] = [];
        const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

        setPlan(usePlan);
        setPhase("cover");
        at(usePlan.coverMs, () => { coverResolve(); setPhase("hold"); });
        return {
          covered,
          reveal: () => {
            setPhase("reveal");
            at(usePlan.revealMs, () => {
              setPhase("idle");
              setPlan(null);
              timers.forEach(clearTimeout);
              revealResolve();
            });
            return revealed;
          },
        };
      },
    });
  }, []);

  // Beat sounds: blade cut, battle/enroll stamp, back swish. Blade/stamp beats
  // are relative to the covered hold, so they are scheduled from there.
  useEffect(() => {
    if (phase === "hold" && plan) {
      if (plan.bladeAtMs !== null) setTimeout(() => play(SFX_CUES.blade, { gain: 0.9 }), Math.max(0, plan.bladeAtMs - plan.coverMs));
      if (plan.variant === "battle" || plan.variant === "enroll") setTimeout(() => play(SFX_CUES.stamp, { gain: 0.8 }), Math.max(0, plan.swapAtMs - plan.coverMs));
    }
    if (phase === "cover" && plan?.variant === "back") play(SFX_CUES.back, { gain: 0.7 });
  }, [phase, plan]);

  if (phase === "idle" || !plan) return null;
  const variant = plan.variant;
  const stampText = variant === "battle" ? "DUEL" : variant === "enroll" ? "PACIFY" : null;
  return (
    <div className={`navt ${phase}`} data-variant={variant}>
      {variant === "back" ? (
        <div className="navt-slab navt-back-slab" />
      ) : variant === "curtain" ? (
        <>
          <div className="navt-curtain-top" />
          <div className="navt-curtain-bottom" />
        </>
      ) : (
        <>
          <div className="navt-slab navt-red" />
          <div className="navt-slab navt-black" />
          {variant === "battle" && <div className="navt-lines" />}
          {stampText && phase !== "cover" && <div className={`navt-stamp ${variant}`}>{stampText}</div>}
          {plan.bladeAtMs !== null && (phase === "hold" || phase === "reveal") && <div className="navt-blade" />}
        </>
      )}
    </div>
  );
}
