import { describe, it, expect } from "vitest";
import { cardById, CATALOGUE } from "@pacify/engine";
import { expectedDifferential } from "../src/index.js";

it("does EV price the opponent's Reversal when I hold a big card?", () => {
  const angel = cardById("angel");       // 12 good
  const bandit = cardById("bandit");     // 1 bad
  const reversal = cardById("reversal"); // 6
  const view: any = {
    studentId: 2, round: 7, phase: "commit",
    myScore: 10, oppScore: 0,          // AI is AHEAD 10-0
    myHand: [angel, bandit],
    burned: [], peeked: [], shieldOff: 0,
    echoNext: false, rngState: 1,
  };
  // Pool = ONLY Reversal (we know opp's last card for the test)
  const view2: any = {
    ...view,
    myHand: [angel],
    burned: CATALOGUE_EXCEPT("reversal"),
  };
  const evAngelVsReversal = expectedDifferential(angel, { view: view2 });
  console.log(`EV(Angel) when opp's only card is Reversal, AI leads 10-0: ${evAngelVsReversal}`);
  // R7 ×2: Angel wins clash +6×2=12 → totals 22-0 → swap → 0-22. Δ = (0-22)-(10-0) = -32.
  expect(evAngelVsReversal).toBe(-32);

  const view3: any = { ...view, myHand: [bandit], burned: CATALOGUE_EXCEPT("reversal") };
  const evBanditVsReversal = expectedDifferential(bandit, { view: view3 });
  console.log(`EV(Bandit 1) same spot: ${evBanditVsReversal}`);
  // Bandit loses 1-6 → opp +5×2=10 → 10-10 → swap → no-op. Δ = (10-10)-(10-0) = -10.
  expect(evBanditVsReversal).toBe(-10);
  // Both plays lose, but Angel loses MORE — the AI correctly refuses its own big card
  // into a known Reversal. That's the swap priced into the EV.
  expect(evAngelVsReversal).toBeLessThan(evBanditVsReversal);
});

function CATALOGUE_EXCEPT(id: string) {
  return CATALOGUE.filter((c: any) => c.id !== id);
}
