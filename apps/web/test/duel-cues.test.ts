import { describe, it, expect } from "vitest";
import { cuesForStep, shouldDuckBgm, EXECUTED_LETTERS, ORACLE_GLINTS, SHARD_COUNT } from "../src/lib/duel-cues";
import { SFX, type SfxName } from "../src/lib/sfx-manifest";
import type { SeqStep } from "../src/screens/duel";

const cues = (s: SeqStep) => cuesForStep(s);
const at = (s: SeqStep, name: SfxName) => cues(s).filter((e) => e.cue === name).map((e) => e.at);
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);

describe("every emitted cue exists in the manifest", () => {
  const ALL: SeqStep[] = [
    { kind: "showdown", ms: 3000 },
    { kind: "flip", ms: 900 },
    { kind: "shieldbreak", ms: 3200 },
    { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 },
    { kind: "clash", ms: 3600, mode: "shield", you: 5, klein: 9, align: "good" },
    { kind: "clash", ms: 3200, mode: "tie", you: 6, klein: 6 },
    { kind: "award", ms: 1500, p1After: 3, p2After: 0, p1Pts: 3 },
    { kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" },
    { kind: "drain", ms: 1500, side: "p1", from: 5, tickMs: 200 },
    { kind: "trick", ms: 4800, trick: "void" },
    { kind: "trick", ms: 4000, trick: "echo" },
    { kind: "trick", ms: 4000, trick: "eclipse" },
    { kind: "trick", ms: 6200, trick: "ward" },
    { kind: "trick", ms: 4600, trick: "reversal", p1After: 2, p2After: 9, preP1: 9, preP2: 2 },
    { kind: "trick", ms: 4400, trick: "executioner", wipedSide: "p1", preP1: 6, preP2: 5 },
    { kind: "trick", ms: 3700, trick: "execfail", wipedSide: "p1" },
    { kind: "trick", ms: 4600, trick: "oracle", peekCount: 2 },
    { kind: "idle", ms: 500 },
  ];
  it("resolves every cue name", () => {
    for (const step of ALL) {
      for (const e of cues(step)) {
        expect(SFX[e.cue], `${step.kind}/${(step as any).trick ?? (step as any).mode ?? ""} emitted unknown cue "${e.cue}"`).toBeDefined();
      }
    }
  });
  it("never emits a negative offset", () => {
    for (const step of ALL) for (const e of cues(step)) expect(e.at, `${step.kind} ${e.cue}`).toBeGreaterThanOrEqual(0);
  });
  it("never emits past its own step budget", () => {
    for (const step of ALL) for (const e of cues(step)) {
      expect(e.at, `${step.kind} ${e.cue} at ${e.at} exceeds step.ms ${step.ms}`).toBeLessThanOrEqual(step.ms);
    }
  });
});

describe("showdown — spec §7.1", () => {
  const s: SeqStep = { kind: "showdown", ms: 3000 };
  it("fires exactly three rising ticks on the 1000ms sub-tick", () => {
    expect(at(s, "duel.showdown.tick")).toEqual([0, 1000, 2000]);
    const pitches = cues(s).map((e) => e.pitch);
    expect(pitches).toEqual([1.0, 1.12, 1.26]);
  });
});

describe("flip — spec §7.2", () => {
  const s: SeqStep = { kind: "flip", ms: 900 };
  it("whoosh on the back swing, snap on the face at 210ms", () => {
    expect(at(s, "duel.flip.whoosh")).toEqual([0]);
    expect(at(s, "duel.flip.snap")).toEqual([210]);
  });
});

describe("shieldbreak — spec §7.3", () => {
  const s: SeqStep = { kind: "shieldbreak", ms: 3200 };
  it("slam, three rising cracks, shatter, two stamps", () => {
    expect(at(s, "trick.shieldbreak.slam")).toEqual([0]);
    expect(at(s, "trick.shieldbreak.crack")).toEqual([950, 1100, 1250]);
    expect(at(s, "trick.shieldbreak.shatter")).toEqual([1350]);
    expect(at(s, "duel.stamp")).toEqual([1800, 2150]);
  });
  it("the second stamp is the quiet sub-line variant", () => {
    const stamps = cues(s).filter((e) => e.cue === "duel.stamp");
    expect(stamps[1].gain).toBe(0.5);
    expect(stamps[1].pitch).toBe(0.9);
  });
});

describe("clash shield mode — spec §7.4", () => {
  const s: SeqStep = { kind: "clash", ms: 3600, mode: "shield", you: 5, klein: 9, align: "good" };
  it("plates at 100/220, VS at 380, banner at 850, smash at 1500, stamp at 1800, ring at 1900", () => {
    expect(at(s, "duel.shield.pop")).toEqual([100, 220]);
    expect(at(s, "duel.clash.vs")).toEqual([380]);
    expect(at(s, "duel.shield.banner")).toEqual([850]);
    expect(at(s, "duel.nullify.smash")).toEqual([1500]);
    expect(at(s, "duel.stamp")).toEqual([1800]);
    expect(at(s, "duel.nullify.ring")).toEqual([1900]);
  });
  it("emits no countdown ticks — there is no countdown in shield mode", () => {
    expect(at(s, "duel.clash.tick")).toEqual([]);
  });
});

describe("clash power mode — spec §7.5", () => {
  it("ticks every 500ms up to maxTick = min(you, klein)", () => {
    const s: SeqStep = { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 };
    expect(at(s, "duel.clash.tick")).toEqual([500, 1000, 1500, 2000, 2500, 3000, 3500]);
  });
  it("lock-in, lock-out, win and shatter all land on the freeze tick", () => {
    const s: SeqStep = { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 };
    const freeze = 500 * Math.min(10, 7);
    expect(at(s, "duel.clash.lockIn")).toEqual([freeze]);
    expect(at(s, "duel.clash.lockOut")).toEqual([freeze]);
    expect(at(s, "duel.card.win")).toEqual([freeze]);
    expect(at(s, "duel.card.shatter")[0]).toBe(freeze + 40);
  });
  it("tick pitch rises with the countdown", () => {
    const s: SeqStep = { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 };
    const p = cues(s).filter((e) => e.cue === "duel.clash.tick").map((e) => e.pitch as number);
    for (let i = 1; i < p.length; i++) expect(p[i], `tick ${i}`).toBeGreaterThan(p[i - 1]);
  });
  it("handles maxTick = 0 — the freeze is immediate (duel.tsx:617)", () => {
    const s: SeqStep = { kind: "clash", ms: 1200, mode: "power", you: 3, klein: 0, ticks: 1 };
    expect(at(s, "duel.clash.tick")).toEqual([]);
    expect(at(s, "duel.clash.lockIn")).toEqual([0]);
  });
  it("emits ten shard debris voices", () => {
    const s: SeqStep = { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 };
    expect(cues(s).filter((e) => e.cue === "duel.card.shatter")).toHaveLength(SHARD_COUNT);
    expect(SHARD_COUNT).toBe(10);
  });
});

describe("clash tie mode — spec §7.5", () => {
  const s: SeqStep = { kind: "clash", ms: 3200, mode: "tie", you: 6, klein: 6 };
  it("shatters BOTH sides and stamps TIE", () => {
    expect(at(s, "duel.stamp")).toEqual([500 * 6 + 120]);
    // two full shard fans, one per side
    expect(cues(s).filter((e) => e.cue === "duel.card.shatter")).toHaveLength(SHARD_COUNT * 2);
  });
  it("pans the two sides apart", () => {
    const pans = cues(s).filter((e) => e.cue === "duel.card.shatter").map((e) => e.pan as number);
    expect(Math.min(...pans)).toBeLessThan(0);
    expect(Math.max(...pans)).toBeGreaterThan(0);
  });
});

describe("multmash — spec §7.6", () => {
  const s: SeqStep = { kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" };
  it("chip flies from 0, charge at 60, impact and stamp together at 1500", () => {
    expect(at(s, "score.chip.fly")).toEqual([0]);
    expect(at(s, "score.mult.charge")).toEqual([60]);
    expect(at(s, "score.mult.impact")).toEqual([1500]);
    expect(at(s, "duel.stamp")).toEqual([1500]);
  });
  it("the x-N stamp is the loud variant", () => {
    expect(cues(s).find((e) => e.cue === "duel.stamp")?.gain).toBe(1.2);
  });
});

describe("award — spec §7.7", () => {
  it("flies at 0, lands at 1300, panned to the winner", () => {
    const p1: SeqStep = { kind: "award", ms: 1500, p1After: 3, p2After: 0, p1Pts: 3 };
    expect(at(p1, "score.award.fly")).toEqual([0]);
    expect(at(p1, "score.award.land")).toEqual([1300]);
    expect(cues(p1).find((e) => e.cue === "score.award.fly")?.pan).toBeGreaterThan(0);
    const p2: SeqStep = { kind: "award", ms: 1400, p1After: 0, p2After: 3, p2Pts: 3 };
    expect(cues(p2).find((e) => e.cue === "score.award.fly")?.pan).toBeLessThan(0);
  });
});

describe("drain — spec §7.8", () => {
  it("ticks once per point on the adaptive tickMs", () => {
    const s: SeqStep = { kind: "drain", ms: 1700, side: "p1", from: 5, tickMs: 200 };
    expect(at(s, "score.drain.tick")).toEqual([200, 400, 600, 800, 1000]);
  });
  it("handles the fastest legal tick rate (90ms)", () => {
    const s: SeqStep = { kind: "drain", ms: 2000, side: "p2", from: 14, tickMs: 90 };
    expect(at(s, "score.drain.tick")).toHaveLength(14);
    expect(at(s, "score.drain.tick")[0]).toBe(90);
  });
});

describe("VOID — spec §7.9", () => {
  const s: SeqStep = { kind: "trick", ms: 4800, trick: "void" };
  it("devour lands on the canvas shock frame at 2280", () => {
    expect(at(s, "trick.void.devour")).toEqual([2280]);
    expect(at(s, "trick.void.open")).toEqual([0]);
    expect(at(s, "trick.void.reality")).toEqual([500]);
    expect(at(s, "trick.void.suck")).toEqual([1200]);
    expect(at(s, "duel.stamp")).toEqual([2600]);
    expect(at(s, "trick.void.die")).toEqual([4100]);
  });
  it("ducks the BGM", () => { expect(shouldDuckBgm(s)).toBe(true); });
});

describe("ECHO — spec §7.10", () => {
  const s: SeqStep = { kind: "trick", ms: 4000, trick: "echo" };
  it("three rings each a fifth lower", () => {
    expect(at(s, "trick.echo.ring")).toEqual([120, 250, 380]);
    const p = cues(s).filter((e) => e.cue === "trick.echo.ring").map((e) => e.pitch as number);
    expect(p[0]).toBeCloseTo(1.0, 5);
    expect(p[1]).toBeCloseTo(0.8, 5);
    expect(p[2]).toBeCloseTo(2 / 3, 3);      // a fifth down
  });
  it("chip pops at 800 and lobs at 900", () => {
    expect(at(s, "score.chip.pop")).toEqual([800]);
    expect(at(s, "score.chip.fly")).toEqual([900]);
  });
});

describe("ECLIPSE — spec §7.11", () => {
  const s: SeqStep = { kind: "trick", ms: 4000, trick: "eclipse" };
  it("drone, corona, stamp, two glyphs, crack, lob", () => {
    expect(at(s, "trick.eclipse.drone")).toEqual([0]);
    expect(at(s, "trick.eclipse.corona")).toEqual([300]);
    expect(at(s, "duel.stamp")).toEqual([400]);
    expect(at(s, "trick.eclipse.glyph")).toEqual([1450, 1540]);
    expect(at(s, "trick.eclipse.crack")).toEqual([1600]);
    expect(at(s, "score.chip.fly")).toEqual([1900]);
  });
});

describe("WARD — spec §7.12", () => {
  const s: SeqStep = { kind: "trick", ms: 6200, trick: "ward" };
  it("seal, eye, projectile, flare, impact, fire, ash, stamp", () => {
    expect(at(s, "trick.ward.seal")).toEqual([180]);
    expect(at(s, "trick.ward.eye")).toEqual([500]);
    expect(at(s, "trick.ward.projectile")).toEqual([650]);
    expect(at(s, "trick.ward.flare")).toEqual([800]);
    expect(at(s, "trick.ward.impact")).toEqual([1100]);
    expect(at(s, "trick.ward.fire")).toEqual([2400]);
    expect(at(s, "trick.ward.ash")).toEqual([4700]);
    expect(at(s, "duel.stamp")).toEqual([4900]);
  });
});

describe("REVERSAL — spec §7.13", () => {
  const s: SeqStep = { kind: "trick", ms: 4600, trick: "reversal", p1After: 2, p2After: 9, preP1: 9, preP2: 2 };
  it("vortex, burst at 1100 with two opposite-panned score flights, stamp at 2300", () => {
    expect(at(s, "trick.reversal.vortex")).toEqual([0]);
    expect(at(s, "trick.reversal.burst")).toEqual([1100]);
    const flies = cues(s).filter((e) => e.cue === "score.chip.fly");
    expect(flies.map((e) => e.at)).toEqual([1100, 1100]);
    expect(flies[0].pan).toBeLessThan(0);
    expect(flies[1].pan).toBeGreaterThan(0);
    expect(at(s, "duel.stamp")).toEqual([2300]);
  });
});

describe("EXECUTIONER — spec §7.14", () => {
  const s: SeqStep = { kind: "trick", ms: 4400, trick: "executioner", wipedSide: "p1", preP1: 6, preP2: 5 };
  it("the blade drops at 2350", () => {
    expect(at(s, "trick.exec.bladeDrop")).toEqual([2350]);
  });
  it("full beat order", () => {
    expect(at(s, "trick.exec.rise")).toEqual([0]);
    expect(at(s, "trick.exec.meter")).toEqual([520]);
    expect(at(s, "trick.exec.target")).toEqual([820]);
    expect(at(s, "trick.exec.zone")).toEqual([1560]);
    expect(at(s, "duel.stamp")).toEqual([1600]);
    expect(at(s, "trick.exec.bladeHold")).toEqual([1650]);
    expect(at(s, "trick.exec.rope")).toEqual([2160]);
    expect(at(s, "trick.exec.chop")).toEqual([2500]);
    expect(at(s, "trick.exec.shake")).toEqual([2530]);
    expect(at(s, "trick.exec.scoreZero")).toEqual([3280]);
    expect(at(s, "trick.exec.exit")).toEqual([3820]);
  });
  it("one letter slam per letter of EXECUTED, 55ms apart from 2880", () => {
    const letters = at(s, "trick.exec.letters");
    expect(letters).toHaveLength(EXECUTED_LETTERS);
    expect("EXECUTED".length).toBe(EXECUTED_LETTERS);
    expect(letters[0]).toBe(2880);
    expect(letters[letters.length - 1]).toBe(2880 + 55 * 7);
  });
  it("does NOT emit the misfire-only cues", () => {
    expect(at(s, "trick.exec.strain")).toEqual([]);
    expect(at(s, "trick.exec.sub")).toEqual([]);
  });
});

describe("EXECUTIONER misfire — spec §7.15", () => {
  const s: SeqStep = { kind: "trick", ms: 3700, trick: "execfail", wipedSide: "p1" };
  it("strains but never drops the blade", () => {
    expect(at(s, "trick.exec.bladeDrop")).toEqual([]);
    expect(at(s, "trick.exec.chop")).toEqual([]);
    expect(at(s, "trick.exec.strain")).toEqual([1560]);
  });
  it("shares rise/exit with the real execution, detunes the meter", () => {
    expect(at(s, "trick.exec.rise")).toEqual([0]);
    expect(at(s, "trick.exec.exit")).toEqual([3300]);
    expect(cues(s).find((e) => e.cue === "trick.exec.meter")?.pitch).toBeLessThan(1);
    expect(at(s, "duel.stamp")).toEqual([2210]);
    expect(at(s, "trick.exec.sub")).toEqual([2560]);
  });
});

describe("ORACLE — spec §7.16", () => {
  it("yours: one face burn per peeked card", () => {
    const s = { kind: "trick", ms: 4600, trick: "oracle", peekCards: [{ id: "angel" }, { id: "ogre" }] } as unknown as SeqStep;
    expect(at(s, "trick.oracle.face")).toEqual([2100, 2340]);
  });
  it("Klein's: no face burns, the player never sees the cards", () => {
    const s: SeqStep = { kind: "trick", ms: 4600, trick: "oracle", peekCount: 2 };
    expect(at(s, "trick.oracle.face")).toEqual([]);
  });
  it("veil, lens, scan, constellation, stamp, glints", () => {
    const s: SeqStep = { kind: "trick", ms: 4600, trick: "oracle", peekCount: 2 };
    expect(at(s, "trick.oracle.veil")).toEqual([0]);
    expect(at(s, "trick.oracle.lens")).toEqual([0]);
    expect(at(s, "trick.oracle.scan")).toEqual([350]);
    expect(at(s, "trick.oracle.constellation")).toEqual([600]);
    expect(at(s, "duel.stamp")).toEqual([2100]);
    expect(at(s, "trick.oracle.glint")).toHaveLength(ORACLE_GLINTS);
    expect(at(s, "trick.oracle.glint")[0]).toBe(3000);
    expect(at(s, "score.chip.fly")[0]).toBe(3450);
  });
});

describe("idle — spec §7.17", () => {
  it("is silent on purpose", () => {
    expect(cues({ kind: "idle", ms: 500 })).toEqual([]);
  });
});

describe("BGM ducking — spec §8", () => {
  it("ducks for trick and multmash steps only", () => {
    expect(shouldDuckBgm({ kind: "trick", ms: 4800, trick: "void" })).toBe(true);
    expect(shouldDuckBgm({ kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" })).toBe(true);
    expect(shouldDuckBgm({ kind: "showdown", ms: 3000 })).toBe(false);
    expect(shouldDuckBgm({ kind: "flip", ms: 900 })).toBe(false);
    expect(shouldDuckBgm({ kind: "clash", ms: 3600, mode: "shield" })).toBe(false);
    expect(shouldDuckBgm({ kind: "award", ms: 1500, p1After: 1, p2After: 0 })).toBe(false);
    expect(shouldDuckBgm({ kind: "idle", ms: 500 })).toBe(false);
  });
});
