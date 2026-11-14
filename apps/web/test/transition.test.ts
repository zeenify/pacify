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
  it("default forward matches the Calling Card Cut timings", () => {
    const plan = planFor("default");
    expect(plan).toMatchObject({ kind: "forward", durationMs: 600, coverMs: 220, swapAtMs: 260, bladeAtMs: 300, revealMs: 300 });
  });
  it("battle is longer and holds the stamp before the blade", () => {
    const plan = planFor("battle");
    expect(plan.durationMs).toBe(800);
    expect(plan.coverMs).toBeGreaterThan(planFor("default").coverMs);
    expect(plan.bladeAtMs).toBeGreaterThan(plan.swapAtMs);
  });
  it("curtain has no blade; utility is shorter; back is fixed at 400ms", () => {
    expect(planFor("curtain").bladeAtMs).toBeNull();
    expect(planFor("utility").durationMs).toBeLessThan(planFor("default").durationMs);
    expect(planFor("back")).toMatchObject({ kind: "back", durationMs: 400, bladeAtMs: null, coverMs: 150, revealMs: 210 });
  });
  it("every plan's beats fit inside its duration", () => {
    for (const variant of ["default", "utility", "battle", "curtain", "enroll", "back"] as const) {
      const plan = planFor(variant);
      const lastBeat = Math.max(plan.swapAtMs, plan.bladeAtMs ?? 0, plan.coverMs) + plan.revealMs;
      expect(lastBeat).toBeLessThanOrEqual(plan.durationMs + 60); // reveal may overlap the tail
    }
  });
});
