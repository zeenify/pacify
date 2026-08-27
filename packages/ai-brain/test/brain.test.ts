import { describe, it, expect } from "vitest";
import { createDuel, dispatch, brainView, TOTAL_ROUNDS, type DuelState } from "@pacify/engine";
import { chooseGodCard, KLEIN_POLICY } from "../src/index.js";

/* FAST correctness suite — legality + determinism only.
   Heavy balance sims live in sim/*.sim.ts (run: npm run test:sim).
   Trick-strategy checks live in strategy.test.ts + reversal.test.ts. */

describe("god brain — correctness (fast)", () => {
  it("always picks a legal card, deterministic per state (3 duels)", { timeout: 60_000 }, () => {
    for (let seed = 0; seed < 3; seed++) {
      let state: DuelState = createDuel({ seed, studentId: 2 });
      for (let r = 0; r < TOTAL_ROUNDS; r++) {
        const view = brainView(state);
        const pick = chooseGodCard(view, KLEIN_POLICY);
        expect(view.myHand.some((c) => c.id === pick.id)).toBe(true);
        expect(chooseGodCard(view, KLEIN_POLICY).id).toBe(pick.id);
        state = dispatch(state, { t: "lock_ai", cardId: pick.id }).state;
        state = dispatch(state, { t: "lock_player", cardId: state.p1Hand[0].id }).state;
        if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
      }
    }
  });
});
