import { describe, it, expect } from "vitest";
import {
  CATALOGUE,
  cardById,
  dealHands,
  resolveRound,
  roundMultiplier,
  clashPoints,
  createDuel,
  dispatch,
  replayDuel,
  TOTAL_ROUNDS,
  type Card,
  type DuelAction,
} from "../src/index.js";

// config C roster
const angel = cardById("angel");       // 12 good
const demon = cardById("demon");       // 11 bad
const bandit = cardById("bandit");     // 1 bad
const paladin = cardById("paladin");   // 2 good
const knight = cardById("knight");     // 4 good
const witch = cardById("witch");       // 5 bad
const wizard = cardById("wizard");     // 6 good
const voidCard = cardById("void");
const echo = cardById("echo");
const ward = cardById("ward");         // 5
const oracle = cardById("oracle");     // 5
const reversal = cardById("reversal"); // 6
const executioner = cardById("executioner"); // 0
const eclipse = cardById("eclipse");
const ogre = cardById("ogre");         // 3 bad
const vampire = cardById("vampire");   // 7 bad
const seraph = cardById("seraph");     // 10 good
const leviathan = cardById("leviathan"); // 9 bad
const BASE = { p1Score: 0, p2Score: 0, round: 1, echoNext: false, shieldOff: 0 };

describe("catalogue", () => {
  it("has exactly 19 unique cards", () => {
    expect(CATALOGUE).toHaveLength(19);
    expect(new Set(CATALOGUE.map((c) => c.id)).size).toBe(19);
  });
  it("apex: Angel 12 good, Demon 11 bad", () => {
    expect(angel.power).toBe(12);
    expect(demon.power).toBe(11);
  });
});

describe("rng / dealing (7-card hands, cap 3)", () => {
  it("deals deterministically from the same seed", () => {
    const a = dealHands(CATALOGUE, 42);
    const b = dealHands(CATALOGUE, 42);
    expect(a[0].p1Hand.map((c) => c.id)).toEqual(b[0].p1Hand.map((c) => c.id));
    expect(a[0].p2Hand.map((c) => c.id)).toEqual(b[0].p2Hand.map((c) => c.id));
  });

  it("singleton rule: no duplicate card across BOTH hands", () => {
    for (let seed = 0; seed < 150; seed++) {
      const [{ p1Hand, p2Hand }] = dealHands(CATALOGUE, seed);
      const all = [...p1Hand, ...p2Hand].map((c) => c.id);
      expect(new Set(all).size).toBe(14);
    }
  });

  it("each hand has exactly 7 cards, at most 3 tricks", () => {
    for (let seed = 0; seed < 150; seed++) {
      const [{ p1Hand, p2Hand }] = dealHands(CATALOGUE, seed);
      for (const hand of [p1Hand, p2Hand]) {
        expect(hand).toHaveLength(7);
        expect(hand.filter((c) => c.kind === "trick").length).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("roundMultiplier — climax on R7", () => {
  it("base 1, R7 +1, echo +1, capped 3", () => {
    expect(roundMultiplier(1, false)).toBe(1);
    expect(roundMultiplier(7, false)).toBe(2);
    expect(roundMultiplier(1, true)).toBe(2);
    expect(roundMultiplier(7, true)).toBe(3); // additive cap, never ×4
  });
  it("R5 is NOT the climax anymore", () => {
    expect(roundMultiplier(5, false)).toBe(1);
  });
});

describe("clashPoints — shield + scoring", () => {
  it("opposite alignments → winner takes the diff (Angel 12 vs Bandit 1 → +11)", () => {
    expect(clashPoints(angel, bandit, false)).toEqual({ aPts: 11, bPts: 0 });
  });
  it("same alignments → shield 0 (Good vs Good)", () => {
    expect(clashPoints(angel, paladin, false)).toEqual({ aPts: 0, bPts: 0 });
  });
  it("shield OFF: same alignments score full diff", () => {
    expect(clashPoints(angel, paladin, true)).toEqual({ aPts: 10, bPts: 0 });
  });
});

describe("resolveRound — trick priority", () => {
  it("Void kills everything: no points, no flags", () => {
    const r = resolveRound({ ...BASE, p1Card: voidCard, p2Card: reversal });
    expect(r.voided).toBe(true);
    expect(r.p1Points).toBe(0);
    expect(r.reversalSwapped).toBe(false);
    expect(r.eclipseFired).toBe(false);
  });

  it("Eclipse voids the round and opens a 2-round shields-off window", () => {
    const r = resolveRound({ ...BASE, p1Card: eclipse, p2Card: angel });
    expect(r.voided).toBe(true);
    expect(r.eclipseFired).toBe(true);
    expect(r.shieldOffAfter).toBe(2);
    expect(r.p1Points).toBe(0);
  });

  it("Eclipse refreshes an active window", () => {
    const r = resolveRound({ ...BASE, shieldOff: 1, p1Card: eclipse, p2Card: angel });
    expect(r.shieldOffAfter).toBe(2);
  });

  it("shield window decays by one round", () => {
    const r = resolveRound({ ...BASE, shieldOff: 2, p1Card: angel, p2Card: bandit });
    expect(r.shieldOffAfter).toBe(1);
  });

  it("shields-off: Angel 12 vs Demon 11 (both different) → +2... same-check: good vs bad scores", () => {
    // good vs bad always scored — this test uses SAME-align pair to prove the window
    const r = resolveRound({ ...BASE, shieldOff: 1, p1Card: angel, p2Card: paladin });
    expect(r.p1Points).toBe(10); // 12 - 2, shield disabled
  });

  it("Ward blocks opponent trick + flat 5, blocked trick does not fire", () => {
    const r = resolveRound({ ...BASE, p1Card: ward, p2Card: reversal });
    expect(r.wardBlocked).toBe(true);
    expect(r.p1Points).toBe(5);
    expect(r.reversalSwapped).toBe(false);
  });

  it("Ward vs number → normal clash as a 5", () => {
    const r = resolveRound({ ...BASE, p1Card: ward, p2Card: bandit });
    expect(r.wardBlocked).toBe(false);
    expect(r.p1Points).toBe(4); // 5 vs 1
  });

  it("Ward vs Ward → both flat 5", () => {
    const r = resolveRound({ ...BASE, p1Card: ward, p2Card: cardById("ward") });
    expect(r.p1Points).toBe(5);
    expect(r.p2Points).toBe(5);
  });

  it("Echo voids the round and doubles next", () => {
    const r = resolveRound({ ...BASE, p1Card: echo, p2Card: angel });
    expect(r.voided).toBe(true);
    expect(r.echoNext).toBe(true);
    expect(r.p1Points).toBe(0);
  });

  it("Echo does not block Reversal: void + totals still swap", () => {
    const r = resolveRound({ ...BASE, p1Score: 10, p2Score: 4, p1Card: echo, p2Card: reversal });
    expect(r.voided).toBe(true);
    expect(r.reversalSwapped).toBe(true);
    expect(r.p1Score).toBe(4);
    expect(r.p2Score).toBe(10);
  });

  it("Reversal: score normally first, THEN swap totals (R7 ×2)", () => {
    // reversal 6 vs bandit 1 on R7 → +5×2=10 → totals 10-10 → swap → still 10-10
    const r = resolveRound({ ...BASE, round: 7, p1Score: 0, p2Score: 10, p1Card: reversal, p2Card: bandit });
    expect(r.p1Points).toBe(10);
    expect(r.reversalSwapped).toBe(true);
    expect(r.p1Score).toBe(10);
    expect(r.p2Score).toBe(10);
  });

  it("Executioner EXECUTES the leader: opp total score drops to 0", () => {
    // Klein leads 10-0, you play Executioner into his Angel 12 (number ≥ 7):
    // round resolves (Angel wins +12×2=24 → 24-10), then his score EXECUTES → 0.
    const r = resolveRound({ ...BASE, round: 7, p1Score: 0, p2Score: 10, p1Card: executioner, p2Card: angel });
    expect(r.p2Score).toBe(0);       // his 10 → executed to 0
    expect(r.scoreWiped).toEqual({ side: "p2" });
  });

  it("Executioner vs small card or trick: no wipe, dead 0-power body loses", () => {
    const r = resolveRound({ ...BASE, p1Card: executioner, p2Card: bandit });
    expect(r.p2Points).toBe(1);      // bandit 1 vs exec 0
    expect(r.scoreWiped).toBeNull(); // bandit < 7 — no execution
    const r2 = resolveRound({ ...BASE, p1Card: executioner, p2Card: oracle });
    expect(r2.scoreWiped).toBeNull(); // tricks excluded
  });

  it("Oracle peeks and scores as a 5", () => {
    const r = resolveRound({ ...BASE, p1Card: oracle, p2Card: bandit });
    expect(r.p1Points).toBe(4); // 5 vs 1
    expect(r.peek).toEqual({ side: "p1", count: 2 });
  });
});

// ---------- full duel (7 rounds) ----------

function lockBoth(p1: Card, p2: Card): DuelAction[] {
  return [
    { t: "lock_ai", cardId: p2.id },
    { t: "lock_player", cardId: p1.id },
  ];
}

describe("duel reducer (7 rounds)", () => {
  it("plays a full 7-round duel with fixed hands", () => {
    let state = createDuel({
      seed: 7,
      studentId: 2,
      p1Hand: [angel, demon, wizard, knight, witch, echo, reversal],
      p2Hand: [bandit, ogre, vampire, seraph, leviathan, ward, voidCard],
    });
    expect(state.phase).toBe("commit");

    const script: Card[][] = [
      [angel, bandit],   // +11
      [demon, ogre],     // tie (both bad)
      [wizard, vampire], // vampire +1
      [knight, seraph],  // tie (both good)
      [witch, leviathan],// tie (both bad)
      [echo, ward],      // ward block +5
      [reversal, voidCard],  // void kills
    ];

    for (let round = 0; round < 7; round++) {
      const [p1, p2] = script[round];
      for (const action of lockBoth(p1, p2)) {
        state = dispatch(state, action).state;
      }
      if (round < 6) {
        expect(state.phase).toBe("reveal");
        state = dispatch(state, { t: "next_round" }).state;
        expect(state.phase).toBe("commit");
      }
    }

    expect(state.phase).toBe("over");
    // R1 +11 · R2 0 · R3 -1 · R4 0 · R5 0 · R6 ward block +5 · R7 void
    expect(state.p1Score).toBe(11);
    expect(state.p2Score).toBe(6);
    expect(state.result?.winner).toBe("p1");
  });

  it("ignores next_round during commit phase", () => {
    const state = createDuel({ seed: 3, studentId: 2 });
    const res = dispatch(state, { t: "next_round" });
    expect(res.state.round).toBe(1);
    expect(res.events).toHaveLength(0);
  });

  it("eclipse window: shields off for exactly 2 rounds then decay", () => {
    let state = createDuel({
      seed: 21,
      studentId: 2,
      p1Hand: [angel, paladin, wizard, knight, witch, eclipse, reversal],
      p2Hand: [paladin, ogre, vampire, seraph, demon, ward, voidCard],
    });
    // R1: eclipse vs paladin → void, window opens
    state = dispatch(state, { t: "lock_ai", cardId: paladin.id }).state;
    state = dispatch(state, { t: "lock_player", cardId: eclipse.id }).state;
    expect(state.shieldOff).toBe(2);
    state = dispatch(state, { t: "next_round" }).state;
    // R2: angel vs ogre, shields OFF → good vs bad... angel 12 vs ogre 3 → +9 anyway;
    // prove window via same-align: wizard(6g) vs seraph(10g) would score — use paladin? spent.
    // angel vs ogre scores +9 either way; instead verify counter decays:
    expect(state.shieldOff).toBe(2);
    state = dispatch(state, { t: "lock_ai", cardId: ogre.id }).state;
    state = dispatch(state, { t: "lock_player", cardId: angel.id }).state;
    expect(state.shieldOff).toBe(1);
    state = dispatch(state, { t: "next_round" }).state;
    expect(state.shieldOff).toBe(1);
    // R3: wizard vs vampire, shields OFF → wizard 6 vs vampire 7 → vampire +1×1
    state = dispatch(state, { t: "lock_ai", cardId: vampire.id }).state;
    state = dispatch(state, { t: "lock_player", cardId: wizard.id }).state;
    expect(state.shieldOff).toBe(0);
    // window closed: same-align shield active again later — verified via decay above
  });
});

describe("replay determinism (7 rounds)", () => {
  it("same seed + same actions → identical final state", () => {
    const seed = 99;
    const run = () => {
      let state = createDuel({ seed, studentId: 2 });
      for (let r = 0; r < TOTAL_ROUNDS; r++) {
        const p1Id = state.p1Hand[0].id;
        const p2Id = state.p2Hand[0].id;
        state = dispatch(state, { t: "lock_ai", cardId: p2Id }).state;
        state = dispatch(state, { t: "lock_player", cardId: p1Id }).state;
        if (r < TOTAL_ROUNDS - 1) state = dispatch(state, { t: "next_round" }).state;
      }
      return state;
    };
    const a = run();
    const b = run();
    expect(a.p1Score).toBe(b.p1Score);
    expect(a.result).toEqual(b.result);
    expect(a.burned.map((c) => c.id)).toEqual(b.burned.map((c) => c.id));
  });

  it("replayDuel folds a transcript to the same result", () => {
    const seed = 123;
    const actions: DuelAction[] = [];
    let state = createDuel({ seed, studentId: 2 });
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      const p1Id = state.p1Hand[Math.min(2, state.p1Hand.length - 1)].id;
      const p2Id = state.p2Hand[Math.min(1, state.p2Hand.length - 1)].id;
      actions.push({ t: "lock_ai", cardId: p2Id }, { t: "lock_player", cardId: p1Id });
      state = dispatch(state, { t: "lock_ai", cardId: p2Id }).state;
      state = dispatch(state, { t: "lock_player", cardId: p1Id }).state;
      if (r < TOTAL_ROUNDS - 1) {
        actions.push({ t: "next_round" });
        state = dispatch(state, { t: "next_round" }).state;
      }
    }
    const replayed = replayDuel(seed, 2, actions);
    expect(replayed.result).toEqual(state.result);
    expect(replayed.p1Score).toBe(state.p1Score);
    expect(replayed.p2Score).toBe(state.p2Score);
  });
});
