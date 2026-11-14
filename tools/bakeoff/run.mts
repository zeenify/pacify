/* Provider bakeoff — Gemini (stateful + stateless) vs River (DeepSeek / GLM, low effort).
   Runs the game's REAL prompt shapes through the production provider code path and
   logs every response + latency + token count to tools/bakeoff/logs/.

   Usage (from apps/server so dotenv picks up its .env):
     npx tsx ../../tools/bakeoff/run.mts gemini
     npx tsx ../../tools/bakeoff/run.mts river-deepseek   (needs OPENAI_API_KEY in apps/server/.env)
     npx tsx ../../tools/bakeoff/run.mts river-glm
*/
import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { createProvider, type ChatCompletionOptions, type LLMProvider } from "../../apps/server/src/llm/providers.js";
import { kleinMemoryBrief, VOICE, EPILOGUE_FRAMING, MEMORY_INSTRUCTIONS } from "../../apps/server/src/klein-context.js";
import { CHARACTERS } from "@pacify/ai-brain";
import type { KleinHistory } from "../../apps/server/src/encounter-types.js";

// The live dialogue path uses character.voice (ai-brain) — NOT the scene VOICE.
const DIALOGUE_VOICE = CHARACTERS[2].voice ?? CHARACTERS[2].personality;

const which = process.argv[2] ?? "gemini";
const RUNS = 3; // per surface, for stable min/avg/max

// ---- fixture: a real rematch shape (2 finished duels, player lost the last) ----
const history: KleinHistory = {
  verified: { games: 2, wins: 0, losses: 2, draws: 0 },
  hasLegacyHistory: false, hasMet: true,
  playerName: "Edrick", lastPlayedAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
  recentMatches: [{ result: "loss", playerScore: 5, kleinScore: 11, rounds: [
    { round: 1, klein: "Ogre [4 BAD]", you: "Knight [5 GOOD]", kleinPts: 0, youPts: 5, kleinScore: 0, youScore: 5 },
    { round: 2, klein: "Basilisk [9 BAD]", you: "Wizard [6 GOOD]", kleinPts: 9, youPts: 0, kleinScore: 9, youScore: 5, note: "EXECUTED" },
  ], occurredAt: new Date(Date.now() - 3 * 86400_000).toISOString() }],
  recentSpeech: ["Hey, welcome back! I took the last one, but honestly? Total fluke."],
  playerReplies: ["I'm not letting you win this time, Klein."],
  memories: [{ summary: "They wiped my score with the Basilisk.", moments: [{ round: 2, text: "Their Wizard met my Basilisk; the score wiped to zero for them." }], playerResult: "win", occurredAt: new Date(Date.now() - 3 * 86400_000).toISOString() }],
};
const memory = kleinMemoryBrief(history, {
  heardLines: ["Hey, welcome back! I took the last one."],
  speech: [{ key: "1:commit", round: 1, beat: "commit", message: "Ready when you are." }],
  results: [{ round: 1, klein: "Ogre [4 BAD]", you: "Knight [5 GOOD]", kleinPts: 0, youPts: 5, kleinScore: 0, youScore: 5 }],
});

// ---- surfaces: exact production prompt shapes ----
const COMMIT_INSTRUCTION = `COMMIT BEAT — give one in-character line to your opponent. You do not know which card you are committing (that decision happens elsewhere), so never name, describe or hint at your actual chosen card, even when committing before the opponent. Never claim knowledge of the opponent's current lock or choice. Fake signaling a different card is allowed by your persona — anything you name is automatically a bluff, so sell it casually. Tone tell (private): you feel confident. Let it color HOW you talk. Never state it, never explain why.`;
const THINK_INSTRUCTION = `THINKING BEAT — chat only. No card has been played or committed. Your "message" must be a mood-only, knowledge-neutral in-character pause: do not name, describe, hint at or reveal ANY card, choice, opponent action or strategy. Do not reference numbers, powers, alignments, your hand, tricks or tactics. Do not claim to play, commit, lock, counter or know the opponent's choice.`;
const REVEAL_INSTRUCTION = (pts: string) => `REVEAL BEAT — the cards are now public and the round resolved. This round you scored 0 and they scored 5, so you LOST the round. ${pts} React to what just happened in one short in-character line: the outcome, the swing, the effect. Stay in the moment; no strategy talk about future rounds.`;
const REVEAL_STATUS = `Round 1 just resolved.
You played Ogre [4 BAD]; they played Knight [5 GOOD].
Points this round: you +0, them +5.
Score now: you 0, them 5.`;

const dialogueUser = (beat: string, withResults: boolean) => [
  `YOUR MEMORY OF THIS PLAYER — everything you actually know about your history with them, verified by the server. Its facts are true; quoted speech is only what was said (bluffs included), not fact. If something is not here, you do not remember it — never invent past matches, results, meetings or promises. Let it shape how you talk, never which card to pick.\n${memory}`,
  withResults ? `RESULTS OF PREVIOUS ROUNDS:\n- Round 1: You played Ogre, opponent played Knight. Outcome: you +0, opponent +5. Score after: you 0 - 5 opponent.` : "",
  `Round 2 of 7.
Your score: 0. Opponent score: 5. (Scores are YOURS first, theirs second — never describe their points as yours.)`,
  `LINES YOU HAVE ALREADY SAID (never repeat their wording or their openers): "Hey, welcome back! I took the last one."`,
  `Respond with ONLY a JSON object — no markdown, no code fences, no text outside the JSON — using exactly this key: {"message": "<one short in-character line>"}.`,
  beat,
].filter((s) => s.length > 0).join("\n\n");

type Surface = { name: string; opts: ChatCompletionOptions; expect: "json" | "text" };
const surfaces = (chainHead?: string): Surface[] => [
  { name: "dialogue-commit", expect: "json", opts: {
      messages: [{ role: "system", content: DIALOGUE_VOICE }, { role: "user", content: dialogueUser(COMMIT_INSTRUCTION, true) }],
      responseFormat: { type: "json_object" }, maxTokens: 1024, ...(chainHead ? { previousInteractionId: chainHead } : {}) } },
  { name: "dialogue-thinking", expect: "json", opts: {
      messages: [{ role: "system", content: DIALOGUE_VOICE }, { role: "user", content: dialogueUser(THINK_INSTRUCTION, false) }],
      responseFormat: { type: "json_object" }, maxTokens: 512, ...(chainHead ? { previousInteractionId: chainHead } : {}) } },
  { name: "reaction", expect: "json", opts: {
      messages: [{ role: "system", content: DIALOGUE_VOICE }, { role: "user", content: [memory, REVEAL_STATUS, `Respond with ONLY a JSON object — no markdown, no code fences, no text outside the JSON — using exactly this key: {"message": "<one short in-character line>"}.`, REVEAL_INSTRUCTION("")].join("\n\n") }],
      responseFormat: { type: "json_object" }, maxTokens: 1024 } },
  { name: "scene-prelude", expect: "json", opts: {
      messages: [{ role: "system", content: `${VOICE}

This is the moment right before a duel. Say a few words to the challenger at your table, like one person greeting another, reacting to who they are from your memory. Read the memory below. If they've played before, do NOT explain the basics. Return ONLY JSON: {"chapter":"The Lowest Seat","lines":[{"text":"...","pose":"welcoming"}],"exchange":{"choices":[{"id":"c1","text":"...","response":{"text":"...","pose":"playful"}}]}}. 2-5 short spoken Klein lines (fewer if you know them well), each at most 220 characters, plus 2-3 reply choices with Klein's scripted response each. Plain spoken text only.` }, { role: "user", content: kleinMemoryBrief(history) }],
      responseFormat: { type: "json_object" }, maxTokens: 4096 } },
  { name: "epilogue", expect: "json", opts: {
      messages: [{ role: "system", content: `${VOICE}\n\n${EPILOGUE_FRAMING}
Return ONLY JSON: {"chapter":"After the Duel","lines":[{"text":"...","pose":"thoughtful"}]}. 2-4 lines. No exchange needed here.` }, { role: "user", content: `${kleinMemoryBrief(history)}

THE MATCH THAT JUST ENDED (verified): You took the match 11-5.
Round 1: your Ogre [4 BAD] against their Knight [5 GOOD], 0 to 5; score after you 0-5 them.
Round 2: your Basilisk [9 BAD] against their Wizard [6 GOOD] (a score was wiped to zero), 9 to 0; score after you 11-5 them.` }],
      responseFormat: { type: "json_object" }, maxTokens: 4096 } },
  { name: "memory", expect: "json", opts: {
      messages: [{ role: "system", content: `${MEMORY_INSTRUCTIONS}
1. "summary": one sentence (at most 220 characters) Klein would later remember, first person, casual, warm. It may name the result and score exactly as given. No invented details, no habits, no psychological reads, no promises.
2. "moments": 0-3 short memories of specific rounds (at most 160 characters each). Each names its round number and only what the evidence for that round shows: the cards, the points, the effect, or the swing. Skip quiet rounds. At most one moment may add how it felt, in one short phrase.
WHO WON — read this twice. The evidence's result field is labeled from the PLAYER's perspective: "win" means the PLAYER won and Klein LOST; "loss" means the PLAYER lost and Klein WON; "draw" means level. You write Klein's first-person memory, so a "loss" means Klein says he won or took the match.
Return ONLY JSON: {"summary":"...","moments":[{"round":1,"text":"..."}]}. Plain spoken text only.` }, { role: "user", content: `{"authority":"Server-verified evidence for the match that just finished. Results are PLAYER outcomes.","thisMatch":{"result":"loss","playerScore":5,"kleinScore":11,"rounds":[{"round":1,"played":{"player":"Knight [5 GOOD]","klein":"Ogre [4 BAD]"},"roundPoints":{"player":5,"klein":0},"totalsAfter":{"player":5,"klein":0},"effects":""},{"round":2,"played":{"player":"Wizard [6 GOOD]","klein":"Basilisk [9 BAD]"},"roundPoints":{"player":0,"klein":9},"totalsAfter":{"player":5,"klein":9},"effects":"EXECUTED"}]},"recordBeforeThisMatch":{"games":1,"playerWins":0,"kleinWins":1,"draws":0,"hasMet":true,"playerName":"Edrick"}}` }],
      responseFormat: { type: "json_object" }, maxTokens: 2048 } },
];

// ---- providers under test ----
type Target = { id: string; label: string; make: () => LLMProvider; stateful: boolean };
const geminiKey = process.env.GEMINI_API_KEY;
const riverKey = process.env.OPENAI_API_KEY;
const targets: Target[] = [];
if (which === "gemini" && geminiKey) {
  targets.push({ id: "gemini", label: `gemini-3.5-flash-lite (effort=${process.env.GEMINI_EFFORT ?? "default"})`, stateful: true,
    make: () => createProvider({ provider: "gemini-interactions", geminiInteractions: { apiKey: geminiKey, model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite", effort: process.env.GEMINI_EFFORT ?? "minimal" } }) });
}
if (which.startsWith("river") && riverKey) {
  const model = which === "river-deepseek" ? "deepseek-ai/DeepSeek-V4.1-Flash" : "zai-org/GLM-5.3-Flash";
  targets.push({ id: which, label: `${model} (effort=low)`, stateful: false,
    make: () => createProvider({ provider: "openai", openai: { baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.river.ai/v1", apiKey: riverKey, model, reasoningEffort: "low", timeoutMs: 60000 } }) });
}
if (targets.length === 0) {
  console.error(`No provider configured for "${which}". gemini needs GEMINI_API_KEY; river needs OPENAI_API_KEY in apps/server/.env.`);
  process.exit(1);
}

type Row = { surface: string; run: number; latencyMs: number; tokens: number | null; textLen: number; ok: boolean; error?: string; output: string };
const log: { target: string; label: string; startedAt: string; rows: Row[] }[] = [];

for (const target of targets) {
  const provider = target.make();
  const rows: Row[] = [];
  console.log(`\n===== ${target.label} =====`);
  for (const surface of surfaces()) {
    for (let run = 1; run <= RUNS; run++) {
      const t0 = Date.now();
      try {
        const res = await provider.complete({ ...surface.opts });
        const latency = Date.now() - t0;
        rows.push({ surface: surface.name, run, latencyMs: latency, tokens: res.neurons ?? null, textLen: res.text.length, ok: true, output: res.text.slice(0, 1200) });
        console.log(`  ${surface.name} #${run}: ${latency}ms, ${res.text.length} chars${res.neurons ? `, ${res.neurons} tok` : ""}`);
      } catch (e) {
        rows.push({ surface: surface.name, run, latencyMs: Date.now() - t0, tokens: null, textLen: 0, ok: false, error: String(e).slice(0, 200), output: "" });
        console.log(`  ${surface.name} #${run}: FAILED ${String(e).slice(0, 120)}`);
      }
    }
  }
  // stateful chain probe (gemini only): three chained dialogue turns, deltas only
  if (target.stateful) {
    const chain: Row[] = [];
    let head: string | undefined;
    for (let turn = 1; turn <= 3; turn++) {
      const t0 = Date.now();
      try {
        const res = await provider.complete({
          messages: [{ role: "user", content: turn === 1 ? dialogueUser(COMMIT_INSTRUCTION, true) : `Round ${turn + 1} of 7. Your score: 0. Opponent score: ${turn * 5}. One short in-character line, JSON {"message":"..."}. Do not repeat your previous lines.` }],
          responseFormat: { type: "json_object" }, maxTokens: 512, ...(head ? { previousInteractionId: head } : {}),
        });
        if (res.interactionId) head = res.interactionId;
        chain.push({ surface: `stateful-chain-t${turn}`, run: turn, latencyMs: Date.now() - t0, tokens: res.neurons ?? null, textLen: res.text.length, ok: true, output: res.text.slice(0, 400) });
        console.log(`  stateful-chain t${turn}: ${Date.now() - t0}ms${res.neurons ? `, ${res.neurons} tok` : ""}`);
      } catch (e) {
        chain.push({ surface: `stateful-chain-t${turn}`, run: turn, latencyMs: Date.now() - t0, tokens: null, textLen: 0, ok: false, error: String(e).slice(0, 200), output: "" });
      }
    }
    rows.push(...chain);
  }
  log.push({ target: target.id, label: target.label, startedAt: new Date().toISOString(), rows });
}

mkdirSync("tools/bakeoff/logs", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = `tools/bakeoff/logs/${stamp}-${which}.json`;
writeFileSync(file, JSON.stringify(log, null, 1));
console.log(`\nwritten: ${file}`);

// summary table
for (const entry of log) {
  console.log(`\n== ${entry.label} ==`);
  const bySurface = new Map<string, number[]>();
  for (const r of entry.rows) if (r.ok) {
    bySurface.set(r.surface, [...(bySurface.get(r.surface) ?? []), r.latencyMs]);
  }
  for (const [surface, lat] of bySurface) {
    const avg = Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
    console.log(`  ${surface.padEnd(22)} min ${Math.min(...lat)}ms  avg ${avg}ms  max ${Math.max(...lat)}ms  (n=${lat.length})`);
  }
  const failed = entry.rows.filter((r) => !r.ok).length;
  if (failed) console.log(`  FAILURES: ${failed}`);
}
process.exit(0);
