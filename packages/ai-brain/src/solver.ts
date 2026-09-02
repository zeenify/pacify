/* Full-vision solver — exact deep search for the brain.

   After the deal, NOTHING random touches scores: the engine's only rng
   (Oracle peeks) moves information, and the brain already sees both hands.
   The remaining game is therefore a finite simultaneous-commit game on
   (round, my cards, their cards, scores, echoNext, shieldOff) — small enough
   to solve exactly with memoized recursion (thousands of distinct states).

   But "solvable" does not mean "winnable": the human locks blindly each round,
   so no single line through the tree is safe. Each candidate move is scored on
   two axes instead:

   - floor: worst case over every reply they could lock this round (maximin).
     Recursive, so it is the outcome GUARANTEED if the human plays perfectly
     against our actual card — a hard lower bound on the result.
   - ev: expectation under a calibrated human model — a blend of uniform and a
     softmax over perceived score swings, which is how real humans pick.

   v = kappa * floor + (1 - kappa) * ev, maximized at every node. kappa = 1 is
   unexploitable but passive against weak humans; kappa = 0 is a pure best
   response to the model (exploitable — the old brain). The default sits
   between, tilted by how skilled the character believes the human is.

   PERF NOTE: resolveRound's point math never depends on the INPUT scores
   (totals only pass through, possibly swapped by Reversal or zeroed by
   Executioner). So the round grid for a (hands, round, echo, shield) tuple is
   cached once per Solver instance and replayed as a score transform for every
   distinct score hypothesis that reaches it. */

import {
  CATALOGUE,
  resolveRound,
  SCORE_THRESHOLD,
  TOTAL_ROUNDS,
  type Card,
  type CardId,
} from "@pacify/engine";

export type SolverState = {
  round: number;
  mine: Card[]; // brain's (p2) remaining cards
  theirs: Card[]; // opponent's (p1) remaining cards
  myScore: number;
  theirScore: number;
  echoNext: boolean;
  shieldOff: number;
};

export type CardValue = {
  card: Card;
  floor: number; // worst-case value over their replies
  ev: number; // expected value under the human model
  v: number; // kappa-blended value the brain maximizes
};

export type SolverOptions = {
  /** 0..1 — human model rationality (blend uniform ↔ sensible). */
  skill?: number;
  /** Weight on the worst-case floor vs model EV. Defaults from skill. */
  robustness?: number;
  /** Softmax sharpness of the human model. */
  temperature?: number;
};

const DEFAULT_SKILL = 0.5;
const DEFAULT_TEMP = 1.5;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Default worst-case weight: more respect for the human at higher skill. */
export const defaultRobustness = (skill: number): number =>
  clamp01(0.25 + 0.35 * clamp01(skill));

/** Advance one round with both cards locked. Pure; ignores Oracle peeks
 *  (information only — irrelevant to a full-vision valuation). */
export function stepSolverState(s: SolverState, myCard: Card, theirCard: Card): SolverState {
  const out = resolveRound({
    p1Card: theirCard,
    p2Card: myCard,
    p1Score: s.theirScore,
    p2Score: s.myScore,
    round: s.round,
    echoNext: s.echoNext,
    shieldOff: s.shieldOff,
  });
  return {
    round: s.round + 1,
    mine: s.mine.filter((c) => c.id !== myCard.id),
    theirs: s.theirs.filter((c) => c.id !== theirCard.id),
    myScore: out.p2Score,
    theirScore: out.p1Score,
    echoNext: out.echoNext,
    shieldOff: out.shieldOffAfter,
  };
}

/** Terminal utility from the brain's seat (mirrors duel.ts's result rules). */
export function payoff(myScore: number, theirScore: number): number {
  if (myScore > theirScore) return 1;
  if (myScore < theirScore) return 0;
  return 0.5;
}

/** The human model's move distribution at `s`: (1-skill) uniform + skill
 *  softmax over perceived score swings (expectation over our replies as if we
 *  played uniformly — a human cannot condition on our locked card). */
export function humanStrategy(
  s: SolverState,
  opts: { skill?: number; temperature?: number } = {},
): Map<CardId, number> {
  const skill = clamp01(opts.skill ?? DEFAULT_SKILL);
  const temp = opts.temperature ?? DEFAULT_TEMP;
  const utils = s.theirs.map((oc) => {
    let tot = 0;
    for (const kc of s.mine) {
      const out = resolveRound({
        p1Card: oc,
        p2Card: kc,
        p1Score: s.theirScore,
        p2Score: s.myScore,
        round: s.round,
        echoNext: s.echoNext,
        shieldOff: s.shieldOff,
      });
      tot += out.p1Score - s.theirScore - (out.p2Score - s.myScore);
    }
    return tot / Math.max(1, s.mine.length);
  });
  return softmaxBlend(s.theirs, utils, skill, temp);
}

function softmaxBlend(cards: Card[], utils: number[], skill: number, temp: number): Map<CardId, number> {
  const max = Math.max(...utils);
  const w = utils.map((u) => Math.exp((u - max) * temp));
  const sum = w.reduce((a, b) => a + b, 0);
  const dist = new Map<CardId, number>();
  cards.forEach((c, i) => {
    const uniform = 1 / cards.length;
    dist.set(c.id, (1 - skill) * uniform + skill * (w[i] / sum));
  });
  return dist;
}

// Search states are passed as primitives; hands are bitsets over the 19-card
// catalogue so states reached in different orders collide exactly in the memo.

// Score-independent round result for one (my card × their card) pairing.
// Replay against input totals (m, t):
//   newMy    = wipeMe    ? 0 : swap ? t + theirPts : m + myPts
//   newTheir = wipeTheir ? 0 : swap ? m + myPts    : t + theirPts
// (matches resolveRound: add points → Reversal swaps totals → Executioner wipes)
type CellT = {
  myPts: number;
  theirPts: number;
  swap: boolean;
  wipeMe: boolean;
  wipeTheir: boolean;
  echo: boolean;
  shield: number;
};

type Grid = { myCards: Card[]; theirCards: Card[]; cells: CellT[] };

export class Solver {
  private readonly skill: number;
  private readonly kappa: number;
  private readonly temp: number;
  private readonly memo = new Map<string, number>();
  private readonly grids = new Map<string, Grid>();
  private readonly bitIndexOf = new Map<CardId, number>();

  constructor(opts: SolverOptions = {}) {
    this.skill = clamp01(opts.skill ?? DEFAULT_SKILL);
    this.kappa = clamp01(opts.robustness ?? defaultRobustness(this.skill));
    this.temp = opts.temperature ?? DEFAULT_TEMP;
    CATALOGUE.forEach((c, i) => this.bitIndexOf.set(c.id, i));
  }

  /** Blended value of `state` under the brain's policy from here on. */
  value(state: SolverState): number {
    return this.solve(
      state.round,
      this.mask(state.mine),
      this.mask(state.theirs),
      state.myScore,
      state.theirScore,
      state.echoNext,
      state.shieldOff,
    );
  }

  /** Per-card floor / ev / blended value at a decision node. */
  cardValues(state: SolverState): CardValue[] {
    const round = state.round;
    const mine = this.mask(state.mine);
    const theirs = this.mask(state.theirs);
    const { myCards, theirCards, strat, cells } = this.gridState(
      round, state.echoNext, state.shieldOff, mine, theirs,
      state.myScore, state.theirScore,
    );
    const J = theirCards.length;
    const myBits: number[] = myCards.map((c) => this.bitIndexOf.get(c.id)!);
    const theirBits: number[] = theirCards.map((c) => this.bitIndexOf.get(c.id)!);

    return myCards.map((card, i) => {
      let floor = 1;
      let ev = 0;
      const mineNext = mine & ~(1 << myBits[i]);
      for (let j = 0; j < J; j++) {
        const c = cells[i * J + j];
        const newMy = c.wipeMe ? 0 : c.swap ? state.theirScore + c.theirPts : state.myScore + c.myPts;
        const newTheir = c.wipeTheir ? 0 : c.swap ? state.myScore + c.myPts : state.theirScore + c.theirPts;
        const v = this.solve(
          round + 1,
          mineNext,
          theirs & ~(1 << theirBits[j]),
          newMy,
          newTheir,
          c.echo,
          c.shield,
        );
        if (v < floor) floor = v;
        ev += strat[j] * v;
      }
      return { card, floor, ev, v: this.kappa * floor + (1 - this.kappa) * ev };
    });
  }

  // ---------- internals ----------

  private mask(hand: Card[]): number {
    let m = 0;
    for (const c of hand) {
      const b = this.bitIndexOf.get(c.id);
      if (b === undefined) throw new Error(`unknown card id: ${c.id}`);
      m |= 1 << b;
    }
    return m;
  }

  private cards(m: number): Card[] {
    const out: Card[] = [];
    for (let i = 0; i < CATALOGUE.length; i++) if (m & (1 << i)) out.push(CATALOGUE[i]);
    return out;
  }

  /** Round grid for a hand pairing — score-independent, cached per instance. */
  private grid(round: number, echo: boolean, shield: number, mine: number, theirs: number): Grid {
    const key = `${round}|${echo ? 1 : 0}|${shield}|${mine}|${theirs}`;
    const hit = this.grids.get(key);
    if (hit) return hit;
    const myCards = this.cards(mine);
    const theirCards = this.cards(theirs);
    const cells: CellT[] = [];
    for (const mc of myCards) {
      for (const tc of theirCards) {
        const out = resolveRound({
          p1Card: tc,
          p2Card: mc,
          p1Score: 0,
          p2Score: 0,
          round,
          echoNext: echo,
          shieldOff: shield,
        });
        cells.push({
          myPts: out.p2Points,
          theirPts: out.p1Points,
          swap: out.reversalSwapped,
          wipeMe: out.scoreWiped?.side === "p2",
          wipeTheir: out.scoreWiped?.side === "p1",
          echo: out.echoNext,
          shield: out.shieldOffAfter,
        });
      }
    }
    const g = { myCards, theirCards, cells };
    this.grids.set(key, g);
    return g;
  }

  /** Grid plus the human model's strategy at this node (swing softmax blend).
   *  Swings use real parent-score deltas — Reversal swaps and Executioner
   *  wipes make the perceived swing score-dependent. */
  private gridState(
    round: number,
    echo: boolean,
    shield: number,
    mine: number,
    theirs: number,
    my: number,
    their: number,
  ): { myCards: Card[]; theirCards: Card[]; strat: number[]; cells: CellT[] } {
    const { myCards, theirCards, cells } = this.grid(round, echo, shield, mine, theirs);
    const J = theirCards.length;
    const swings = new Array<number>(J).fill(0);
    for (let i = 0; i < myCards.length; i++) {
      for (let j = 0; j < J; j++) {
        const c = cells[i * J + j];
        const newMy = c.wipeMe ? 0 : c.swap ? their + c.theirPts : my + c.myPts;
        const newTheir = c.wipeTheir ? 0 : c.swap ? my + c.myPts : their + c.theirPts;
        swings[j] += newTheir - their - (newMy - my);
      }
    }
    const utils = swings.map((x) => x / Math.max(1, myCards.length));
    const max = Math.max(...utils);
    const w = utils.map((u) => Math.exp((u - max) * this.temp));
    const sum = w.reduce((a, b) => a + b, 0);
    const strat = theirCards.map((_, j) => {
      const uniform = 1 / theirCards.length;
      return (1 - this.skill) * uniform + this.skill * (w[j] / sum);
    });
    return { myCards, theirCards, strat, cells };
  }

  /** Core recursion on primitives (no node objects): the per-state cost is one
   *  memo key string + a cached grid lookup + arithmetic. */
  private solve(
    round: number,
    mine: number,
    theirs: number,
    my: number,
    their: number,
    echo: boolean,
    shield: number,
  ): number {
    if (round > TOTAL_ROUNDS || my >= SCORE_THRESHOLD || their >= SCORE_THRESHOLD) {
      return payoff(my, their);
    }
    const key = `${round}|${my}|${their}|${echo ? 1 : 0}|${shield}|${mine}|${theirs}`;
    const hit = this.memo.get(key);
    if (hit !== undefined) return hit;

    const { myCards, theirCards, strat, cells } = this.gridState(round, echo, shield, mine, theirs, my, their);
    const J = theirCards.length;
    let best = -Infinity;
    for (let i = 0; i < myCards.length; i++) {
      const mineNext = mine & ~(1 << this.bitIndexOf.get(myCards[i].id)!);
      let floor = 1;
      let ev = 0;
      for (let j = 0; j < J; j++) {
        const c = cells[i * J + j];
        const newMy = c.wipeMe ? 0 : c.swap ? their + c.theirPts : my + c.myPts;
        const newTheir = c.wipeTheir ? 0 : c.swap ? my + c.myPts : their + c.theirPts;
        const v = this.solve(
          round + 1,
          mineNext,
          theirs & ~(1 << this.bitIndexOf.get(theirCards[j].id)!),
          newMy,
          newTheir,
          c.echo,
          c.shield,
        );
        if (v < floor) floor = v;
        ev += strat[j] * v;
      }
      const val = this.kappa * floor + (1 - this.kappa) * ev;
      if (val > best) best = val;
    }
    this.memo.set(key, best);
    return best;
  }
}
