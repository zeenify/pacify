import { afterEach, describe, expect, it } from "vitest";
import { SFX_CUES, navKind, navScale, planFor, resolveVariant, slabsFor, stampFor, transitionCues, wordFor } from "../src/lib/transition";

afterEach(() => { delete (globalThis as unknown as { __navScale?: number }).__navScale; });

describe("transition variant resolution", () => {
  it("story → duel is the battle variant regardless of query strings", () => {
    expect(resolveVariant("/story", "/duel?encounter=x", "forward")).toBe("battle");
    expect(resolveVariant("/story?encounter=a&after=1", "/duel?encounter=a", "forward")).toBe("battle");
  });
  it("into story is the curtain variant (duel result → epilogue included)", () => {
    expect(resolveVariant("/duel", "/story?encounter=x&after=1", "forward")).toBe("curtain");
    expect(resolveVariant("/campaign", "/story?encounter=x", "forward")).toBe("curtain");
  });
  it("login flow steps swap plainly — the heist belongs on menu arrival", () => {
    expect(resolveVariant("/login", "/load", "forward")).toBeNull();
    expect(resolveVariant("/load", "/start", "forward")).toBeNull();
    expect(resolveVariant("/start", "/menu", "forward")).toBe("default");
    expect(resolveVariant("/login", "/menu", "forward")).toBe("default");
    // menu onward is the default heist
    expect(resolveVariant("/menu", "/campaign", "forward")).toBe("default");
  });
  it("utility screens are shorter on both arrival and departure", () => {
    expect(resolveVariant("/menu", "/options", "forward")).toBe("utility");
    expect(resolveVariant("/howto", "/options", "forward")).toBe("utility");
    expect(resolveVariant("/sfx-test", "/campaign", "forward")).toBe("utility");
  });
  it("the back shutter plays only when an exit lands on the menu", () => {
    expect(resolveVariant("/howto", "/menu", "back")).toBe("back");
    expect(resolveVariant("/multiplayer", "/menu", "back")).toBe("back");
    // other replaces into hubs resolve forward by route — no shutter
    expect(resolveVariant("/duel", "/campaign", "back")).toBe("default");
    expect(resolveVariant("/story", "/campaign", "back")).toBe("default");
    // leaving a utility route keeps the compact tier (logout from options)
    expect(resolveVariant("/options", "/login", "back")).toBe("utility");
    // battle outranks exit rules even when a replace lands on a duel path
    expect(resolveVariant("/story", "/duel", "forward")).toBe("battle");
    // forward into a hub is not an unwind (menu → campaign push)
    expect(resolveVariant("/menu", "/campaign", "forward")).toBe("default");
  });
  it("explicit back kind into menu always wins", () => {
    expect(resolveVariant("/campaign", "/menu", "back")).toBe("back");
    expect(resolveVariant("/duel", "/menu", "back")).toBe("back");
  });
  it("everything else is the default heist takeover", () => {
    expect(resolveVariant("/menu", "/campaign", "forward")).toBe("default");
    expect(resolveVariant("/campaign", "/dossier", "forward")).toBe("default");
  });
  it("replace-kind only unwinds from real screens, never the login flow", () => {
    expect(navKind("/menu", "/howto", "replace")).toBe("back");
    expect(navKind("/menu", "/campaign", "replace")).toBe("back");
    expect(navKind("/campaign", "/story", "replace")).toBe("back");
    // start→menu is an arrival, not an exit
    expect(navKind("/menu", "/start", "replace")).toBe("forward");
    expect(navKind("/menu", "/load", "replace")).toBe("forward");
    // pushes are always forward
    expect(navKind("/campaign", "/menu", "push")).toBe("forward");
  });
});

describe("transition beat plans (HEIST TAKEOVER)", () => {
  it("default forward matches the shortened heist choreography", () => {
    const plan = planFor("default");
    expect(plan).toMatchObject({ kind: "forward", tier: "full", durationMs: 1400, coveredMs: 460, swapAtMs: 460,
      stampAtMs: 460, bladeAtMs: 900, revealAtMs: 1020, revealMs: 380 });
    expect(plan.stampText).toBeUndefined(); // stamp text comes from the target path
  });
  it("curtain shares the heist shape; battle keeps a theatrical face-off", () => {
    const curtain = planFor("curtain");
    expect(curtain).toMatchObject({ durationMs: 1400, coveredMs: 460, bladeAtMs: 900, revealAtMs: 1020, revealMs: 380 });
    const battle = planFor("battle");
    expect(battle).toMatchObject({ durationMs: 1800, coveredMs: 380, bladeAtMs: null, revealAtMs: 990, revealMs: 810 });
    expect(battle.coveredMs).toBeLessThan(planFor("default").coveredMs);
  });
  it("utility is the compact tier with a shorter hold", () => {
    expect(planFor("utility")).toMatchObject({ tier: "compact", durationMs: 1000, coveredMs: 310, bladeAtMs: 600, revealAtMs: 680 });
    expect(planFor("utility").durationMs).toBeLessThan(planFor("default").durationMs);
  });
  it("back is the shutter retreat", () => {
    expect(planFor("back")).toMatchObject({ kind: "back", durationMs: 750, bladeAtMs: null, stampAtMs: null,
      coveredMs: 250, revealAtMs: 330, revealMs: 420 });
  });
  it("every plan's beats fit inside its duration", () => {
    for (const variant of ["default", "utility", "battle", "curtain", "back"] as const) {
      const plan = planFor(variant);
      const lastBeat = Math.max(plan.revealAtMs, plan.bladeAtMs ?? 0, plan.stampAtMs ?? 0) + plan.revealMs;
      expect(lastBeat).toBeLessThanOrEqual(plan.durationMs + 60); // the tail may overlap the end
    }
  });
  it("cover always precedes the cut, and the cut precedes the split", () => {
    for (const variant of ["default", "curtain", "utility"] as const) {
      const plan = planFor(variant);
      expect(plan.coveredMs).toBeLessThan(plan.bladeAtMs ?? Infinity);
      expect((plan.bladeAtMs ?? 0)).toBeLessThan(plan.revealAtMs);
    }
    expect(planFor("battle").coveredMs).toBeLessThan(planFor("battle").revealAtMs);
    expect(planFor("back").coveredMs).toBeLessThan(planFor("back").revealAtMs);
  });
});

describe("transition audio beats", () => {
  it("schedules entrance at cover, then blade and split from the real reveal commit", () => {
    const plan = planFor("default");
    const cues = transitionCues(plan);
    expect(cues.entrance).toEqual([
      { cue: SFX_CUES.entrance, at: 0, gain: 0.3, pitch: 1 },
      { cue: SFX_CUES.stamp, at: 460, gain: 0.62, pitch: 1 },
    ]);
    expect(cues.reveal.map(({ cue, at }) => ({ cue, at }))).toEqual([
      { cue: SFX_CUES.blade, at: 0 },
      { cue: SFX_CUES.reveal, at: 120 },
    ]);
    expect(plan.bladeAtMs! + cues.reveal[1].at).toBe(plan.revealAtMs);
  });
  it("battle and back accents start with their receiving phase", () => {
    expect(transitionCues(planFor("battle")).reveal[0]).toMatchObject({ cue: SFX_CUES.reveal, at: 0 });
    expect(transitionCues(planFor("battle")).reveal[1]).toMatchObject({ cue: SFX_CUES.stamp, at: 60 });
    expect(transitionCues(planFor("back")).entrance[0]).toMatchObject({ cue: SFX_CUES.back, at: 0 });
    expect(transitionCues(planFor("back")).reveal[0]).toMatchObject({ cue: SFX_CUES.reveal, at: 0 });
  });
});

describe("route-derived transition content", () => {
  it("stamps carry the destination label", () => {
    expect(stampFor("default", "/campaign?x=1")).toBe("THE THIRTEEN");
    expect(stampFor("default", "/dossier")).toBe("DOSSIER");
    expect(stampFor("battle", "/duel")).toBe("DUEL");
    expect(stampFor("back", "/campaign")).toBeNull();
  });
  it("the marquee word prefers the payload and is capped", () => {
    expect(wordFor({ variant: "curtain", payload: { word: "klein" } })).toBe("KLEIN");
    expect(wordFor({ variant: "default", stampText: "THE THIRTEEN" })).toBe("THE THIRTEEN");
    expect(wordFor({ variant: "default" }).length).toBeLessThanOrEqual(12);
  });
  it("slab avalanche repeats the word among game-true lines", () => {
    const slabs = slabsFor("KLEIN");
    expect(slabs).toHaveLength(6);
    expect(slabs[3]).toContain("KLEIN");
    expect(slabs.join(" ")).toContain("19 CARDS");
    expect(slabs.join(" ")).toContain("NO SHIELD");
  });
  it("compact tiers omit the two end bands but keep route and game copy", () => {
    const slabs = slabsFor("KLEIN", "compact");
    expect(slabs).toHaveLength(4);
    expect(slabs[3]).toContain("KLEIN");
    expect(slabs.join(" ")).toContain("19 CARDS");
    expect(slabs.join(" ")).not.toContain("NO SHIELD");
  });
  it("navScale reads the QA slow-mo hook", () => {
    expect(navScale()).toBe(1);
    (globalThis as unknown as { __navScale?: number }).__navScale = 4;
    expect(navScale()).toBe(4);
    (globalThis as unknown as { __navScale?: number }).__navScale = 0;
    expect(navScale()).toBe(1); // never 0 or negative
    delete (globalThis as unknown as { __navScale?: number }).__navScale;
  });
});
