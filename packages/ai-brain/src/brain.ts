/* The Brain — picks the AI's card. Deterministic given (view, policy).
   Pipeline: legal cards → EV in score-differential → personality weights
   → ε-greedy pick. Never sees the opponent's hand (BrainView wall). */

import type { BrainView, Card } from "@pacify/engine";
import { brainRoll } from "./ev.js";
import { expectedDifferential } from "./ev.js";
import { trickWeight, type StudentPolicy } from "./policy.js";

export type CardScore = { card: Card; ev: number; weighted: number };

/** Score every legal card (debug/telemetry-friendly — UI could show "thinking"). */
export function rankCards(view: BrainView, policy: StudentPolicy): CardScore[] {
  return view.myHand
    .map((card) => {
      const ev = expectedDifferential(card, { view });
      return { card, ev, weighted: ev * trickWeight(policy, card.id) };
    })
    .sort((a, b) => b.weighted - a.weighted);
}

/** The one call the duel loop makes each round. */
export function chooseAiCard(view: BrainView, policy: StudentPolicy): Card {
  const ranked = rankCards(view, policy);
  if (ranked.length === 0) throw new Error("brain: no legal cards");

  // ε-greedy personality noise — deterministic per state (replay-safe).
  if (brainRoll(view) < policy.epsilon) {
    const i = Math.floor(brainRoll({ ...view, rngState: view.rngState + 0x5bf03635 }) * ranked.length);
    return ranked[i].card;
  }
  return ranked[0].card;
}
