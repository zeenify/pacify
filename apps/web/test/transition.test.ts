import { describe, expect, it } from "vitest";
import { planFor, resolveVariant } from "../src/lib/transition";

describe("transition variant resolution", () => {
  it("story → duel is the battle variant regardless of query strings", () => {
    expect(resolveVariant("/story", "/duel?encounter=x", "forward")).toBe("battle");
    expect(resolveVariant("/story?encounter=a&after=1", "/duel?encounter=a", "forward")).toBe("battle");
  });
  it("into story is the curtain variant (duel result → epilogue included)", () => {
    expect(resolveVariant("/duel", "/story?encounter=x&after=1", "forward")).toBe("curtain");
    expect(resolveVariant("/campaign", "/story?encounter=x", "forward")).toBe("curtain");
  });
  it("login → load → start → menu flow is the enroll variant", () => {
    expect(resolveVariant("/login", "/load", "forward")).toBe("enroll");
    expect(resolveVariant("/load", "/start", "forward")).toBe("enroll");
    expect(resolveVariant("/start", "/menu", "forward")).toBe("enroll");
    // menu onward is default — the flow ended
    expect(resolveVariant("/menu", "/campaign", "forward")).toBe("default");
  });
  it("utility screens are shorter on both arrival and departure", () => {
    expect(resolveVariant("/menu", "/options", "forward")).toBe("utility");
    expect(resolveVariant("/howto", "/menu", "forward")).toBe("utility");
    expect(resolveVariant("/sfx-test", "/campaign", "forward")).toBe("utility");
  });
  it("exits unwind with the short back mirror — the nav layer passes kind 'back'", () => {
    expect(resolveVariant("/duel", "/campaign", "back")).toBe("back");
    expect(resolveVariant("/dossier", "/menu", "back")).toBe("back");
    expect(resolveVariant("/profile", "/", "back")).toBe("back");
    // battle outranks exit rules even when a replace lands on a hub path
    expect(resolveVariant("/story", "/duel", "forward")).toBe("battle");
    // forward into a hub is not an unwind (menu → campaign push)
    expect(resolveVariant("/menu", "/campaign", "forward")).toBe("default");
  });
  it("explicit back kind always wins", () => {
    expect(resolveVariant("/menu", "/campaign", "back")).toBe("back");
    expect(resolveVariant("/story", "/duel", "back")).toBe("back");
  });
  it("everything else is the default calling-card cut", () => {
    expect(resolveVariant("/menu", "/campaign", "forward")).toBe("default");
    expect(resolveVariant("/campaign", "/dossier", "forward")).toBe("default");
  });
});

describe("transition beat plans", () => {
  it("default forward matches the Calling Card v2 choreography", () => {
    const plan = planFor("default");
    expect(plan).toMatchObject({ kind: "forward", durationMs: 1100, coveredMs: 440, swapAtMs: 440, stampAtMs: 420, bladeAtMs: 700, revealAtMs: 780, revealMs: 320 });
    expect(plan.stampText).toBeUndefined(); // stamp text comes from the target path
  });
  it("battle is the longest and holds the DUEL stamp before the blade", () => {
    const plan = planFor("battle");
    expect(plan.durationMs).toBe(1300);
    expect(plan.coveredMs).toBeGreaterThan(planFor("default").coveredMs);
    expect(plan.bladeAtMs).toBeGreaterThan(plan.swapAtMs);
  });
  it("curtain has no blade or stamp; utility is shorter; back is the pocket mirror", () => {
    expect(planFor("curtain").bladeAtMs).toBeNull();
    expect(planFor("curtain").stampAtMs).toBeNull();
    expect(planFor("utility").durationMs).toBeLessThan(planFor("default").durationMs);
    expect(planFor("back")).toMatchObject({ kind: "back", durationMs: 550, bladeAtMs: null, stampAtMs: null, coveredMs: 210, revealAtMs: 260, revealMs: 290 });
  });
  it("every plan's beats fit inside its duration", () => {
    for (const variant of ["default", "utility", "battle", "curtain", "enroll", "back"] as const) {
      const plan = planFor(variant);
      const lastBeat = Math.max(plan.revealAtMs, plan.bladeAtMs ?? 0, plan.stampAtMs ?? 0) + plan.revealMs;
      expect(lastBeat).toBeLessThanOrEqual(plan.durationMs + 60); // the tail may overlap the end
    }
  });
  it("stamps carry the destination for the variants that read it", () => {
    expect(resolveVariant("/menu", "/campaign", "forward")).toBe("default");
  });
});
