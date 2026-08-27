/* Expected-value core.
     value(card) = Δ(score differential) this round
                 + FUTURE potential of the remaining hand (full-depth, memoized)

   The full-depth future term is NOT optional: this game doubles R5 points, so
   greedy 1-ply play strip-mines big cards early and arrives at R5 with scraps —
   a *cheating oracle* with perfect information loses to random that way
   (measured 28% winrate). Saving power for R5 is the dominant strategy
   (SPEC.md §3.1: "holds tricks for Round 5 ×2"). */

import type { BrainView, Card } from "@pacify/engine";
import { resolveRound, stepRng, TOTAL_ROUNDS } from "@pacify/engine";
import { beliefWeights, possibleOppCards } from "./belief.js";

export type EvContext = {
  view: BrainView;
};

/** Expected Δ(score differential) this round if I (p2) commit `card`. */
export function thisRoundDelta(card: Card, ctx: EvContext): number {
  const { view } = ctx;
  const possibles = possibleOppCards(view);
  if (possibles.length === 0) return 0;
  const weights = beliefWeights(view, possibles);

  const diffBefore = view.myScore - view.oppScore;
  let ev = 0;
  for (const oppCard of possibles) {
    const out = resolveRound({
      p1Card: oppCard,
      p2Card: card,
      p1Score: view.oppScore,
      p2Score: view.myScore,
      round: view.round,
      echoNext: view.echoNext,
      shieldOff: view.shieldOff,
    });
    ev += (weights.get(oppCard.id) ?? 0) * (out.p2Score - out.p1Score - diffBefore);
  }
  return ev;
}

// ---------- full-depth future potential (memoized) ----------

const memo = new Map<string, number>();
const MEMO_LIMIT = 2_000_000;

function handKey(hand: readonly Card[]): string {
  return hand
    .map((c) => c.id)
    .sort()
    .join(",");
}

/** Best expected Δ over the ENTIRE remaining game, assuming the opponent
    plays from `pool` (chance nodes) and both hands shrink each round.
    Scores assumed 0-0 (Reversal's future swap ≈ neutral — fine for ranking).
    When `peeked` is non-empty, those cards are weighted 90% (see beliefWeights). */
export function futurePotential(
  myHand: readonly Card[],
  pool: readonly Card[],
  round: number,
  echoNext: boolean,
  peeked: readonly Card[] = [],
  shieldOff = 0,
): number {
  if (round > TOTAL_ROUNDS || myHand.length === 0 || pool.length === 0) return 0;

  const peekKey = peeked.map((c) => c.id).sort().join(",");
  const key = `${round}|${handKey(myHand)}|${handKey(pool)}|${echoNext ? 1 : 0}|${peekKey}|${shieldOff}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;

  // Weight the pool by peeked knowledge.
  const peekedIds = new Set(peeked.map((c) => c.id));
  const peekedInPool = pool.filter((c) => peekedIds.has(c.id));
  const other = pool.filter((c) => !peekedIds.has(c.id));
  const useWeighted = peekedInPool.length > 0;
  const peekShare = useWeighted && peekedInPool.length > 0 ? 0.9 / peekedInPool.length : 0;
  const otherShare = useWeighted ? (other.length > 0 ? 0.1 / other.length : 0) : 1 / pool.length;

  let best = -Infinity;
  for (const mine of myHand) {
    const rest = myHand.filter((c) => c.id !== mine.id);
    let ev = 0;
    for (const opp of pool) {
      const w = peekedIds.has(opp.id) ? peekShare : useWeighted ? otherShare : 1 / pool.length;
      const out = resolveRound({
        p1Card: opp,
        p2Card: mine,
        p1Score: 0,
        p2Score: 0,
        round,
        echoNext,
        shieldOff,
      });
      const poolAfter = pool.filter((c) => c.id !== opp.id);
      const peekedAfter = peeked.filter((c) => c.id !== opp.id);
      ev += w * ((out.p2Score - out.p1Score) + futurePotential(rest, poolAfter, round + 1, out.echoNext, peekedAfter, out.shieldOffAfter));
    }
    if (ev > best) best = ev;
  }

  if (memo.size > MEMO_LIMIT) memo.clear();
  memo.set(key, best);
  return best;
}

/** Full card value: this round + full-depth future of the remaining hand. */
export function expectedDifferential(card: Card, ctx: EvContext): number {
  const { view } = ctx;
  const possibles = possibleOppCards(view);

  let value = thisRoundDelta(card, ctx);

  if (view.round < TOTAL_ROUNDS && possibles.length > 0) {
    const handAfter = view.myHand.filter((c) => c.id !== card.id);
    const echoAfter = view.echoNext || card.name === "Echo";
    value += futurePotential(handAfter, possibles, view.round + 1, echoAfter, view.peeked ?? [], view.shieldOff);
  }

  // Oracle: information is worth a small flat bonus in v0.
  if (card.name === "Oracle") value += ORACLE_INFO_BONUS;

  return value;
}

export const ORACLE_INFO_BONUS = 0.35;

/** Deterministic ε-noise source derived from the duel state (replay-safe). */
export function brainRoll(view: BrainView): number {
  const [r] = stepRng(view.rngState ^ (view.round * 0x9e3779b9));
  return r;
}
