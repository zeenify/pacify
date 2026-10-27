import { expect, it } from "vitest";
import {
  createDuel,
  dispatch,
  resolveRound,
  stepRng,
  type BrainView,
  type Card,
  type DuelState,
} from "@pacify/engine";
import { rankMoves } from "../../src/god.js";
import { Solver, humanStrategy, stepSolverState, type SolverState } from "../../src/solver.js";
import { bestCounter, readChance, READ_SCHEDULE } from "../../src/read.js";

/* Verification suite for the READ mechanic (insane difficulty plan.md) —
   Klein seeing the human's locked card and playing the game-optimal reply.
   (Named "read" to avoid colliding with the game's Oracle peek mechanic.)
   Everything runs on the real engine with the fixed seed stream
   (1000 + i*7919), so every assertion is deterministic. */

const seeds = (n: number) => Array.from({ length: n }, (_, i) => 1000 + i * 7919);
const yieldTick = () => new Promise((resolve) => setTimeout(resolve, 0));

function brainView(st: DuelState): BrainView {
  return {
    studentId: 2,
    round: st.round,
    phase: "commit",
    myScore: st.p2Score,
    oppScore: st.p1Score,
    myHand: st.p2Hand,
    burned: st.burned,
    peeked: [...st.p1Hand],
    oppHand: st.p1Hand,
    oppPeeked: [],
    shieldOff: st.shieldOff,
    echoNext: st.echoNext,
    rngState: st.rngState,
  };
}

function baseState(st: DuelState): SolverState {
  return {
    round: st.round,
    mine: st.p2Hand,
    theirs: st.p1Hand,
    myScore: st.p2Score,
    theirScore: st.p1Score,
    echoNext: st.echoNext,
    shieldOff: st.shieldOff,
  };
}

function categorical(cards: Card[], probs: number[], r: number): Card {
  let acc = r;
  for (let i = 0; i < cards.length; i++) {
    acc -= probs[i];
    if (acc <= 0) return cards[i];
  }
  return cards[cards.length - 1];
}

/** The modeled human (skill .5 swing-softmax draw) — the calibrated proxy for
    average-paced play, same as the arena's "modeled" opponent. */
function humanPick(st: DuelState, rng: { s: number }): Card {
  const hand = st.p1Hand;
  const [r, next] = stepRng(rng.s);
  rng.s = next;
  const s: SolverState = {
    round: st.round,
    mine: st.p2Hand,
    theirs: hand,
    myScore: st.p1Score,
    theirScore: st.p2Score,
    echoNext: st.echoNext,
    shieldOff: st.shieldOff,
  };
  const strat = humanStrategy(s, { skill: 0.5 });
  return categorical(hand, hand.map((c) => strat.get(c.id) ?? 0), r);
}

// ---------------------------------------------------------------------------

it("the read is sound: the counter is never worse than the blind pick against the known card", async () => {
  // Walk blind duels; every round, value the blind pick AND the read counter
  // against the human's actual card. argmax guarantees >=, so this asserts the
  // mechanic's core promise: knowing the locked card can never hurt.
  let rounds = 0;
  let flips = 0;
  for (const seed of seeds(6)) {
    let st = createDuel({ seed, studentId: 2 });
    const rng = { s: (seed ^ 0x51ed270b) | 0 };
    const solver = new Solver({ robustness: 1 });
    let guard = 0;
    while (st.phase !== "over" && guard++ < 100) {
      if (st.phase === "commit") {
        const humanCard = humanPick(st, rng);
        const blind = rankMoves(brainView(st), { robustness: 1 })[0].card;
        const base = baseState(st);
        const counter = bestCounter(base, humanCard, solver);
        const blindV = solver.value(stepSolverState(base, blind, humanCard));
        expect(counter.value).toBeGreaterThanOrEqual(blindV - 1e-9);
        expect(base.mine.some((c) => c.id === counter.card.id)).toBe(true);
        rounds++;
        if (counter.card.id !== blind.id) flips++;
        st = dispatch(st, { t: "lock_ai", cardId: blind.id }).state;
        st = dispatch(st, { t: "lock_player", cardId: humanCard.id }).state;
      } else if (st.phase === "reveal") {
        st = dispatch(st, { t: "next_round" }).state;
      } else break;
    }
    await yieldTick();
  }
  console.log(`    soundness: ${rounds} rounds checked, the read flipped the move in ${flips} (${((flips / rounds) * 100).toFixed(0)}%)`);
  expect(rounds).toBeGreaterThan(20);
});

it("the counter is game-optimal, not round-greedy: it sacrifices round points when the game demands it", async () => {
  // Find rounds where some alternative card scores MORE points this round yet
  // has a strictly LOWER whole-game value than the counter. Finding any proves
  // the read evaluates the remaining game rather than the immediate matchup.
  let sacrifices = 0;
  for (const seed of seeds(4)) {
    let st = createDuel({ seed, studentId: 2 });
    const rng = { s: (seed ^ 0x51ed270b) | 0 };
    const solver = new Solver({ robustness: 1 });
    let guard = 0;
    while (st.phase !== "over" && guard++ < 100) {
      if (st.phase === "commit") {
        const humanCard = humanPick(st, rng);
        const base = baseState(st);
        const counter = bestCounter(base, humanCard, solver);
        const pointsOf = (c: Card) =>
          resolveRound({
            p1Card: humanCard,
            p2Card: c,
            p1Score: base.theirScore,
            p2Score: base.myScore,
            round: base.round,
            echoNext: base.echoNext,
            shieldOff: base.shieldOff,
          }).p2Points;
        const counterPts = pointsOf(counter.card);
        for (const c of base.mine) {
          if (c.id === counter.card.id) continue;
          const v = solver.value(stepSolverState(base, c, humanCard));
          if (pointsOf(c) > counterPts && v < counter.value - 1e-9) {
            sacrifices++;
            break;
          }
        }
        st = dispatch(st, { t: "lock_ai", cardId: counter.card.id }).state;
        st = dispatch(st, { t: "lock_player", cardId: humanCard.id }).state;
      } else if (st.phase === "reveal") {
        st = dispatch(st, { t: "next_round" }).state;
      } else break;
    }
    await yieldTick();
  }
  console.log(`    game-optimal: ${sacrifices} rounds where the counter gave up round points for game value`);
  expect(sacrifices).toBeGreaterThan(0);
});

/** One duel under a read policy. useRead=true applies the shipping schedule
    (readChance per round, rng-drawn); false plays pure blind hard mode. The
    rng stream is consumed identically in both modes so trajectories stay
    comparable until a read actually diverges them. */
function playReadDuel(seed: number, useRead: boolean) {
  let st = createDuel({ seed, studentId: 2 });
  const rng = { s: (seed ^ 0x51ed270b) | 0 };
  const solver = new Solver({ robustness: 1 });
  let reads = 0;
  let guard = 0;
  while (st.phase !== "over" && guard++ < 100) {
    if (st.phase === "commit") {
      const humanCard = humanPick(st, rng);
      const [pr, next] = stepRng(rng.s);
      rng.s = next;
      const read = useRead && pr < readChance(st.round);
      const pick = read
        ? bestCounter(baseState(st), humanCard, solver).card
        : rankMoves(brainView(st), { robustness: 1 })[0].card;
      if (read) reads++;
      st = dispatch(st, { t: "lock_ai", cardId: pick.id }).state;
      st = dispatch(st, { t: "lock_player", cardId: humanCard.id }).state;
    } else if (st.phase === "reveal") {
      st = dispatch(st, { t: "next_round" }).state;
    } else break;
  }
  const result = st.result ?? { winner: "draw" as const };
  return {
    payoff: result.winner === "p2" ? 1 : result.winner === "draw" ? 0.5 : 0,
    margin: st.p2Score - st.p1Score,
    reads,
  };
}

it("the shipping schedule beats blind play head-to-head vs the modeled human", async () => {
  const n = 12;
  const tally = (useRead: boolean) => {
    let w = 0, d = 0, l = 0, margin = 0, reads = 0;
    for (const seed of seeds(n)) {
      const r = playReadDuel(seed, useRead);
      if (r.payoff === 1) w++;
      else if (r.payoff === 0.5) d++;
      else l++;
      margin += r.margin;
      reads += r.reads;
    }
    return { w, d, l, margin: margin / n, reads: reads / n, wr: (w + 0.5 * d) / n };
  };
  const blind = tally(false);
  const read = tally(true);
  console.log(`    blind: W${blind.w} D${blind.d} L${blind.l}  win% ${(blind.wr * 100).toFixed(0)}  margin ${blind.margin.toFixed(1)}`);
  console.log(`    read:  W${read.w} D${read.d} L${read.l}  win% ${(read.wr * 100).toFixed(0)}  margin ${read.margin.toFixed(1)}  (${read.reads.toFixed(1)} reads/duel)`);
  expect(read.wr).toBeGreaterThan(blind.wr);
  expect(read.wr).toBeGreaterThanOrEqual(0.7);
  await yieldTick();
});

it("bestCounter is deterministic and the schedule has the agreed shape", () => {
  const st = createDuel({ seed: 1000, studentId: 2 });
  const base: SolverState = {
    round: 1,
    mine: st.p2Hand,
    theirs: st.p1Hand,
    myScore: 0,
    theirScore: 0,
    echoNext: false,
    shieldOff: 0,
  };
  const solver = new Solver({ robustness: 1 });
  const a = bestCounter(base, st.p1Hand[0], solver);
  const b = bestCounter(base, st.p1Hand[0], solver);
  expect(a.card.id).toBe(b.card.id);
  expect(a.value).toBe(b.value);

  // Dead rounds zero, mid-game loaded, ~3.4 nominal reads/duel.
  expect(readChance(1)).toBe(0);
  expect(readChance(7)).toBe(0);
  expect(readChance(3)).toBe(0.8);
  expect(readChance(4)).toBe(0.8);
  expect(readChance(5)).toBe(0.8);
  expect(readChance(2)).toBe(0.5);
  expect(readChance(6)).toBe(0.5);
  expect(readChance(8)).toBe(0);
  expect(READ_SCHEDULE.reduce((a, b) => a + b, 0)).toBeCloseTo(3.4, 9);
});
