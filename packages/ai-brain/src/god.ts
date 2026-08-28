import { CATALOGUE, HAND_SIZE, resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, type BrainView, type Card } from "@pacify/engine";
import { possibleOppCards, beliefWeights } from "./belief.js";

const OPP_SKILL = 0.5;
const STRAT_TEMP = 1.5;
const MIX_BAND = 0.02;
const MIX_TEMP = 12;

/** Opponent-model skill, overridable per character via BrainConfig.skill. */
let oppSkill = OPP_SKILL;

export type BrainConfig = {
  /** Human opponent-model skill (0 = uniform random, 1 = sensible). */
  skill?: number;
};

/** A move ranked by the god AI's win-probability search, restricted to the winning pool
 *  (within MIX_BAND of the best). This is the only set of cards a character may pick from —
 *  so personality can never weaken the brain. */
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

// When the brain peeks only a subset of the opponent's hand, marginalize over every
// consistent full hand (known cards + a hidden-count subset of the remaining catalogue).
// Full vision (peeked = whole hand) returns a single completion -> identical to the
// original exact search, so Klein's verified behaviour is unchanged.
function oppHandCompletions(known: Card[], klein: Card[]): { hand: Card[]; weight: number }[] {
  const need = HAND_SIZE - known.length;
  if (need <= 0) return [{ hand: known, weight: 1 }];
  const blocked = new Set(known.map((c) => c.id));
  for (const c of klein) blocked.add(c.id);
  const candidates = CATALOGUE.filter((c) => !blocked.has(c.id));
  let subs = combinations(candidates, need);
  if (subs.length === 0) return [{ hand: known, weight: 1 }];
  if (subs.length > 200) {
    const picked: Card[][] = [];
    const seen = new Set<string>();
    while (picked.length < 200 && picked.length < subs.length) {
      const c = subs[Math.floor(Math.random() * subs.length)];
      const key = c.map((x) => x.id).sort().join(",");
      if (!seen.has(key)) { seen.add(key); picked.push(c); }
    }
    subs = picked;
  }
  const w = 1 / subs.length;
  return subs.map((s) => ({ hand: [...known, ...s], weight: w }));
}

type State = {
  round: number;
  klein: Card[];
  opp: Card[];
  kScore: number;
  oScore: number;
  echoNext: boolean;
  shieldOff: number;
};

function outcome(k: number, o: number): number {
  if (k >= SCORE_THRESHOLD && k > o) return 1;
  if (o >= SCORE_THRESHOLD && o > k) return 0;
  if (k > o) return 1;
  if (k < o) return 0;
  return 0.5;
}
function terminal(s: State): boolean {
  return s.round > TOTAL_ROUNDS || s.kScore >= SCORE_THRESHOLD || s.oScore >= SCORE_THRESHOLD;
}
function nextState(s: State, kc: Card, oc: Card): State {
  const out = resolveRound({
    p1Card: oc, p2Card: kc,
    p1Score: s.oScore, p2Score: s.kScore,
    round: s.round, echoNext: s.echoNext, shieldOff: s.shieldOff,
  });
  return {
    round: s.round + 1,
    klein: s.klein.filter((c) => c.id !== kc.id),
    opp: s.opp.filter((c) => c.id !== oc.id),
    kScore: out.p2Score, oScore: out.p1Score,
    echoNext: out.echoNext, shieldOff: out.shieldOffAfter,
  };
}

const memo = new Map<string, number>();
const stratMemo = new Map<string, Map<Card, number>>();
function key(s: State): string {
  return [
    s.round, s.kScore, s.oScore, s.echoNext ? 1 : 0, s.shieldOff,
    s.klein.map((c) => c.id).sort().join(","),
    s.opp.map((c) => c.id).sort().join(","),
  ].join("|");
}

// Non-reactive human strategy: the human picks WITHOUT seeing Klein's card
// (simultaneous game). Blend uniform (random) with a "sensible" softmax over
// each card's expected own gain. This never grants the human a reaction.
function getStrategy(s: State): Map<Card, number> {
  const k = key(s);
  const hit = stratMemo.get(k);
  if (hit) return hit;
  const vals = s.opp.map((oc) => {
    let tot = 0;
    for (const kc of s.klein) {
      const out = resolveRound({
        p1Card: oc, p2Card: kc,
        p1Score: s.oScore, p2Score: s.kScore,
        round: s.round, echoNext: s.echoNext, shieldOff: s.shieldOff,
      });
      tot += out.p1Score - s.oScore;
    }
    return tot / s.klein.length;
  });
  const maxV = Math.max(...vals);
  const sw = vals.map((v) => Math.exp((v - maxV) * STRAT_TEMP));
  const sumSw = sw.reduce((a, b) => a + b, 0);
  const dist = new Map<Card, number>();
  s.opp.forEach((oc, i) => {
    const uniform = 1 / s.opp.length;
    const sensible = sw[i] / sumSw;
    dist.set(oc, (1 - oppSkill) * uniform + oppSkill * sensible);
  });
  stratMemo.set(k, dist);
  return dist;
}

function kleinBest(s: State): number {
  if (terminal(s)) return outcome(s.kScore, s.oScore);
  const k = key(s);
  const hit = memo.get(k);
  if (hit !== undefined) return hit;
  const strat = getStrategy(s);
  let best = -Infinity;
  for (const kc of s.klein) best = Math.max(best, humanMove(s, kc, strat));
  memo.set(k, best);
  return best;
}

function humanMove(s: State, kc: Card, strat: Map<Card, number>): number {
  let ev = 0;
  for (const oc of s.opp) ev += (strat.get(oc) ?? 0) * kleinBest(nextState(s, kc, oc));
  return ev;
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
      p1Card: oppCard, p2Card: card,
      p1Score: view.oppScore, p2Score: view.myScore,
      round: view.round, echoNext: view.echoNext, shieldOff: view.shieldOff,
    });
    ev += w * (out.p2Score - out.p1Score - diffBefore);
  }
  return ev;
}

export function expectedDifferential(card: Card, ctx: EvContext): number {
  return thisRoundDeltaOnly(card, ctx);
}

/** Rank Klein's legal moves by win probability and return only the winning pool
 *  (moves within MIX_BAND of the best). The personality layer (LLM picker) chooses
 *  from this list, so it can never select a move that loses win probability. */
export function rankMoves(view: BrainView, config?: BrainConfig): RankedMove[] {
  oppSkill = config?.skill ?? OPP_SKILL;
  const burnedIds = new Set((view.burned ?? []).map((c) => c.id));
  const known = ((view.peeked ?? []) as Card[]).filter((c) => !burnedIds.has(c.id));

  // Marginalize over consistent opponent hands when only a subset is peeked.
  const completions = oppHandCompletions(known, view.myHand);

  const acc = new Map<string, number>();
  for (const { hand, weight } of completions) {
    memo.clear();
    stratMemo.clear();
    const root: State = {
      round: view.round,
      klein: view.myHand,
      opp: hand,
      kScore: view.myScore,
      oScore: view.oppScore,
      echoNext: view.echoNext,
      shieldOff: view.shieldOff,
    };
    const strat = getStrategy(root);
    for (const kc of view.myHand) {
      acc.set(kc.id, (acc.get(kc.id) ?? 0) + weight * humanMove(root, kc, strat));
    }
  }

  const scored = view.myHand.map((kc) => ({ kc, v: acc.get(kc.id) ?? 0 }));
  if (scored.length === 0) return [];
  scored.sort((a, b) => b.v - a.v);
  const best = scored[0].v;
  const pool = scored.filter((x) => x.v >= best - MIX_BAND);
  return pool.map((x, i) => ({ card: x.kc, v: x.v, rank: i + 1 }));
}

/** Deterministic best pick, or a uniform draw among the winning pool when mix=true.
 *  For personality flavour, callers should use rankMoves() and let the LLM picker choose. */
export function chooseGodCard(view: BrainView, mix = true, config?: BrainConfig): Card {
  const pool = rankMoves(view, config);
  if (!mix || pool.length === 1) return pool[0].card;
  const weights = pool.map((x) => Math.exp(x.v * MIX_TEMP));
  const tot = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].card;
  }
  return pool[pool.length - 1].card;
}
