/* The read — the "insane difficulty" mechanic from insane difficulty plan.md.

   With a per-round probability, the brain sees the human's LOCKED card for the
   current round before committing its own, and plays the GAME-OPTIMAL reply:
   a full remaining-game solver evaluation (every future round and branch),
   not a round-greedy counter. It will shield/dump/sacrifice the current round
   whenever that wins the game — e.g. waste the human's 12 with a cheap shield
   while holding its own 12 for the ×2 climax.

   NAMING: this is the READ, not a "peek" — the game already has a peek
   mechanic (the Oracle trick / the view's `peeked` fields, the human looking
   at cards). The read is Klein looking at the human's locked card.

   Pure functions, zero I/O. The future /ai-pick read path calls bestCounter()
   when its window is live; tests verify soundness in test/sim/read.test.ts. */

import type { Card } from "@pacify/engine";
import { Solver, stepSolverState, type SolverState } from "./solver.js";

/** P(read) per round, index = round-1. R1/R7 are structurally dead rounds:
   R1 — nothing has diverged, the blind robust pick already covers every
   reply (measured 0% move-flips); R7 — one card left, no choice to inform.
   Mid-game R3–R4 is the measured value peak (see readscan.ts). */
export const READ_SCHEDULE: readonly number[] = [0, 0.5, 0.8, 0.8, 0.8, 0.5, 0];

export const readChance = (round: number): number => READ_SCHEDULE[round - 1] ?? 0;

/** The read reply: the card maximizing the FULL-GAME solver value given the
    human's locked card this round. Pass one Solver across calls so the memo
    collides between candidates (fast); defaults to hard mode (kappa=1). */
export function bestCounter(
  base: SolverState,
  theirLockedCard: Card,
  solver: Solver = new Solver({ robustness: 1 }),
): { card: Card; value: number } {
  let card = base.mine[0];
  let value = -Infinity;
  for (const c of base.mine) {
    const v = solver.value(stepSolverState(base, c, theirLockedCard));
    if (v > value) {
      value = v;
      card = c;
    }
  }
  return { card, value };
}
