import { describe, it, expect } from "vitest";
import { createDuel, dispatch, brainView, TOTAL_ROUNDS, type BrainView } from "@pacify/engine";
import { chooseGodCard, KLEIN_POLICY } from "../src/index.js";

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playDuel(seed: number, mode: "god" | "random") {
  const rng = mulberry(seed);
  let state = createDuel({ seed, studentId: 2 });
  for (let r = 0; r < TOTAL_ROUNDS; r++) {
    let aiId: string;
    if (mode === "god") aiId = chooseGodCard(brainView(state)).id;
    else aiId = state.p2Hand[Math.floor(rng() * state.p2Hand.length)].id;
    state = dispatch(state, { t: "lock_ai", cardId: aiId }).state;
    state = dispatch(state, { t: "lock_player", cardId: state.p1Hand[Math.floor(rng() * state.p1Hand.length)].id }).state;
    if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
  }
  return state.result?.winner ?? "draw";
}

describe("god brain", () => {
  it("always picks a legal card, deterministic per state", { timeout: 120_000 }, () => {
    for (let seed = 0; seed < 50; seed++) {
      let state = createDuel({ seed, studentId: 2 });
      for (let r = 0; r < TOTAL_ROUNDS; r++) {
        const view = brainView(state);
        const pick = chooseGodCard(view);
        expect(view.myHand.some((c) => c.id === pick.id)).toBe(true);
        expect(chooseGodCard(view).id).toBe(pick.id);
        state = dispatch(state, { t: "lock_ai", cardId: pick.id }).state;
        state = dispatch(state, { t: "lock_player", cardId: state.p1Hand[0].id }).state;
        if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
      }
    }
  });

  it("winrate vs random — the god floor", { timeout: 240_000 }, () => {    const N = 500;
    let w = 0, l = 0, d = 0;
    for (let g = 0; g < N; g++) {
      const res = playDuel(g * 131 + 11, "god");
      if (res === "p2") w++;
      else if (res === "p1") l++;
      else d++;
    }
    console.log(`GOD vs random — W${w} L${l} D${d} → ${((w / N) * 100).toFixed(1)}% (losses ${(l / N * 100).toFixed(1)}% = luck floor)`);
    expect(w / N).toBeGreaterThan(0.6);
  });

  it("perf: R1 pick stays fast", () => {
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const state = createDuel({ seed: i * 887 + 3, studentId: 2 });
      const t0 = performance.now();
      chooseGodCard(brainView(state));
      times.push(performance.now() - t0);
    }
    const worst = Math.max(...times);
    console.log(`GOD R1 pick — worst ${worst.toFixed(0)}ms`);
    expect(worst).toBeLessThan(2000); // no timer in game; just keep it sane
  });
});
