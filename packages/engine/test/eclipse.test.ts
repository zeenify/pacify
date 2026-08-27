import { describe, it, expect } from "vitest";
import { resolveRound, cardById } from "../src/index.js";
const B = { p1Score: 5, p2Score: 2, round: 3, echoNext: false, shieldOff: 0 };
const E = (s: string) => cardById(s);
it("eclipse vs reversal: soft void — clash 0-0, SWAP fires", () => {
  const r = resolveRound({ ...B, p1Card: E("eclipse"), p2Card: E("reversal") });
  expect(r.voided).toBe(true);
  expect(r.eclipseFired).toBe(true);
  expect(r.p1Points).toBe(0); expect(r.p2Points).toBe(0);
  expect(r.reversalSwapped).toBe(true);           // swap FIRES through the soft void
  expect(r.p1Score).toBe(2); expect(r.p2Score).toBe(5); // totals swapped
  expect(r.shieldOffAfter).toBe(2);               // window opens
});
it("eclipse vs oracle: peek fires through", () => {
  const r = resolveRound({ ...B, p1Card: E("eclipse"), p2Card: E("oracle") });
  expect(r.voided).toBe(true);
  expect(r.peek).toEqual({ side: "p2", count: 2 });
  expect(r.shieldOffAfter).toBe(2);
});
it("eclipse vs executioner: opp played a TRICK — no wipe, but window opens", () => {
  const r = resolveRound({ ...B, p1Card: E("executioner"), p2Card: E("eclipse") });
  expect(r.voided).toBe(true);
  expect(r.eclipseFired).toBe(true);
  expect(r.scoreWiped).toBeNull();                 // tricks excluded from the wipe
  expect(r.shieldOffAfter).toBe(2);
});
it("eclipse + 7+ number on the other side: round voided — number never scores", () => {
  const r = resolveRound({ ...B, p1Card: E("eclipse"), p2Card: E("angel") });
  expect(r.voided).toBe(true);
  expect(r.p1Points).toBe(0); expect(r.p2Points).toBe(0);
  expect(r.shieldOffAfter).toBe(2);
});
