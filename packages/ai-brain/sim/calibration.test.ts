import { describe, it, expect } from "vitest";
import { createDuel, dispatch, brainView, CATALOGUE, TOTAL_ROUNDS } from "@pacify/engine";
import { rankCards, KLEIN_POLICY, expectedDifferential } from "../src/index.js";

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

it("EV calibration: predicted vs realized differential", () => {
  const rng = mulberry(4242);
  let n = 0;
  let sumEv = 0;
  let sumRealized = 0;

  for (let g = 0; g < 120; g++) {
    let state = createDuel({ seed: g * 61 + 5, studentId: 2 });
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      const view = brainView(state);
      // evaluate a RANDOM legal card (unbiased sample of calibration)
      const card = view.myHand[Math.floor(rng() * view.myHand.length)];
      const ev = expectedDifferential(card, { view });

      const oppCard = state.p1Hand[Math.floor(rng() * state.p1Hand.length)];
      const before = view.myScore - view.oppScore;
      state = dispatch(state, { t: "lock_ai", cardId: card.id }).state;
      state = dispatch(state, { t: "lock_player", cardId: oppCard.id }).state;
      const after = state.p2Score - state.p1Score;
      const realized = after - before;

      sumEv += ev;
      sumRealized += realized;
      n++;

      if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
    }
  }

  const avgEv = sumEv / n;
  const avgReal = sumRealized / n;
  console.log(`rounds=${n} avgEV=${avgEv.toFixed(3)} avgRealized=${avgReal.toFixed(3)} gap=${(avgReal - avgEv).toFixed(3)}`);
  expect(true).toBe(true);
});

it("pool composition check: does the belief pool match the real opponent hand?", () => {
  const rng = mulberry(999);
  let poolTricks = 0, poolN = 0, realTricks = 0, realN = 0;
  for (let g = 0; g < 500; g++) {
    let state = createDuel({ seed: g * 17 + 3, studentId: 2 });
    const view = brainView(state);
    // belief pool at round 1
    const known = new Set([...view.burned.map((c) => c.id), ...view.myHand.map((c) => c.id)]);
    const pool = CATALOGUE.filter((c) => !known.has(c.id));
    poolTricks += pool.filter((c) => c.kind === "trick").length;
    poolN += pool.length;
    // real player hand trick count
    realTricks += state.p1Hand.filter((c) => c.kind === "trick").length;
    realN += 5;
    void rng;
  }
  console.log(`pool trick%=${((poolTricks / poolN) * 100).toFixed(1)} real hand trick%=${((realTricks / realN) * 100).toFixed(1)}`);
  expect(true).toBe(true);
});
