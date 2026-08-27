import { describe, it, expect } from "vitest";
import type { BrainView, Card } from "@pacify/engine";
import { chooseGodCard } from "../src/index.js";

const map: Record<string, { power: number | null; align?: "good" | "bad" }> = {
  bandit: { power: 1, align: "bad" }, paladin: { power: 2, align: "good" },
  ogre: { power: 3, align: "bad" }, knight: { power: 4, align: "good" },
  witch: { power: 5, align: "bad" }, wizard: { power: 6, align: "good" },
  demon: { power: 7, align: "bad" }, angel: { power: 8, align: "good" },
  void: { power: null }, echo: { power: null }, reversal: { power: 4 },
  oracle: { power: 3 }, ward: { power: 3 },
};
const toCard = (id: string): Card => ({
  kind: ["void", "echo", "reversal", "oracle", "ward"].includes(id) ? "trick" : "number",
  id: id as any, name: id[0].toUpperCase() + id.slice(1),
  power: map[id].power, align: map[id].align as any,
});

function view(hand: string[], opp: string[], opts: Partial<BrainView> = {}): BrainView {
  return {
    studentId: 2, round: 1, phase: "commit",
    myScore: 0, oppScore: 0,
    myHand: hand.map(toCard), burned: [],
    peeked: opp.map(toCard), // full knowledge — isolates strategy from guessing
    echoNext: false, rngState: 1, ...opts,
  };
}

describe("reversal strategy — the user's proposed heuristics", () => {
  it("STRONG hand: dumps Reversal early instead of holding it to R5 (liability when ahead)", () => {
    // Monster hand + Reversal vs a weak known hand → will be AHEAD by R5,
    // so holding Reversal = handing back the lead at the swap.
    const v = view(["angel", "demon", "wizard", "reversal", "ward"], ["bandit", "paladin", "ogre", "witch", "void"]);
    const pick = chooseGodCard(v);
    console.log(`strong hand R1 pick: ${pick.name}`);
    expect(pick.id).toBe("reversal"); // dump it now — swap is harmless at 0-0-ish
  });

  it("WEAK hand: saves Reversal for the late steal", () => {
    // Trash hand + Reversal vs a strong known hand → will be BEHIND at R5,
    // so the swap is the only win condition — Reversal must be held.
    const v = view(["bandit", "paladin", "ogre", "reversal", "void"], ["angel", "demon", "wizard", "knight", "witch"]);
    const pick = chooseGodCard(v);
    console.log(`weak hand R1 pick: ${pick.name}`);
    expect(pick.id).not.toBe("reversal"); // do NOT waste the steal early
  });

  it("shield knowledge: locks the game with a shield card vs Good-heavy pool", () => {
    // Opp pool is Good-heavy + Reversal: Knight/Paladin shield vs ALL their Good
    // cards (0 everywhere, unlosable), while Bad cards risk scoring swings vs Reversal.
    const v = view(["knight", "witch", "demon", "paladin", "ward"], ["angel", "wizard", "knight", "paladin", "reversal"]);
    const pick = chooseGodCard(v);
    console.log(`vs Good-heavy pool pick: ${pick.name}`);
    // Shield awareness: picks a shield card over the scorer (Demon scores vs Good
    // but leads → dies to the known Reversal). Knight and Paladin both wall.
    expect(["knight", "paladin"]).toContain(pick.id);
  });
});
