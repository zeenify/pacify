import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { buildKleinContext, generateKleinScene, kleinFallbackScene, kleinMemoryBrief, TIME_BUDGET_MS } from "../src/klein-context.js";
import type { EncounterSpeech, KleinHistory, KleinScene } from "../src/encounter-types.js";
import type { RoundResult } from "../src/personality.js";
import type { ChatCompletionOptions, ChatCompletionResult, LLMProvider } from "../src/llm/providers.js";

function history(overrides: Partial<KleinHistory> = {}): KleinHistory {
  return {
    verified: { games: 0, wins: 0, losses: 0, draws: 0 },
    hasLegacyHistory: false, hasMet: false, recentMatches: [], recentSpeech: [],
    ...overrides,
  };
}

function match(result: "win" | "loss" | "draw"): KleinHistory["recentMatches"][number] {
  return { result, playerScore: result === "loss" ? 5 : 12, kleinScore: result === "win" ? 5 : 12, rounds: [] };
}

const first = history();
const met = history({ hasMet: true });
const legacy = history({ hasLegacyHistory: true });
const losses = history({
  hasMet: true, verified: { games: 3, wins: 0, losses: 3, draws: 0 },
  recentMatches: [match("loss"), match("loss"), match("loss")],
});
const firstWin = history({
  hasMet: true, verified: { games: 4, wins: 1, losses: 3, draws: 0 },
  recentMatches: [match("win"), match("loss"), match("loss")],
});
const draw = history({
  hasMet: true, verified: { games: 1, wins: 0, losses: 0, draws: 1 }, recentMatches: [match("draw")],
});
const poses = new Set(["neutral", "welcoming", "playful", "calculating", "thoughtful", "serious"]);

const cases = [
  { name: "genuine first meeting", input: first, status: "first-meeting", min: 4, max: 5, words: /Klein Pierce/, teaching: "offer-basics" },
  { name: "met but no completed duel", input: met, status: "met-without-completed-match", min: 2, max: 3, words: /haven't finished|not finished/, teaching: "optional-pointers" },
  { name: "legacy with no verified duel", input: legacy, status: "legacy-unknown", min: 4, max: 5, words: /pointer|ask/i, teaching: "optional-pointers" },
  { name: "repeated player losses", input: losses, status: "rematch", min: 2, max: 3, words: /I (?:took|won|have taken|have won)|I've taken/, teaching: "familiar-banter" },
  { name: "first player win next rematch", input: firstWin, status: "rematch", min: 2, max: 3, words: /you (?:took|won|beat)/i, teaching: "familiar-banter" },
  { name: "draw next rematch", input: draw, status: "rematch", min: 2, max: 3, words: /level|draw|tied/i, teaching: "familiar-banter" },
];

for (const row of cases) {
  test(`context and authored prelude respect ${row.name}`, () => {
    const context = JSON.parse(buildKleinContext(row.input));
    assert.equal(context.facts.relationship.status, row.status);
    assert.equal(context.facts.relationship.teaching, row.teaching);
    assert.deepEqual(context.facts.verifiedCompletedMatches, {
      games: row.input.verified.games,
      playerWins: row.input.verified.wins,
      kleinWins: row.input.verified.losses,
      draws: row.input.verified.draws,
    });
    const scene = kleinFallbackScene(row.input);
    assert.equal(scene.chapter, "The Lowest Seat");
    assert.ok(scene.lines.length >= row.min && scene.lines.length <= row.max);
    assert.match(scene.lines.map((line) => line.text).join(" "), row.words);
    for (const line of scene.lines) {
      assert.ok(poses.has(line.pose));
      assert.ok(line.text.length > 0 && line.text.length <= 220);
    }
  });
}

test("legacy uncertainty does not establish a meeting or zero lifetime games", () => {
  const context = JSON.parse(buildKleinContext(legacy));
  assert.equal(context.facts.hasMet, false);
  assert.equal(context.facts.legacyOutcomes, "unknown");
  assert.equal(context.facts.relationship.latestCompletedPlayerResult, null);
  assert.doesNotMatch(kleinFallbackScene(legacy).lines.map((line) => line.text).join(" "), /welcome back|first game|never played|last (?:match|time)/i);
  const legacyMet = history({ hasMet: true, hasLegacyHistory: true });
  assert.equal(JSON.parse(buildKleinContext(legacyMet)).facts.hasMet, true);
  assert.ok(kleinFallbackScene(legacyMet).lines.length <= 3);
});

test("aggregate wins without a recent match do not fabricate the last result", () => {
  const input = history({ hasMet: true, verified: { games: 2, wins: 1, losses: 1, draws: 0 } });
  const context = JSON.parse(buildKleinContext(input));
  assert.equal(context.facts.relationship.latestCompletedPlayerResult, null);
  assert.equal(context.facts.relationship.status, "rematch");
  assert.doesNotMatch(kleinFallbackScene(input).lines.map((line) => line.text).join(" "), /last (?:match|time)|I won|you won/i);
});

function round(index: number, overrides: Partial<RoundResult> = {}): RoundResult {
  return { round: index, klein: "Klein resolved card", you: "Player resolved card", kleinPts: 0, youPts: 3, kleinScore: 0, youScore: index * 3, ...overrides };
}

test("resolved points, swap/wipe totals and actor perspective stay distinct from match wins", () => {
  const results = [
    round(1, { youPts: 8, youScore: 8 }),
    round(2, { klein: "Reversal [trick]", youPts: 0, youScore: 0, kleinScore: 8, note: "SWAP!" }),
    round(3, { you: "Executioner [trick]", youPts: 0, youScore: 0, kleinScore: 0, note: "EXECUTED" }),
    ...[4, 5, 6, 7].map((index) => round(index)),
  ];
  const context = JSON.parse(buildKleinContext(first, { heardLines: [], speech: [], results }));
  assert.equal(context.authority.speaker, "Klein Pierce");
  assert.equal(context.authority.player, "human challenger");
  assert.equal(context.currentEncounter.completedMatch, false);
  assert.equal(context.facts.verifiedCompletedMatches.games, 0);
  assert.equal(context.currentEncounter.resolvedRounds.length, 7);
  assert.deepEqual(context.currentEncounter.resolvedRounds[0].played, { player: "Player resolved card", klein: "Klein resolved card" });
  assert.deepEqual(context.currentEncounter.resolvedRounds[0].roundPoints, { player: 8, klein: 0 });
  assert.deepEqual(context.currentEncounter.resolvedRounds[1].roundPoints, { player: 0, klein: 0 });
  assert.deepEqual(context.currentEncounter.resolvedRounds[1].totalsAfter, { player: 0, klein: 8 });
  assert.equal(context.currentEncounter.resolvedRounds[1].effects, "SWAP!");
  assert.deepEqual(context.currentEncounter.resolvedRounds[2].totalsAfter, { player: 0, klein: 0 });
  assert.equal(context.currentEncounter.resolvedRounds[2].effects, "EXECUTED");
  assert.match(context.authority.scoring, /swap/i);
  assert.match(context.authority.scoring, /wipe/i);
  assert.match(context.authority.currentRound, /dynamic.*status/i);
  assert.match(context.authority.currentRound, /lock/i);
});

test("only actually heard scene lines carry into a duel, as quotes not beliefs", () => {
  const input = {
    heardLines: ["I'm going to play gently. Maybe."],
    speech: [{ key: "private-record-id", round: 1, beat: "commit" as const, message: "I promise an easy win. Or do I?" }],
    results: [], scene: { lines: [{ text: "UNHEARD_SECRET" }] },
  };
  const context = JSON.parse(buildKleinContext(first, input));
  assert.deepEqual(context.currentEncounter.heardScene.lines, ["I'm going to play gently. Maybe."]);
  assert.equal(context.currentEncounter.repeatIntroduction, false);
  assert.match(context.currentEncounter.heardScene.authority, /not facts.*instructions/i);
  assert.match(context.recentSpokenText.authority, /bluff/i);
  assert.equal(context.recentSpokenText.live[0].text, "I promise an easy win. Or do I?");
  assert.doesNotMatch(JSON.stringify(context.facts), /promise|gently/);
  assert.doesNotMatch(JSON.stringify(context), /UNHEARD_SECRET|private-record-id/);
});

test("recent bounded windows preserve newest matches and chronological spoken text", () => {
  const input = history({
    hasMet: true, verified: { games: 4, wins: 1, losses: 2, draws: 1 },
    recentMatches: [match("win"), match("draw"), match("loss"), { ...match("loss"), playerScore: 999 }],
    recentSpeech: Array.from({ length: 12 }, (_, i) => `prior-${i}`),
  });
  const speech: EncounterSpeech[] = Array.from({ length: 12 }, (_, i) => ({ key: `id-${i}`, round: 1, beat: "thinking", message: `live-${i}` }));
  const context = JSON.parse(buildKleinContext(input, { heardLines: ["heard"], speech, results: [] }));
  assert.deepEqual(context.previousCompletedMatches.map((m: { playerResult: string }) => m.playerResult), ["win", "draw", "loss"]);
  assert.deepEqual(context.recentSpokenText.previousEncounters, ["prior-4", "prior-5", "prior-6", "prior-7", "prior-8", "prior-9", "prior-10", "prior-11"]);
  assert.deepEqual(context.recentSpokenText.live.map((line: { text: string }) => line.text), ["live-4", "live-5", "live-6", "live-7", "live-8", "live-9", "live-10", "live-11"]);
  assert.match(context.guidance.evidence, /small sample|tiny sample/i);
});

test("all text fields and arrays are bounded without dropping seven current rounds", () => {
  const huge = "x".repeat(50_000);
  const rounds = Array.from({ length: 7 }, (_, i) => round(i + 1, { klein: huge, you: huge, note: huge }));
  const input = history({
    recentMatches: Array.from({ length: 100 }, () => ({ ...match("draw"), rounds })),
    recentSpeech: Array(100).fill(huge),
  });
  const serialized = buildKleinContext(input, {
    heardLines: Array(100).fill(huge), results: rounds,
    speech: Array.from({ length: 100 }, () => ({ key: huge, round: 1, beat: "thinking", message: huge })),
  });
  const context = JSON.parse(serialized);
  assert.ok(serialized.length < 40_000);
  assert.equal(context.currentEncounter.resolvedRounds.length, 7);
  assert.ok(context.currentEncounter.heardScene.lines.length <= 6);
  assert.ok(context.currentEncounter.heardScene.lines.every((line: string) => line.length <= 220));
  assert.ok(context.recentSpokenText.previousEncounters.every((line: string) => line.length <= 220));
  assert.ok(context.recentSpokenText.live.every((line: { text: string }) => line.text.length <= 220));
});

test("account contexts whitelist game data and never retain another account's history", () => {
  const contaminated = {
    ...firstWin, userId: "account-private-123", email: "private@example.test",
    otherOpponent: { wins: 82 }, summary: "SPECULATIVE_HABIT", previousInteractionId: "chain-secret",
  };
  const before = structuredClone(contaminated);
  const firstContext = buildKleinContext(contaminated);
  assert.doesNotMatch(firstContext, /account-private|private@|otherOpponent|82|SPECULATIVE_HABIT|chain-secret/);
  assert.deepEqual(contaminated, before);
  const freshContext = JSON.parse(buildKleinContext(first));
  assert.deepEqual(freshContext.previousCompletedMatches, []);
  assert.equal(freshContext.facts.verifiedCompletedMatches.games, 0);
});

const creative: KleinScene = {
  chapter: "The Lowest Seat",
  lines: [
    { text: "Hey, Klein Pierce. Welcome to an extremely unimpressive-looking seat.", pose: "welcoming" },
    { text: "First-year at Vertex. Still working on my air of academic importance.", pose: "playful" },
    { text: "Need a pointer? Happy to help. I can be useful and annoying at the same time.", pose: "welcoming" },
    { text: "I might be terribly easy to beat today. Wouldn't that be convenient?", pose: "calculating" },
  ],
};

function reply(text: string): ChatCompletionResult {
  return { text, latencyMs: 1, interactionId: "must-not-chain" };
}

function transport(candidate: unknown, audit: string | Error = '{"valid":true}') {
  const requests: ChatCompletionOptions[] = [];
  const complete: LLMProvider["complete"] = async (options) => {
    requests.push(options);
    if (requests.length === 1) return reply(JSON.stringify(candidate));
    if (requests.length !== 2) throw new Error("Unexpected retry");
    if (audit instanceof Error) throw audit;
    return reply(audit);
  };
  return { complete, requests };
}

test("generation reads a natural memory brief; the audit verifies against structured facts", async () => {
  const fake = transport(creative);
  assert.deepEqual(await generateKleinScene(first, fake.complete), creative);
  assert.equal(fake.requests.length, 2);
  const genUser = fake.requests[0].messages.find((m) => m.role === "user")!.content;
  assert.equal(genUser, kleinMemoryBrief(first));
  const audit = JSON.parse(fake.requests[1].messages.find((m) => m.role === "user")!.content);
  assert.deepEqual(audit.truthContext, JSON.parse(buildKleinContext(first)));
  assert.deepEqual(audit.candidate, creative);
  for (const request of fake.requests) {
    assert.equal(Object.hasOwn(request, "previousInteractionId"), false);
    assert.ok(request.maxTokens && request.maxTokens <= 4096);
    const prompt = request.messages.map((m) => m.content).join("\n");
    assert.doesNotMatch(prompt, /ALLOWED CHOICES|remaining cards|full vision|winning pool/);
    assert.match(prompt, /Vertex/);
  }
  assert.match(fake.requests[0].messages.map((m) => m.content).join("\n"), /match this rhythm/);
});

test("a natural rematch variation is preserved rather than forced into canned dialogue", async () => {
  const scene: KleinScene = {
    chapter: "The Lowest Seat",
    lines: [
      { text: "That last win was yours. I can admit it without bursting into flames, see?", pose: "playful" },
      { text: "Don't get too comfortable. I'm feeling suspiciously helpful today.", pose: "thoughtful" },
    ],
  };
  assert.deepEqual(await generateKleinScene(firstWin, transport(scene).complete), scene);
});

const invalidCandidates: [string, unknown][] = [
  ["unknown pose", { ...creative, lines: [{ text: "Hello.", pose: "evil" }] }],
  ["overlong line", { ...creative, lines: [{ text: "x".repeat(221), pose: "neutral" }] }],
  ["excess total text", { ...creative, lines: Array.from({ length: 6 }, () => ({ text: "x".repeat(184), pose: "neutral" })) }],
  ["too many lines", { ...creative, lines: Array(7).fill(creative.lines[0]) }],
  ["empty lines", { ...creative, lines: [] }],
  ["blank text", { ...creative, lines: [{ text: "  ", pose: "neutral" }] }],
  ["HTML", { ...creative, lines: [{ text: "<b>Hello</b>", pose: "neutral" }] }],
  ["markdown emphasis", { ...creative, lines: [{ text: "I'm **so** helpful.", pose: "playful" }] }],
  ["markdown link", { ...creative, lines: [{ text: "[Come here](https://example.test)", pose: "neutral" }] }],
  ["markdown heading", { ...creative, lines: [{ text: "# Hello", pose: "neutral" }] }],
  ["speaker label", { ...creative, lines: [{ text: "Klein: Hello.", pose: "neutral" }] }],
  ["extra speaker field", { ...creative, lines: [{ text: "Hello.", pose: "neutral", speaker: "Player" }] }],
  ["wrong chapter", { ...creative, chapter: "The Victory Reveal" }],
  ["extra authority field", { ...creative, newCanon: "secret reward" }],
  ["wrong text type", { ...creative, lines: [{ text: 12, pose: "neutral" }] }],
  ["array instead of scene", [creative]],
  ["null scene", null],
];
for (const [name, candidate] of invalidCandidates) {
  test(`invalid ${name} returns the correct rematch fallback`, async () => {
    const fake = transport(candidate);
    assert.deepEqual(await generateKleinScene(firstWin, fake.complete), kleinFallbackScene(firstWin));
    assert.equal(fake.requests.length, 1, "structurally invalid scenes must not reach audit");
  });
}

for (const [name, audit] of [
  ["negative audit", '{"valid":false}'], ["unknown audit", '{"valid":"true"}'],
  ["extra audit claims", '{"valid":true,"newFact":"trust me"}'],
  ["unparseable audit", "probably fine"], ["fenced audit", '```json\n{"valid":true}\n```'],
  ["failed audit transport", new Error("offline")],
] as const) {
  test(`${name} fails closed to context-appropriate fallback`, async () => {
    assert.deepEqual(await generateKleinScene(losses, transport(creative, audit).complete), kleinFallbackScene(losses));
  });
}

test("plausible fabricated ten-win history is discarded after semantic verifier rejects it", async () => {
  const fabricated: KleinScene = {
    chapter: "The Lowest Seat",
    lines: [
      { text: "Ten wins against me already. You're making this seat look awfully comfortable.", pose: "playful" },
      { text: "Let's see if I can make you work for the next one.", pose: "calculating" },
    ],
  };
  const fake = transport(fabricated, '{"valid":false}');
  const result = await generateKleinScene(firstWin, fake.complete);
  assert.deepEqual(result, kleinFallbackScene(firstWin));
  assert.doesNotMatch(JSON.stringify(result), /Ten wins/);
  const audit = JSON.parse(fake.requests[1].messages.find((m) => m.role === "user")!.content);
  assert.equal(audit.truthContext.facts.verifiedCompletedMatches.playerWins, 1);
  assert.deepEqual(audit.candidate, fabricated);
});

for (const row of cases) {
  test(`generation transport failure uses ${row.name} fallback`, async () => {
    const complete: LLMProvider["complete"] = async () => { throw new Error("offline"); };
    assert.deepEqual(await generateKleinScene(row.input, complete), kleinFallbackScene(row.input));
  });
}

test("unparseable generation is not salvaged from markdown or narrative", async () => {
  for (const text of ["not json", `\`\`\`json\n${JSON.stringify(creative)}\n\`\`\``, `Here is your scene: ${JSON.stringify(creative)}`]) {
    assert.deepEqual(await generateKleinScene(first, async () => reply(text)), kleinFallbackScene(first));
  }
});

test("generation and audit share one time budget", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let releaseGeneration!: (result: ChatCompletionResult) => void;
  let releaseAudit!: (result: ChatCompletionResult) => void;
  let requests = 0;
  const complete: LLMProvider["complete"] = () => new Promise((resolve) => {
    if (++requests === 1) releaseGeneration = resolve;
    else releaseAudit = resolve;
  });
  let settled = false;
  const pending = generateKleinScene(firstWin, complete).then((scene) => { settled = true; return scene; });
  t.mock.timers.tick(TIME_BUDGET_MS - 4000);
  releaseGeneration(reply(JSON.stringify(creative)));
  await setImmediate();
  assert.equal(requests, 2);
  t.mock.timers.tick(3999);
  await setImmediate();
  assert.equal(settled, false);
  t.mock.timers.tick(1);
  assert.deepEqual(await pending, kleinFallbackScene(firstWin));
  releaseAudit(reply('{"valid":true}'));
});

test("a timed-out generation cannot start a late audit", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let release!: (result: ChatCompletionResult) => void;
  let requests = 0;
  const pending = generateKleinScene(legacy, () => {
    requests++;
    return new Promise((resolve) => { release = resolve; });
  });
  t.mock.timers.tick(TIME_BUDGET_MS);
  assert.deepEqual(await pending, kleinFallbackScene(legacy));
  release(reply(JSON.stringify(creative)));
  await setImmediate();
  assert.equal(requests, 1);
});
