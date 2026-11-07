import { describe, expect, it } from "vitest";
import { createDuel, dispatch, type CardId } from "@pacify/engine";
import { restoreEncounter, kleinChallengePath } from "../src/lib/encounter";

describe("encounter resume", () => {
  it("restores the original seeded deal rather than rerolling on reload", () => {
    const resumed = restoreEncounter(12345, []);
    expect(resumed.state.p1Hand.map((c) => c.id)).toEqual(createDuel({ seed: 12345, studentId: 2 }).p1Hand.map((c) => c.id));
    expect(resumed.state.round).toBe(1);
    expect(resumed.results).toEqual([]);
  });
  it("rebuilds revealed state and round context from cards, not claimed scores", () => {
    let state = createDuel({ seed: 12345, studentId: 2 });
    const p1 = state.p1Hand[0].id, p2 = state.p2Hand[0].id;
    state = dispatch(state, { t: "lock_ai", cardId: p2 }).state;
    state = dispatch(state, { t: "lock_player", cardId: p1 }).state;
    const result = restoreEncounter(12345, [{ round: 1, p1, p2 }]);
    expect(result.state.round).toBe(2);
    expect(result.state.p1Score).toBe(state.p1Score);
    expect(result.state.p2Score).toBe(state.p2Score);
    expect(result.state.p1Hand).toHaveLength(6);
    expect(result.state.p2Hand).toHaveLength(6);
    expect(result.results[0].youScore).toBe(state.p1Score);
    expect(result.results[0].kleinScore).toBe(state.p2Score);
  });
  it("does not silently play a substitute when a saved card is invalid", () => {
    expect(() => restoreEncounter(12345, [{ round: 1, p1: "missing" as CardId, p2: "ward" }])).toThrow();
  });
  it("creates distinct reload-safe encounter URLs for each challenge", () => {
    const a = kleinChallengePath(), b = kleinChallengePath();
    expect(a).toMatch(/^\/story\?encounter=[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });
});
