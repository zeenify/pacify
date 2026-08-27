import { describe, it, expect } from "vitest";
import { createDuel, dispatch, brainView, TOTAL_ROUNDS } from "@pacify/engine";
import { chooseAiCard, KLEIN_POLICY } from "../src/index.js";

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomCard(hand: { length: number }[], rng: () => number): any {
  return (hand as any)[Math.floor(rng() * hand.length)];
}

it("seat + control diagnostics", { timeout: 120_000 }, () => {
  const N = 150;
  const agg = {
    brainP2: { w: 0, l: 0, d: 0, my: 0, op: 0 },
    randP2: { w: 0, l: 0, d: 0, my: 0, op: 0 },
    brainP1: { w: 0, l: 0, d: 0, my: 0, op: 0 },
  };

  for (let g = 0; g < N; g++) {
    const rng = mulberry(g * 1013 + 77);

    // BRAIN as p2 vs random p1
    let s = createDuel({ seed: g * 31 + 7, studentId: 2 });
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      const pick = chooseAiCard(brainView(s), { ...KLEIN_POLICY, epsilon: 0 });
      s = dispatch(s, { t: "lock_ai", cardId: pick.id }).state;
      s = dispatch(s, { t: "lock_player", cardId: randomCard(s.p1Hand, rng).id }).state;
      if (s.phase === "reveal") s = dispatch(s, { t: "next_round" }).state;
    }
    agg.brainP2.my += s.p2Score; agg.brainP2.op += s.p1Score;
    if (s.result?.winner === "p2") agg.brainP2.w++; else if (s.result?.winner === "p1") agg.brainP2.l++; else agg.brainP2.d++;

    // RANDOM vs RANDOM
    s = createDuel({ seed: g * 31 + 7, studentId: 2 });
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      s = dispatch(s, { t: "lock_ai", cardId: randomCard(s.p2Hand, rng).id }).state;
      s = dispatch(s, { t: "lock_player", cardId: randomCard(s.p1Hand, rng).id }).state;
      if (s.phase === "reveal") s = dispatch(s, { t: "next_round" }).state;
    }
    agg.randP2.my += s.p2Score; agg.randP2.op += s.p1Score;
    if (s.result?.winner === "p2") agg.randP2.w++; else if (s.result?.winner === "p1") agg.randP2.l++; else agg.randP2.d++;

    // BRAIN as p1 vs random p2
    s = createDuel({ seed: g * 31 + 7, studentId: 2 });
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      const pick = chooseAiCard(
        { ...brainView(s), myHand: s.p1Hand, myScore: s.p1Score, oppScore: s.p2Score },
        { ...KLEIN_POLICY, epsilon: 0 }
      );
      s = dispatch(s, { t: "lock_ai", cardId: randomCard(s.p2Hand, rng).id }).state;
      // brain's pick was computed for p1 seat — dispatch it as the player lock
      s = dispatch(s, { t: "lock_player", cardId: pick.id }).state;
      if (s.phase === "reveal") s = dispatch(s, { t: "next_round" }).state;
    }
    agg.brainP1.my += s.p1Score; agg.brainP1.op += s.p2Score;
    if (s.result?.winner === "p1") agg.brainP1.w++; else if (s.result?.winner === "p2") agg.brainP1.l++; else agg.brainP1.d++;
  }

  const f = (a: typeof agg.brainP2) =>
    `W${a.w} L${a.l} D${a.d} | avg ${((a.my as number) / N).toFixed(2)}-${((a.op as number) / N).toFixed(2)}`;
  console.log(`BRAIN as p2 : ${f(agg.brainP2)}`);
  console.log(`RAND  as p2 : ${f(agg.randP2)}`);
  console.log(`BRAIN as p1 : ${f(agg.brainP1)}`);
  expect(true).toBe(true);
});
