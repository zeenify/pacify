import { describe, it, expect } from "vitest";
import { CATALOGUE, TRICKS, cardById, resolveRound, type CardId } from "@pacify/engine";
import { trickBeats, type TrickBeats } from "../src/lib/trick-beats";

const beats = (p1: CardId, p2: CardId, round = 3) =>
  trickBeats(resolveRound({
    p1Card: cardById(p1), p2Card: cardById(p2), p1Score: 4, p2Score: 4,
    round, echoNext: false, shieldOff: 0,
  }));

const NONE: TrickBeats = {
  void: false, eclipse: false, echo: false, ward: false,
  execFail: null, reversal: false, executioner: null, oracle: null,
};

describe("Ward burns the opposing trick — the burned trick never animates", () => {
  const victims = TRICKS.filter((t) => t.id !== "ward" && t.id !== "void");
  for (const t of victims) {
    it(`Ward vs ${t.name}: only the ward beat plays`, () => {
      expect(beats("ward", t.id)).toEqual({ ...NONE, ward: true });
      expect(beats(t.id, "ward")).toEqual({ ...NONE, ward: true });
    });
  }

  it("Ward vs a number fights as power 5 — no ward beat", () => {
    expect(beats("ward", "angel")).toEqual(NONE);
    expect(beats("seraph", "ward")).toEqual(NONE);
  });
});

describe("Void devours everything — no other trick animates", () => {
  for (const c of CATALOGUE.filter((x) => x.id !== "void")) {
    it(`Void vs ${c.name}: only the void beat plays`, () => {
      expect(beats("void", c.id)).toEqual({ ...NONE, void: true });
      expect(beats(c.id, "void")).toEqual({ ...NONE, void: true });
    });
  }
});

describe("unblocked tricks still fire", () => {
  it("Eclipse vs a number", () => expect(beats("eclipse", "seraph")).toEqual({ ...NONE, eclipse: true }));
  it("Echo vs a number", () => expect(beats("demon", "echo")).toEqual({ ...NONE, echo: true }));
  it("Executioner beheads a 7+ number", () => expect(beats("executioner", "valkyrie")).toEqual({ ...NONE, executioner: "p2" }));
  it("Executioner misfires on a low number", () => expect(beats("knight", "executioner")).toEqual({ ...NONE, execFail: "p2" }));
  it("Executioner misfires on Reversal, then the swap lands", () =>
    expect(beats("executioner", "reversal")).toEqual({ ...NONE, execFail: "p1", reversal: true }));
  it("Eclipse soft-voids but Executioner still swings (and misses)", () =>
    expect(beats("eclipse", "executioner")).toEqual({ ...NONE, eclipse: true, execFail: "p2" }));
  it("Echo and Oracle both fire", () => expect(beats("echo", "oracle")).toEqual({ ...NONE, echo: true, oracle: "p2" }));
  it("Echo and Eclipse both fire", () => expect(beats("echo", "eclipse")).toEqual({ ...NONE, echo: true, eclipse: true }));
});
