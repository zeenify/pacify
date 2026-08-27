/* Belief state — what the Brain can legally deduce about the opponent's hand.
   Everything here derives ONLY from BrainView (fair info). */

import type { BrainView, Card, CardId } from "@pacify/engine";
import { CATALOGUE } from "@pacify/engine";

/** Cards the opponent could still be holding.
    catalogue − burned − myHand = opp remaining ∪ undealt (3 cards never dealt).
    Uniform belief over this pool is v0; trick-count priors come later. */
export function possibleOppCards(view: BrainView): Card[] {
  const known = new Set<CardId>();
  for (const c of view.burned) known.add(c.id);
  for (const c of view.myHand) known.add(c.id);
  return CATALOGUE.filter((c) => !known.has(c.id));
}

/** Uniform belief distribution over the possible pool. */
export function uniformBeliefs(possibles: readonly Card[]): number {
  return possibles.length > 0 ? 1 / possibles.length : 0;
}

/** Weighted belief: peeked cards are ~90% to be in opp's remaining hand (still not burned). */
export function beliefWeights(view: BrainView, possibles: readonly Card[]): Map<CardId, number> {
  const peeked = view.peeked ?? [];
  const peekedIds = new Set(peeked.filter((c) => !view.burned.some((b) => b.id === c.id)).map((c) => c.id));
  if (peekedIds.size === 0) {
    const p = uniformBeliefs(possibles);
    return new Map(possibles.map((c) => [c.id, p]));
  }
  // Klein's hand is fully injected as `peeked`, so the opponent's remaining
  // cards are KNOWN with certainty. 100% mass on peeked∩pool, 0% on the
  // undealt phantoms (they cannot be in the hand).
  const peekedInPool = possibles.filter((c) => peekedIds.has(c.id));
  const m = new Map<CardId, number>();
  if (peekedInPool.length > 0) {
    const share = 1 / peekedInPool.length;
    for (const c of peekedInPool) m.set(c.id, share);
  } else {
    const p = uniformBeliefs(possibles);
    for (const c of possibles) m.set(c.id, p);
  }
  return m;
}
