/* Dealing — 5+5 singleton hands from seeded shuffles.
   Rejection-sampled: shuffle → split 5/5 → retry if either hand breaks the
   trick cap. Every accepted deal is a uniform, SEAT-SYMMETRIC split
   (the old single-pass deal gave p2 +0.2 tricks/deal — measurable bias).
   Singleton rule (SPEC.md §2.1): no duplicate card across BOTH hands. */

import type { Card } from "./types.js";
import { HAND_SIZE, MAX_TRICKS_PER_HAND } from "./types.js";
import { isTrick } from "./cards.js";
import { shuffled } from "./rng.js";

export type DealtHands = { p1Hand: Card[]; p2Hand: Card[] };

function tryDeal(pool: readonly Card[]): DealtHands | null {
  const p1Hand = pool.slice(0, HAND_SIZE);
  const p2Hand = pool.slice(HAND_SIZE, HAND_SIZE * 2);
  for (const hand of [p1Hand, p2Hand]) {
    if (hand.filter(isTrick).length > MAX_TRICKS_PER_HAND) return null;
  }
  return { p1Hand, p2Hand };
}

export function dealHands(catalogue: readonly Card[], rngState: number): [DealtHands, number] {
  let state = rngState;
  for (let attempt = 0; attempt < 64; attempt++) {
    const [pool, next] = shuffled(catalogue, state);
    const deal = tryDeal(pool);
    if (deal) return [deal, next];
    state = next;
  }
  throw new Error("deal failed: could not satisfy trick caps");
}
