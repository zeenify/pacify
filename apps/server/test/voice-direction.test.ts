import assert from "node:assert/strict";
import { test } from "node:test";
import { vocalCue, poseStyle, stanceStyle, revealStyle, deliveryFor } from "../src/voice-direction.js";
import type { RoundResult } from "../src/personality.js";

const round = (kleinPts: number, youPts: number): RoundResult =>
  ({ round: 1, klein: "X", you: "Y", kleinPts, youPts, kleinScore: kleinPts, youScore: youPts });

test("vocal cues map a supporting word to a congruent tag placed before it", () => {
  assert.deepEqual(vocalCue("Heh. Don't stress."), { tag: "chuckling", before: "Heh" });
  assert.deepEqual(vocalCue("Hahaha, okay wow."), { tag: "laughing", before: "Hahaha" });
  assert.deepEqual(vocalCue("Ouch. That one hurt."), { tag: "sigh", before: "Ouch" });
  assert.deepEqual(vocalCue("Whew. Got lucky there."), { tag: "exhale", before: "Whew" });
  assert.deepEqual(vocalCue("Whoa. Okay. Wow."), { tag: "gasp", before: "Whoa" });
});

test("the earliest supporting word wins when a line has several", () => {
  assert.deepEqual(vocalCue("Ouch. Heh, okay."), { tag: "sigh", before: "Ouch" });
});

test("no supporting word means no vocal tag", () => {
  assert.equal(vocalCue("That's funny."), null);
  assert.equal(vocalCue("You're way better than me."), null);
  assert.equal(vocalCue(""), null);
});

test("pose styles map to delivery tags that work on any text", () => {
  assert.equal(poseStyle("welcoming"), "warm");
  assert.equal(poseStyle("thoughtful"), "soft voice");
  assert.equal(poseStyle("serious"), "low voice");
  assert.equal(poseStyle("calculating"), "sly");
  assert.equal(poseStyle("playful"), "playful");
  assert.equal(poseStyle("neutral"), "");
});

test("stance styles map commit beats; even stays neutral", () => {
  assert.equal(stanceStyle("smug"), "smug");
  assert.equal(stanceStyle("performing"), "playful");
  assert.equal(stanceStyle("confident"), "confident");
  assert.equal(stanceStyle("guarded"), "hesitant");
  assert.equal(stanceStyle("even"), "");
});

test("reveal style follows the round outcome from Klein's perspective", () => {
  assert.equal(revealStyle(round(5, 0)), "excited");
  assert.equal(revealStyle(round(0, 5)), "sad");
  assert.equal(revealStyle(round(0, 0)), "");
});

test("deliveryFor prefers a content-supported vocal tag over the style", () => {
  assert.deepEqual(deliveryFor("Heh. Okay.", "low voice"), { tag: "chuckling", before: "Heh" });
});

test("deliveryFor falls back to the style tag when no vocal cue exists", () => {
  assert.deepEqual(deliveryFor("You're better than me.", "playful"), { tag: "playful" });
});

test("deliveryFor returns null when neither a cue nor a style applies", () => {
  assert.equal(deliveryFor("You're better than me.", ""), null);
});