import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOGUE, type BrainView } from "@pacify/engine";

process.env.LLM_PROVIDER = "gemini-interactions";
process.env.GEMINI_API_KEY = "test-only";
process.env.GEMINI_MODEL ??= "gemini-test";
const { pickFromPool } = await import("../src/personality.js");
const { CHARACTERS } = await import("@pacify/ai-brain");
const { buildKleinContext } = await import("../src/klein-context.js");

function view(round = 3): BrainView {
  const n = 8 - round;
  return {
    studentId: 2, round, phase: "commit", myScore: 3, oppScore: 4,
    myHand: CATALOGUE.slice(0, n), oppHand: CATALOGUE.slice(n, 2 * n),
    burned: CATALOGUE.slice(2 * n, 14), peeked: [], oppPeeked: [],
    shieldOff: 0, echoNext: false, rngState: 13579,
  };
}
const rematchContext = buildKleinContext({
  verified: { games: 2, wins: 0, losses: 2, draws: 0 }, hasLegacyHistory: false, hasMet: true,
  recentMatches: [{ result: "loss", playerScore: 6, kleinScore: 21, rounds: [] }],
  recentSpeech: ["Lowest seat. Not the weakest."],
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
const BLOCK = /ACCOUNT CONTEXT — everything you actually know/;

test("account context reaches Klein's duel prompt as verified history plus quoted speech", async () => {
  const v = view();
  const [body] = await capture(() => pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
    { beat: "commit", context: rematchContext }));
  const prompt = text(body);
  assert.match(prompt, BLOCK);
  assert.ok(prompt.includes("Back again? I took the last one."));
  assert.match(prompt, /"kleinWins":2/);
});

test("with account context every turn is self-contained and never resumes a stored conversation", async () => {
  const v = view();
  const [body] = await capture(() => pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
    { beat: "commit", context: rematchContext, interactionId: "chain-from-another-duel" }));
  assert.equal(body.previous_interaction_id, undefined);
  assert.match(text(body), /You are KLEIN/);
});

test("without account context the legacy conversation chain is unchanged", async () => {
  const v = view();
  const [body] = await capture(() => pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
    { beat: "commit", interactionId: "chain-1" }));
  assert.equal(body.previous_interaction_id, "chain-1");
  assert.doesNotMatch(text(body), BLOCK);
});

test("a retry after an invalid pick still tells Klein what happened in earlier rounds", async () => {
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
    assert.equal(sent.length, 2);
    for (const body of sent) {
      assert.match(text(body), /RESULTS OF PREVIOUS ROUNDS/);
      assert.equal(body.previous_interaction_id, undefined);
    }
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
