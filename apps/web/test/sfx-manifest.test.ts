import { describe, it, expect } from "vitest";
import { existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { SFX, SFX_NAMES, cueFile, resolvePitch, resolvePan, type SfxName } from "../src/lib/sfx-manifest";

const PUBLIC = resolve(new URL("..", import.meta.url).pathname.replace(/^\//, ""), "public");
const pathFor = (src: string) => join(PUBLIC, src.replace(/^\//, ""));

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

describe("assets exist on disk (integration gate)", () => {
  it("every manifest src resolves to a real file in public/", () => {
    const missing = Object.entries(SFX)
      .filter(([, def]) => !existsSync(pathFor(def.src)))
      .map(([name, def]) => `${name} -> ${def.src}`);
    expect(missing, `missing assets:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("every public/sfx file is referenced by at least one cue", () => {
    const referenced = new Set(Object.values(SFX).map((d) => d.src.replace(/^\//, "")));
    referenced.add("hover.wav");                       // lives at public/ root, not public/sfx/
    const onDisk = readdirSync(join(PUBLIC, "sfx")).filter((f) => f.endsWith(".wav")).map((f) => `sfx/${f}`);
    const orphans = onDisk.filter((f) => !referenced.has(f));
    expect(orphans, `orphan assets:\n  ${orphans.join("\n  ")}`).toEqual([]);
  });

  it("total SFX weight is within the 16MB budget", () => {
    const files = readdirSync(join(PUBLIC, "sfx")).filter((f) => f.endsWith(".wav")).map((f) => join(PUBLIC, "sfx", f));
    files.push(join(PUBLIC, "hover.wav"));
    const bytes = files.reduce((a, f) => a + statSync(f).size, 0);
    expect(bytes, `${(bytes / 1048576).toFixed(2)} MB across ${files.length} files`).toBeLessThan(16 * 1048576);
  });

  it("every cue emitted by duel-cues has a real file", async () => {
    const { cuesForStep } = await import("../src/lib/duel-cues");
    const steps: any[] = [
      { kind: "showdown", ms: 3000 }, { kind: "flip", ms: 900 }, { kind: "shieldbreak", ms: 3200 },
      { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 },
      { kind: "clash", ms: 3600, mode: "shield", you: 5, klein: 9, align: "good" },
      { kind: "clash", ms: 4200, mode: "tie", you: 6, klein: 6 },
      { kind: "award", ms: 1500, p1After: 3, p2After: 0, p1Pts: 3 },
      { kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" },
      { kind: "drain", ms: 1700, side: "p1", from: 5, tickMs: 200 },
      ...["void", "echo", "eclipse", "ward", "reversal", "executioner", "execfail", "oracle"]
        .map((trick) => ({ kind: "trick", ms: 6200, trick })),
      { kind: "idle", ms: 500 },
    ];
    const missing = new Set<string>();
    for (const st of steps) for (const e of cuesForStep(st)) {
      if (!existsSync(pathFor(cueFile(e.cue)))) missing.add(`${e.cue} -> ${cueFile(e.cue)}`);
    }
    expect([...missing], `unrendered cues:\n  ${[...missing].join("\n  ")}`).toEqual([]);
  });
});
