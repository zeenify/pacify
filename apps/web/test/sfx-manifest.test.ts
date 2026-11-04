import { describe, it, expect } from "vitest";
import { SFX, SFX_NAMES, cueFile, resolvePitch, resolvePan, type SfxName } from "../src/lib/sfx-manifest";

describe("sfx manifest structure", () => {
  it("has no duplicate entries and SFX_NAMES matches the object", () => {
    const keys = Object.keys(SFX) as SfxName[];
    expect(new Set(keys).size).toBe(keys.length);
    expect(SFX_NAMES.length).toBe(keys.length);
    for (const n of SFX_NAMES) expect(keys).toContain(n);
  });

  it("every src is an absolute public path to a .wav", () => {
    for (const [name, def] of Object.entries(SFX)) {
      expect(def.src, name).toMatch(/^\/[a-z0-9\-./]+\.wav$/);
      expect(def.src, name).not.toContain("..");
    }
  });

  it("the four legacy sounds keep their exact existing paths (spec §7.22)", () => {
    expect(cueFile("ui.hover")).toBe("/hover.wav");
    expect(cueFile("ui.click")).toBe("/sfx/click.wav");
    expect(cueFile("ui.slider")).toBe("/sfx/slider.wav");
    expect(cueFile("ui.cardPop")).toBe("/sfx/card.wav");
  });

  it("every gain is a sane multiplier", () => {
    for (const [name, def] of Object.entries(SFX)) {
      if (def.gain === undefined) continue;
      expect(def.gain, name).toBeGreaterThan(0);
      expect(def.gain, name).toBeLessThanOrEqual(2);
    }
  });

  it("every pitch range is ordered and positive", () => {
    for (const [name, def] of Object.entries(SFX)) {
      if (def.pitch === undefined) continue;
      if (typeof def.pitch === "number") {
        expect(def.pitch, name).toBeGreaterThan(0);
      } else {
        expect(def.pitch[0], name).toBeGreaterThan(0);
        expect(def.pitch[1], name).toBeGreaterThanOrEqual(def.pitch[0]);
      }
    }
  });

  it("VOID is dry and ORACLE is the wettest family (spec §2 reverb semantics)", () => {
    for (const n of SFX_NAMES) {
      if (n.startsWith("trick.void.")) expect(SFX[n].reverb ?? 0, n).toBe(0);
      if (n.startsWith("trick.oracle.")) expect(SFX[n].reverb ?? 0, n).toBeGreaterThanOrEqual(0.5);
    }
    expect(SFX["trick.oracle.veil"].reverbIR).toBe("cathedral");
    expect(SFX["trick.void.devour"].reverbIR).toBeUndefined();
  });

  it("tick-like cues are throttled so they cannot machine-gun", () => {
    for (const n of ["duel.clash.tick", "duel.showdown.tick", "score.drain.tick", "ui.slider"] as SfxName[]) {
      expect(SFX[n].cooldownMs, n).toBeGreaterThan(0);
      expect(SFX[n].maxVoices, n).toBeLessThanOrEqual(4);
    }
  });

  it("exactly one cue loops — the WARD fire", () => {
    const loopers = SFX_NAMES.filter((n) => SFX[n].loop);
    expect(loopers).toEqual(["trick.ward.fire"]);
  });

  it("the shared assets from spec §5.5 really are shared", () => {
    const stamp = cueFile("duel.stamp");
    // the seven verdict stamps + THRESHOLD MET + SPARED + PEEKED all reuse one asset
    expect(cueFile("shame.stamp")).toBe(stamp);
    const chipFly = cueFile("score.chip.fly");
    expect(chipFly).toBe("/sfx/score-chip-fly.wav");
    expect(cueFile("trick.eclipse.crack")).toBe(cueFile("trick.shieldbreak.crack"));
    expect(cueFile("duel.showdown.tick")).toBe(cueFile("duel.clash.tick"));
    expect(cueFile("duel.error")).toBe(cueFile("ui.error"));
    expect(cueFile("score.chip.fuse")).toBe(cueFile("round.burst"));
    expect(cueFile("round.burstOut")).toBe(cueFile("round.burst"));
    expect(cueFile("ui.modal.out")).toBe(cueFile("ui.modal.in"));
  });

  it("resolvePitch and resolvePan stay inside their declared ranges", () => {
    const rand = () => 0.5;
    for (const [name, def] of Object.entries(SFX)) {
      const p = resolvePitch(def, rand);
      expect(p, name).toBeGreaterThan(0.25);
      expect(p, name).toBeLessThan(4);
      const pan = resolvePan(def, rand);
      expect(pan, name).toBeGreaterThanOrEqual(-1);
      expect(pan, name).toBeLessThanOrEqual(1);
    }
  });

  it("resolvePitch at rand=0 hits the low bound and rand=1 the high bound", () => {
    const def = { src: "/sfx/x.wav", pitch: [0.9, 1.2] as [number, number] };
    expect(resolvePitch(def, () => 0)).toBeCloseTo(0.9, 6);
    expect(resolvePitch(def, () => 1)).toBeCloseTo(1.2, 6);
  });
});
