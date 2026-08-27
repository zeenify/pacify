import { describe, it, expect } from "vitest";
import { createDuel, dispatch, brainView, TOTAL_ROUNDS } from "@pacify/engine";
import { chooseAiCard, rankCards, KLEIN_POLICY } from "../src/index.js";

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playDuel(seed: number, brainPlays: boolean, cold: boolean) {
  const rng = mulberry(seed);
  const policy = cold ? { ...KLEIN_POLICY, epsilon: 0 } : KLEIN_POLICY;
  let state = createDuel({ seed, studentId: 2 });
  for (let r = 0; r < TOTAL_ROUNDS; r++) {
    if (brainPlays) {
      const pick = chooseAiCard(brainView(state), policy);
      state = dispatch(state, { t: "lock_ai", cardId: pick.id }).state;
    }
    // p1 random (or also random when brain is p2-off)
    state = dispatch(state, { t: "lock_player", cardId: state.p1Hand[Math.floor(rng() * state.p1Hand.length)].id }).state;
    if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
  }
  return state;
}

it("diagnostics", { timeout: 60_000 }, () => {
  let bw = 0, bl = 0, bd = 0, bScore = 0, oScore = 0;
  let rw = 0, rl = 0, rd = 0;
  for (let g = 0; g < 100; g++) {
    const s1 = playDuel(g * 31 + 7, true, true);
    bScore += s1.p2Score; oScore += s1.p1Score;
    if (s1.result?.winner === "p2") bw++; else if (s1.result?.winner === "p1") bl++; else bd++;

    const rng = mulberry(g * 77 + 1);
    let s2 = createDuel({ seed: g * 31 + 7, studentId: 2 });
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      s2 = dispatch(s2, { t: "lock_ai", cardId: s2.p2Hand[Math.floor(rng() * s2.p2Hand.length)].id }).state;
      s2 = dispatch(s2, { t: "lock_player", cardId: s2.p1Hand[Math.floor(rng() * s2.p1Hand.length)].id }).state;
      if (s2.phase === "reveal") s2 = dispatch(s2, { t: "next_round" }).state;
    }
    if (s2.result?.winner === "p2") rw++; else if (s2.result?.winner === "p1") rl++; else rd++;
  }
  console.log(`BRAIN(ε=0) vs random : W${bw} L${bl} D${bd} | avg ${ (bScore/300).toFixed(1) }-${(oScore/300).toFixed(1) }`);
  console.log(`RANDOM     vs random : W${rw} L${rl} D${rd}`);
  expect(true).toBe(true);
});

it("trace one brain duel", () => {
  const seed = 7;
  const policy = { ...KLEIN_POLICY, epsilon: 0 };
  let state = createDuel({ seed, studentId: 2 });
  const rng = mulberry(seed * 3 + 1);
  console.log(`AI hand: ${state.p2Hand.map((c) => c.name).join(", ")}`);
  console.log(`P  pool: 13 cards (random player)`);
  for (let r = 0; r < TOTAL_ROUNDS; r++) {
    const view = brainView(state);
    const ranked = rankCards(view, policy);
    console.log(
      `R${view.round} ${view.myScore}-${view.oppScore} echo=${view.echoNext} | ` +
      ranked.map((s) => `${s.card.name}:${s.weighted.toFixed(2)}`).join(" ")
    );
    const pick = chooseAiCard(view, policy);
    const pCard = state.p1Hand[Math.floor(rng() * state.p1Hand.length)];
    state = dispatch(state, { t: "lock_ai", cardId: pick.id }).state;
    state = dispatch(state, { t: "lock_player", cardId: pCard.id }).state;
    const o = state.lastOutcome!;
    console.log(`   AI:${pick.name} vs P:${pCard.name} → ${o.p2Points}-${o.p1Points} → ${state.p2Score}-${state.p1Score}`);
    if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
  }
  console.log(`FINAL ${state.p2Score}-${state.p1Score} ${state.result?.winner}`);
  expect(true).toBe(true);
});
