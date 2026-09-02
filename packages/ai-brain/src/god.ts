import {
  CATALOGUE,
  HAND_SIZE,
  resolveRound,
  stepRng,
  type BrainView,
  type Card,
  type CardId,
} from "@pacify/engine";
import { possibleOppCards, beliefWeights } from "./belief.js";
import { Solver, defaultRobustness, type SolverState } from "./solver.js";

const OPP_SKILL = 0.5;
const MIX_BAND = 0.02;
const MIX_TEMP = 12;

export type BrainConfig = {
  /** Human opponent-model skill (0 = uniform random, 1 = sensible). */
  skill?: number;
  /** Worst-case weight kappa (0 = pure model EV — the old brain, 1 = pure maximin). */
  robustness?: number;
};

/** A move ranked by the solver's blended (worst-case floor + model EV) value,
 *  restricted to the winning pool (within MIX_BAND of the best). This is the
 *  only set of cards a character may pick from — so personality can never
 *  weaken the brain. */
export type RankedMove = { card: Card; v: number; rank: number };

function combinations<T>(items: T[], k: number): T[][] {
  if (k <= 0) return [[]];
  if (k > items.length) return [];
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i <= items.length - (k - acc.length); i++) rec(i + 1, [...acc, items[i]]);
  };
  rec(0, []);
  return out;
}

// When the brain peeks only a subset of the opponent's hand, marginalize over
// every consistent hand (known cards + a hidden-count subset of the remaining
// catalogue). `oppTotal` is the opponent's CURRENT remaining hand size, NOT
// always HAND_SIZE — in late rounds fewer cards remain, so we must not invent
// phantom hidden cards. Sampling (when there are too many completions) uses the
// duel's own rng stream so a given view always yields the same completions.
function oppHandCompletions(
  known: Card[],
  klein: Card[],
  oppTotal: number,
  seed: number,
): { hand: Card[]; weight: number }[] {
  const need = oppTotal - known.length;
  if (need <= 0) return [{ hand: known, weight: 1 }];
  const blocked = new Set(known.map((c) => c.id));
  for (const c of klein) blocked.add(c.id);
  const candidates = CATALOGUE.filter((c) => !blocked.has(c.id));
  let subs = combinations(candidates, need);
  if (subs.length === 0) return [{ hand: known, weight: 1 }];
  // Cap sampled completions: each one costs a full deep solve. 32 keeps the
  // belief marginalization honest without blowing the per-round time budget.
  const CAP = 32;
  if (subs.length > CAP) {
    const picked: Card[][] = [];
    const seen = new Set<string>();
    let s = seed | 0;
    while (picked.length < CAP && picked.length < subs.length) {
      const [r, next] = stepRng(s);
      s = next;
      const c = subs[Math.floor(r * subs.length)];
      const key = c.map((x) => x.id).sort().join(",");
      if (!seen.has(key)) { seen.add(key); picked.push(c); }
    }
    subs = picked;
  }
  const w = 1 / subs.length;
  return subs.map((s) => ({ hand: [...known, ...s], weight: w }));
}

type EvContext = { view: BrainView };
function thisRoundDeltaOnly(card: Card, ctx: EvContext): number {
  const { view } = ctx;
  const possibles = possibleOppCards(view);
  const weights = beliefWeights(view, possibles);
  const diffBefore = view.myScore - view.oppScore;
  let ev = 0;
  for (const oppCard of possibles) {
    const w = weights.get(oppCard.id) ?? 0;
    const out = resolveRound({
      p1Card: oppCard,
      p2Card: card,
      p1Score: view.oppScore,
      p2Score: view.myScore,
      round: view.round,
      echoNext: view.echoNext,
      shieldOff: view.shieldOff,
    });
    ev += w * (out.p2Score - out.p1Score - diffBefore);
  }
  return ev;
}

export function expectedDifferential(card: Card, ctx: EvContext): number {
  return thisRoundDeltaOnly(card, ctx);
}

/** Rank the brain's legal moves by solver value and return only the winning
 *  pool (moves within MIX_BAND of the best). The personality layer (LLM picker)
 *  chooses from this list, so it can never select a move that loses value.
 *
 *  Full vision (view.oppHand present) solves the exact remaining game per move:
 *  a worst-case floor (maximin over every reply they could lock) blended with
 *  the expectation under the human model. Partial vision marginalizes the same
 *  solve over consistent completions of their hidden cards. */
export function rankMoves(view: BrainView, config?: BrainConfig): RankedMove[] {
  const skill = config?.skill ?? OPP_SKILL;
  const robustness = config?.robustness ?? defaultRobustness(skill);

  const burnedIds = new Set((view.burned ?? []).map((c) => c.id));
  const known = ((view.peeked ?? []) as Card[]).filter((c) => !burnedIds.has(c.id));

  // Full vision short-circuit: their remaining hand is exact, no marginalization.
  // Otherwise marginalize over completions sized to their CURRENT hand
  // (7 cards minus one per completed round — both seats burn one card each).
  const completions =
    view.oppHand && view.oppHand.length > 0
      ? [{ hand: view.oppHand.filter((c) => !burnedIds.has(c.id)), weight: 1 }]
      : (() => {
          const roundsPlayed = Math.floor((view.burned?.length ?? 0) / 2);
          const oppRemaining = Math.max(0, HAND_SIZE - roundsPlayed);
          return oppHandCompletions(known, view.myHand, oppRemaining, view.rngState ?? 0);
        })();

  // One solver per call: memo keys (card bitsets) are catalogue-global, so the
  // same instance safely shares states across completions and future rounds.
  const solver = new Solver({ skill, robustness });
  const acc = new Map<CardId, number>();
  for (const { hand, weight } of completions) {
    if (hand.length === 0) continue;
    const root: SolverState = {
      round: view.round,
      mine: view.myHand,
      theirs: hand,
      myScore: view.myScore,
      theirScore: view.oppScore,
      echoNext: view.echoNext,
      shieldOff: view.shieldOff,
    };
    for (const cv of solver.cardValues(root)) {
      acc.set(cv.card.id, (acc.get(cv.card.id) ?? 0) + weight * cv.v);
    }
  }

  const scored = view.myHand.map((kc) => ({ kc, v: acc.get(kc.id) ?? 0 }));
  if (scored.length === 0) return [];
  scored.sort((a, b) => b.v - a.v);
  const best = scored[0].v;
  const pool = scored.filter((x) => x.v >= best - MIX_BAND);
  return pool.map((x, i) => ({ card: x.kc, v: x.v, rank: i + 1 }));
}

/** Deterministic best pick, or a seeded draw among the winning pool when
 *  mix=true. The draw is powered by the duel's own rng state (read-only), so
 *  the same view always produces the same pick. For personality flavour,
 *  callers should use rankMoves() and let the LLM picker choose. */
export function chooseGodCard(view: BrainView, mix = true, config?: BrainConfig): Card {
  const pool = rankMoves(view, config);
  if (pool.length === 0) throw new Error("chooseGodCard: no legal moves");
  if (!mix || pool.length === 1) return pool[0].card;
  const weights = pool.map((x) => Math.exp(x.v * MIX_TEMP));
  const tot = weights.reduce((a, b) => a + b, 0);
  const [r] = stepRng(((view.rngState ?? 0) ^ Math.imul(view.round, 0x9e3779b1)) | 0);
  let acc = r * tot;
  for (let i = 0; i < pool.length; i++) {
    acc -= weights[i];
    if (acc <= 0) return pool[i].card;
  }
  return pool[pool.length - 1].card;
}
