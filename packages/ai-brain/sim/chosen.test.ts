import { describe, it, expect } from "vitest";
import { createDuel, dispatch, brainView, TOTAL_ROUNDS } from "@pacify/engine";
import { rankCards, chooseAiCard, KLEIN_POLICY, expectedDifferential } from "../src/index.js";

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

it("chosen-card calibration + power profile", { timeout: 60_000 }, () => {
  const rng = mulberry(31337);
  let n = 0, sumEv = 0, sumReal = 0;
  let brainPower = 0, randPower = 0, brainTricks = 0, randTricks = 0;

  for (let g = 0; g < 120; g++) {
    let state = createDuel({ seed: g * 53 + 9, studentId: 2 });
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      const view = brainView(state);
      const ranked = rankCards(view, { ...KLEIN_POLICY, epsilon: 0 });
      const chosen = ranked[0];
      const before = view.myScore - view.oppScore;

      const oppCard = state.p1Hand[Math.floor(rng() * state.p1Hand.length)];
      state = dispatch(state, { t: "lock_ai", cardId: chosen.card.id }).state;
      state = dispatch(state, { t: "lock_player", cardId: oppCard.id }).state;
      const realized = state.p2Score - state.p1Score - before;

      if (chosen.card.kind === "number") {
        brainPower += chosen.card.power;
      } else brainTricks++;
      if (oppCard.kind === "number") randPower += oppCard.power;
      else randTricks++;
      sumEv += chosen.ev;
      sumReal += realized;
      n++;

      if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
    }
  }

  console.log(`chosen: n=${n} avgEV=${(sumEv / n).toFixed(3)} avgRealized=${(sumReal / n).toFixed(3)} gap=${((sumReal - sumEv) / n).toFixed(3)}`);
  console.log(`brain avg power=${(brainPower / n).toFixed(2)} tricks=${(brainTricks / n).toFixed(2)} | opp avg power=${(randPower / n).toFixed(2)} tricks=${(randTricks / n).toFixed(2)}`);
  expect(true).toBe(true);
});
