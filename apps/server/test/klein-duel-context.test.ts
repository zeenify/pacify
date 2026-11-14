import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOGUE, type BrainView } from "@pacify/engine";

process.env.LLM_PROVIDER = "gemini-interactions";
process.env.GEMINI_API_KEY = "test-only";
process.env.GEMINI_MODEL ??= "gemini-test";
const { pickFromPool } = await import("../src/personality.js");
const { CHARACTERS } = await import("@pacify/ai-brain");
const { kleinMemoryBrief } = await import("../src/klein-context.js");

function view(round = 3): BrainView {
  const n = 8 - round;
  return {
    studentId: 2, round, phase: "commit", myScore: 3, oppScore: 4,
    myHand: CATALOGUE.slice(0, n), oppHand: CATALOGUE.slice(n, 2 * n),
    burned: CATALOGUE.slice(2 * n, 14), peeked: [], oppPeeked: [],
    shieldOff: 0, echoNext: false, rngState: 13579,
  };
}
const rematchContext = kleinMemoryBrief({
  verified: { games: 2, wins: 0, losses: 2, draws: 0 }, hasLegacyHistory: false, hasMet: true,
  playerName: null, lastPlayedAt: null,
  recentMatches: [{ result: "loss", playerScore: 6, kleinScore: 21, rounds: [], occurredAt: new Date().toISOString() }],
  recentSpeech: ["Lowest seat. Not the weakest."], playerReplies: [], memories: [],
}, { heardLines: ["Back again? I took the last one."], speech: [], results: [] });

async function capture(run: () => Promise<unknown>) {
  const original = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init!.body)));
    return new Response(JSON.stringify({ id: "turn", output_text: JSON.stringify({ picked: "bandit", message: "Your move." }) }), { status: 200 });
  };
  try { await run(); } finally { globalThis.fetch = original; }
  return sent;
}
const text = (body: any) => `${body.system_instruction ?? ""}\n${typeof body.input === "string" ? body.input : JSON.stringify(body.input)}`;
const MEMORY = /YOUR MEMORY OF THIS PLAYER/;
const isSpeech = (body: any) => !String(text(body)).includes("ALLOWED CHOICES");

test("prose memory reaches Klein's duel speech as lived experience with quoted history", async () => {
  const v = view();
  const [strategy, speech] = await capture(() => pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
    { beat: "commit", context: rematchContext, situation: "returning" }));
  const prompt = text(speech);
  assert.match(prompt, MEMORY);
  assert.ok(prompt.includes("Back again? I took the last one."));
  assert.match(prompt, /you beat them 2 times/);
  assert.match(text(speech), /You are Klein Pierce/);
  // The strategy call gets the relationship class, never the prose memory.
  assert.doesNotMatch(text(strategy), MEMORY);
  assert.match(text(strategy), /MATCH SITUATION: returning/);
});

test("with account context every turn is self-contained and never resumes a stored conversation", async () => {
  const v = view();
  const [strategy, speech] = await capture(() => pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
    { beat: "commit", context: rematchContext, interactionId: "chain-from-another-duel" }));
  assert.equal(strategy.previous_interaction_id, undefined);
  assert.equal(speech.previous_interaction_id, undefined);
  assert.match(text(speech), MEMORY);
});

test("without account context the legacy conversation chain is unchanged", async () => {
  const v = view();
  const [, speechBody] = await capture(() => pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
    { beat: "commit", interactionId: "chain-1" }));
  assert.equal(speechBody.previous_interaction_id, "chain-1");
  assert.doesNotMatch(text(speechBody), MEMORY);
});

test("a retry after an invalid pick still delivers outcomes exactly once, on the speech call", async () => {
  const original = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init!.body)));
    const picked = sent.length === 1 ? "not-a-card" : "bandit";
    return new Response(JSON.stringify({ id: `turn-${sent.length}`, output_text: JSON.stringify({ picked, message: "Hm." }) }), { status: 200 });
  };
  try {
    const v = view();
    const roundResults = [{ round: 1, klein: "Ogre [3 BAD]", you: "Seraph [10 GOOD]", kleinPts: 0, youPts: 7, kleinScore: 0, youScore: 7 }];
    const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
      { beat: "commit", context: rematchContext, roundResults });
    assert.equal(result.picked.id, "bandit");
    assert.equal(sent.length, 3, "strategy retry fires after the speech call");
    assert.equal(sent.filter(isSpeech).length, 1);
    for (const body of sent) assert.equal(body.previous_interaction_id, undefined);
    assert.match(text(sent[1]), /RESULTS OF PREVIOUS ROUNDS/);
    assert.doesNotMatch(text(sent[0]), /RESULTS OF PREVIOUS ROUNDS/);
    assert.doesNotMatch(text(sent[2]), /RESULTS OF PREVIOUS ROUNDS/);
  } finally { globalThis.fetch = original; }
});

test("offline commit lines never claim to have read the player or to know their move", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    for (let round = 1; round <= 7; round++) {
      const v = view(round);
      const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v, { beat: "commit" });
      assert.doesNotMatch(result.message, /telegraph|read you|saw (that|it) coming|knew you|you (always|never)/i, result.message);
    }
  } finally { globalThis.fetch = original; }
});
