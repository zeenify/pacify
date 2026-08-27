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
const toCard = (id: string): Card => {
  const m = map[id];
  return {
    kind: ["void", "echo", "reversal", "oracle", "ward"].includes(id) ? "trick" : "number",
    id: id as any, name: id[0].toUpperCase() + id.slice(1), power: m.power, align: m.align as any,
  };
};

describe("CHEAT R1 replication — seed 1613448261", () => {
  it("prints P(win) per card for Klein's known state", () => {
    const kleinHand = ["reversal", "ogre", "angel", "echo", "demon"].map(toCard);
    const userHand = ["paladin", "oracle", "knight", "wizard", "void"].map(toCard);
    const view: BrainView = {
      studentId: 2, round: 1, phase: "commit",
      myScore: 0, oppScore: 0,
      myHand: kleinHand, burned: [],
      peeked: userHand, // CHEAT: full hand
      shieldOff: 0,
      echoNext: false, rngState: 1,
    };
    const pick = chooseGodCard(view);
    console.log(`GOD pick: ${pick.name}`);
    expect(["Reversal", "Ogre", "Angel", "Echo", "Demon"]).toContain(pick.name);
  });
});
