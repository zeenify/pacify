import { describe, expect, it } from "vitest";
import { campaignSeatMotion, nearestSeatSnap } from "../src/screens/campaign";

describe("campaign seat motion", () => {
  it("gives the centered seat more presence than seats toward the edges", () => {
    const centered = campaignSeatMotion({ offset: 0, velocity: 0, idle: 0, recoil: 0 });
    const edge = campaignSeatMotion({ offset: 1, velocity: 0, idle: 0, recoil: 0 });

    expect(centered.scale).toBeGreaterThan(edge.scale);
    expect(centered.y).toBeLessThan(edge.y);
    expect(Math.abs(centered.rotate)).toBeLessThan(Math.abs(edge.rotate));
  });

  it("leans seats with the strip and keeps extreme input bounded", () => {
    const still = campaignSeatMotion({ offset: 0, velocity: 0, idle: 0, recoil: 0 });
    const fast = campaignSeatMotion({ offset: 0, velocity: 90, idle: 0, recoil: 0 });
    const extreme = campaignSeatMotion({ offset: 99, velocity: 9999, idle: 99, recoil: -99 });

    expect(fast.rotate).not.toBe(still.rotate);
    expect(fast.x).not.toBe(still.x);
    expect(Math.abs(extreme.rotate)).toBeLessThanOrEqual(18);
    expect(Math.abs(extreme.x)).toBeLessThanOrEqual(80);
    expect(extreme.scale).toBeGreaterThan(0.8);
  });
});

describe("campaign seat snapping", () => {
  const seats = [
    { left: 0, width: 200 },
    { left: 220, width: 200 },
    { left: 440, width: 200 },
  ];

  it("centers the seat nearest the viewport's current center", () => {
    expect(nearestSeatSnap(170, 400, seats, 240)).toBe(120);
    expect(nearestSeatSnap(300, 400, seats, 240)).toBe(240);
  });

  it("clamps the snap target to the scrollable range", () => {
    expect(nearestSeatSnap(0, 400, seats, 240)).toBe(0);
    expect(nearestSeatSnap(999, 400, seats, 240)).toBe(240);
  });
});
