import { describe, it, expect } from "vitest";
import { createDuel, dispatch, brainView, resolveRound, TOTAL_ROUNDS, type DuelState } from "@pacify/engine";
import { chooseAiCard, KLEIN_POLICY, rankCards } from "../src/index.js";

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** TRUE ceiling: full-depth search with PERFECT information (pool = actual hand). */
function oraclePick(state: DuelState): string {
  const before = state.p2Score - state.p1Score;
  const { expectedDifferential } = require0();
  let best = state.p2Hand[0];
  let bestV = -Infinity;
  for (const mine of state.p2Hand) {
    // perfect-info this-round delta vs the real remaining hand
    let ev = 0;
    for (const opp of state.p1Hand) {
      const out = resolveRound({
        p1Card: opp,
        p2Card: mine,
        p1Score: state.p1Score,
        p2Score: state.p2Score,
        round: state.round,
        echoNext: state.echoNext,
      });
      ev += (out.p2Score - out.p1Score - before) / state.p1Hand.length;
    }
    // full-depth future with perfect info
    if (state.round < TOTAL_ROUNDS) {
      const handAfter = state.p2Hand.filter((c) => c.id !== mine.id);
      const oppAfter = state.p1Hand; // approx: current real hand as future pool
      const { futurePotential } = require0();
      ev += futurePotential(handAfter, oppAfter, state.round + 1, state.echoNext || mine.name === "Echo");
    }
    void expectedDifferential;
    if (ev > bestV) {
      bestV = ev;
      best = mine;
    }
  }
  return best.id;
}

// tiny helper so the test file has no require() (ESM-safe)
import * as brainExports from "../src/index.js";
function require0() {
  return brainExports;
}

it("skill ceiling: oracle vs brain vs random", { timeout: 120_000 }, () => {
  const N = 120;
  const count = {
    oracle: { w: 0, l: 0, d: 0 },
    brain: { w: 0, l: 0, d: 0 },
    random: { w: 0, l: 0, d: 0 },
  };
  for (let g = 0; g < N; g++) {
    for (const mode of ["oracle", "brain", "random"] as const) {
      const rng = mulberry(g * 101 + 17);
      let state = createDuel({ seed: g * 101 + 17, studentId: 2 });
      for (let r = 0; r < TOTAL_ROUNDS; r++) {
        let aiId: string;
        if (mode === "oracle") aiId = oraclePick(state);
        else if (mode === "brain") aiId = chooseAiCard(brainView(state), { ...KLEIN_POLICY, epsilon: 0 }).id;
        else aiId = state.p2Hand[Math.floor(rng() * state.p2Hand.length)].id;
        state = dispatch(state, { t: "lock_ai", cardId: aiId }).state;
        state = dispatch(state, {
          t: "lock_player",
          cardId: state.p1Hand[Math.floor(rng() * state.p1Hand.length)].id,
        }).state;
        if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
      }
      const c = count[mode];
      const w = state.result?.winner;
      if (w === "p2") c.w++;
      else if (w === "p1") c.l++;
      else c.d++;
    }
  }
  for (const [mode, c] of Object.entries(count)) {
    console.log(`${mode.padEnd(7)} W${c.w} L${c.l} D${c.d} → ${((c.w / N) * 100).toFixed(1)}%`);
  }
  // The full-depth brain must beat random decisively.
  expect(count.brain.w).toBeGreaterThan(count.random.w);
});

it("perf: R1 pick (cold memo) stays interactive", () => {
  // Worst case: first pick of a duel — deepest search, empty memo.
  const times: number[] = [];
  for (let i = 0; i < 10; i++) {
    const state = createDuel({ seed: i * 991 + 5, studentId: 2 });
    const t0 = performance.now();
    rankCards(brainView(state), { ...KLEIN_POLICY, epsilon: 0 });
    times.push(performance.now() - t0);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const worst = Math.max(...times);
  console.log(`R1 pick — avg ${avg.toFixed(1)}ms worst ${worst.toFixed(1)}ms`);
  expect(worst).toBeLessThan(500); // interactive budget; no timer exists, but stay snappy
});
