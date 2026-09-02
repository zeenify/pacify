import { describe, expect, it } from "vitest";
import { cardById, type BrainView, type Card } from "@pacify/engine";
import { chooseGodCard, rankMoves } from "../src/index.js";
import { Solver, type SolverState } from "../src/solver.js";

// Full-vision view builder — the same shape production sends each round
// (peeked + oppHand = the human's entire remaining hand).
function view(over: {
  round: number;
  myScore: number;
  oppScore: number;
  myHand: string[];
  oppHand: string[];
  echoNext?: boolean;
  shieldOff?: number;
  rngState?: number;
}): BrainView {
  const get = (ids: string[]): Card[] => ids.map((id) => cardById(id as Card["id"]));
  return {
    studentId: 2,
    round: over.round,
    phase: "commit",
    myScore: over.myScore,
    oppScore: over.oppScore,
    myHand: get(over.myHand),
    burned: [],
    peeked: get(over.oppHand),
    oppHand: get(over.oppHand),
    oppPeeked: [],
    shieldOff: over.shieldOff ?? 0,
    echoNext: over.echoNext ?? false,
    rngState: over.rngState ?? 7,
  };
}

const state = (v: ReturnType<typeof view>): SolverState => ({
  round: v.round,
  mine: v.myHand,
  theirs: v.oppHand!,
  myScore: v.myScore,
  theirScore: v.oppScore,
  echoNext: v.echoNext,
  shieldOff: v.shieldOff,
});

describe("solver endgames", () => {
  it("finds the forced win at match point and refuses the losing shield", () => {
    // R7 ×2, brain up 19-18. Valkyrie(8) beats Witch(5) for +6 → 25-18 win.
    // Knight(4) "blocks" nothing: same-align shield needs NUMBER-vs-NUMBER —
    // Knight(good) vs Witch(bad) is opposite-align, Witch wins +2 → 20-19 loss.
    const v = view({
      round: 7, myScore: 19, oppScore: 18,
      myHand: ["knight", "valkyrie"], oppHand: ["witch"],
    });
    const pool = rankMoves(v);
    expect(pool[0].card.id).toBe("valkyrie");
    expect(pool[0].v).toBeCloseTo(1, 5);
    expect(pool.map((m) => m.card.id)).not.toContain("knight");

    const floors = new Map(new Solver({ robustness: 1 }).cardValues(state(v)).map((c) => [c.card.id, c.floor]));
    expect(floors.get("valkyrie")).toBe(1);
    expect(floors.get("knight")).toBe(0);
  });

  it("refuses its own biggest card into a known Reversal while ahead", () => {
    // R7 ×2, brain ahead 10-0, opp's last card is Reversal.
    // Angel(12) wins the clash +12 → 22-0 → swap → 0-22 LOSS.
    // Bandit(1) loses the clash -10 → 10-10 → swap → 10-10 draw.
    const v = view({
      round: 7, myScore: 10, oppScore: 0,
      myHand: ["angel", "bandit"], oppHand: ["reversal"],
    });
    const pool = rankMoves(v);
    expect(pool[0].card.id).toBe("bandit");
    expect(pool[0].v).toBeCloseTo(0.5, 5);
    expect(pool.map((m) => m.card.id)).not.toContain("angel");
  });

  it("knows a 19-point lead is NOT safe at match point", () => {
    // R7 ×2, brain up 19-0 vs their Angel(12). Seraph(10, same align) shields
    // for 0 → 19-0 win. Bandit(1, opposite align) feeds Angel 22 → threshold loss.
    const v = view({
      round: 7, myScore: 19, oppScore: 0,
      myHand: ["seraph", "bandit"], oppHand: ["angel"],
    });
    const pool = rankMoves(v);
    expect(pool[0].card.id).toBe("seraph");
    expect(pool.map((m) => m.card.id)).not.toContain("bandit");
  });

  it("blends the worst case in: a baitable EV is not enough when the floor collapses", () => {
    // Same match-point spot, but the model says the human "shouldn't" have the
    // killer card — full vision means we KNOW they do, so kappa must keep us
    // off Bandit even at kappa=0.25 (the floor is exact, not probabilistic).
    const v = view({
      round: 7, myScore: 19, oppScore: 0,
      myHand: ["seraph", "bandit"], oppHand: ["angel"],
    });
    for (const robustness of [0.25, 0.425, 1]) {
      const pool = rankMoves(v, { robustness });
      expect(pool[0].card.id).toBe("seraph");
    }
  });
});

describe("determinism", () => {
  it("chooseGodCard is a pure function of the view", () => {
    const v = view({
      round: 3, myScore: 4, oppScore: 6,
      myHand: ["ogre", "knight", "witch", "void", "ward"],
      oppHand: ["paladin", "vampire", "echo", "executioner", "leviathan"],
    });
    const a = chooseGodCard(v, true);
    const b = chooseGodCard(v, true);
    expect(a.id).toBe(b.id);
    const pa = rankMoves(v).map((m) => [m.card.id, m.v]);
    const pb = rankMoves(v).map((m) => [m.card.id, m.v]);
    expect(pa).toEqual(pb);
  });

  it("solver values are stable across fresh instances", () => {
    const v = view({
      round: 2, myScore: 3, oppScore: 5,
      myHand: ["bandit", "wizard", "reversal", "eclipse", "oracle"],
      oppHand: ["ogre", "seraph", "ward", "echo"],
    });
    const a = new Solver().cardValues(state(v)).map((c) => [c.card.id, c.v]);
    const b = new Solver().cardValues(state(v)).map((c) => [c.card.id, c.v]);
    expect(a).toEqual(b);
  });
});
