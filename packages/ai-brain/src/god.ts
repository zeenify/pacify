import type { BrainView, Card } from "@pacify/engine";
import { resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD } from "@pacify/engine";
import { possibleOppCards, beliefWeights } from "./belief.js";

const OPP_SKILL = 0.5;
const STRAT_TEMP = 1.5;
const MIX_BAND = 0.02;
const MIX_TEMP = 12;

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
    dist.set(oc, (1 - OPP_SKILL) * uniform + OPP_SKILL * sensible);
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

export function chooseGodCard(view: BrainView, mix = true): Card {
  const burnedIds = new Set((view.burned ?? []).map((c) => c.id));
  const known = ((view.peeked ?? []) as Card[]).filter((c) => !burnedIds.has(c.id));
  const oppHand: Card[] = known.length > 0 ? known : possibleOppCards(view);

  const root: State = {
    round: view.round,
    klein: view.myHand,
    opp: oppHand,
    kScore: view.myScore,
    oScore: view.oppScore,
    echoNext: view.echoNext,
    shieldOff: view.shieldOff,
  };

  memo.clear();
  stratMemo.clear();
  const strat = getStrategy(root);
  const scored = view.myHand.map((kc) => ({ kc, v: humanMove(root, kc, strat) }));
  scored.sort((a, b) => b.v - a.v);
  const best = scored[0].v;
  const pool = scored.filter((x) => x.v >= best - MIX_BAND);

  if (!mix || pool.length === 1) return scored[0].kc;
  const weights = pool.map((x) => Math.exp(x.v * MIX_TEMP));
  const tot = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].kc;
  }
  return pool[pool.length - 1].kc;
}
