import { CATALOGUE, type Card, type BrainView } from "@pacify/engine";
import type { RankedMove, Character } from "@pacify/ai-brain";
import { GAME_RULES } from "./gameRules.js";
import { createProviderFromEnv, type ChatCompletionOptions } from "./llm/providers.js";
import { wrongWinnerClaims } from "./klein-context.js";

const MAX_ATTEMPTS = 3;
let provider: ReturnType<typeof createProviderFromEnv> | undefined;

// One resolved round, as reported by the client. Lets the persona LLM see how the
// earlier rounds actually played out (what each side committed and what it cost),
// which a fresh stateless prompt never showed it.
export interface RoundResult {
  round: number;
  klein: string; // card label Klein played, e.g. "Wizard [6 GOOD]"
  you: string;   // card label the opponent played
  kleinPts: number;
  youPts: number;
  kleinScore: number; // running totals AFTER the round
  youScore: number;
  note?: string; // effect flags, e.g. "VOID", "SWAP!"
}

export type PersonalityPick = {
  picked: Card;
  message: string;
  reasoning: string;
  reasoningContent: string;
  prompt: string;
  neurons: number;
  latencyMs: number;
  // Head of the server-side conversation chain (gemini-interactions provider).
  // The client echoes it back on the next round so history is never resent.
  interactionId: string | null;
  resultsDelivered: boolean;
  // True when the spoken line is a canned transport fallback. Callers persist
  // generated speech as memory but must not teach canned lines back to the model.
  fallback?: boolean;
};

function describe(c: Card): string {
  if (c.kind === "number") return `${c.name} [number ${c.power}${c.align === "bad" ? " BAD" : " GOOD"}]`;
  return `${c.name} [trick]`;
}

// Mirrors engine resolve.roundMultiplier: round 7 = ×2, Echo = +×1, capped ×3.
function roundMult(round: number, echoNext: boolean): number {
  let m = 1;
  if (round === 7) m += 1;
  if (echoNext) m += 1;
  return Math.min(m, 3);
}

function resolveCard(picked: string, pool: RankedMove[]): Card | null {
  const p = picked.trim().toLowerCase();
  for (const m of pool) {
    if (m.card.id.toLowerCase() === p) return m.card;
    if (m.card.name.toLowerCase() === p) return m.card;
  }
  return null;
}

function extractJson(text: string): any | null {
  let raw = text;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) raw = fenced[1];
  // Qwen3 emits <think>…</think> reasoning before the answer — strip it.
  raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function complete(system: string, user: string, previousInteractionId?: string | null): Promise<{ text: string; reasoningContent?: string; neurons?: number; cachedTokens?: number; latencyMs: number; interactionId?: string }> {
  const options: ChatCompletionOptions = {
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    responseFormat: { type: "json_object" },
    maxTokens: 4096,
    previousInteractionId: previousInteractionId ?? undefined,
  };
  // Missing provider configuration must not prevent the server from starting.
  provider ??= createProviderFromEnv("dialogue");
  return provider.complete(options);
}

function buildResultsBlock(roundResults: RoundResult[]): string {
  if (roundResults.length === 0) return "";
  const lines = roundResults.map((r) => {
    const outcome = r.kleinPts || r.youPts
      ? `you +${r.kleinPts}, opponent +${r.youPts}`
      : "no points scored";
    const note = r.note ? ` (${r.note})` : "";
    return `- Round ${r.round}: You played ${r.klein}, opponent played ${r.you}. Outcome: ${outcome}${note}. Score after: you ${r.kleinScore} - ${r.youScore} opponent.`;
  });
  return `RESULTS OF PREVIOUS ROUNDS:\n${lines.join("\n")}`;
}

// Varied, knowledge-neutral pauses. Indexed by a seed derived from the game state
// (never round % N — the same round must not always say the same thing).
// Exported for tests: the anti-repeat + silence contract is defined against the bank.
export const THINKING_FALLBACKS = [
  "Hm, let me think on that.",
  "Give me a second here.",
  "Okay, hold on. Let me think.",
  "Let me cook for a moment.",
  "Hmm. Interesting spot.",
  "Huh. This one deserves a proper pause.",
  "Not yet. Let me settle on something.",
  "Quiet for a second, I'm weighing it.",
  "Oh, this is a fun little spot.",
  "Patience. I'm not in a hurry.",
  "Hmm. You've got me thinking now.",
  "Alright, alright. Decisions.",
  "A moment. I want to enjoy this part.",
];
const COMMIT_FALLBACKS = [
  "Alright, let's see what you've got!",
  "Don't overthink it, okay? Or do. I won't mind, haha.",
  "Ready when you are.",
  "Heh. Okay. I'm in.",
  "Your turn to surprise me.",
  "No pressure, okay? It's just me.",
  "Let's keep this fun.",
  "Deep breath. Here we go.",
  "You look confident today. I like that.",
  "Okay, my turn. Try not to laugh if it's bad.",
  "Whatever happens, this is the fun part.",
  "Watch closely. Or don't. Your call.",
];
const REVEAL_FALLBACKS = [
  "Oh, that stings.",
  "Ha! Did you see that?",
  "Okay, that was dramatic.",
  "Well, that happened. Wow.",
  "Ooh, close one.",
  "That's gonna leave a mark.",
];

/** Punctuation-insensitive comparison: "Wait, what just." and "Wait. What just."
 *  are the same line to a player. */
function sameLine(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return !!a.trim() && !!b.trim() && norm(a) === norm(b);
}

/** Seeded pick from a fallback bank, skipping anything already said recently.
 *  Silence (empty string) beats a repeat when the bank is exhausted. */
function seededPick(seed: number, bank: readonly string[], avoid: readonly string[] = []): string {
  const fresh = bank.filter((line) => !avoid.some((used) => sameLine(line, used)));
  if (fresh.length === 0) return "";
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  x ^= x >>> 12;
  return fresh[Math.abs(x) % fresh.length];
}

const thinkingFallback = (view: BrainView, recent: readonly string[] = []) => seededPick(view.rngState ^ Math.imul(view.round, 0x9e3779b1), THINKING_FALLBACKS, recent);
const commitFallback = (view: BrainView, recent: readonly string[] = []) => seededPick(view.rngState ^ Math.imul(view.round, 0x85ebca6b), COMMIT_FALLBACKS, recent);
const revealFallback = (result: RoundResult, recent: readonly string[] = []) => seededPick(result.kleinScore ^ result.youScore ^ Math.imul(result.round, 0xc2b2ae35), REVEAL_FALLBACKS, recent);

const thinkingLeaks = new RegExp(
  `\\d|\\b(?:${CATALOGUE.map((c) => c.name).join("|")}|` +
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|" +
  "numbers?|powers?|align(?:s|ed|ing|ments?)?|good|bad|cards?|hands?|pick(?:s|ed|ing)?|" +
  "choices?|choos(?:e|es|ing)|chosen|select(?:s|ed|ing|ions?)?|trick(?:s|ery)?|strateg(?:y|ies|ic)|tactic(?:s|al)?|" +
  "play(?:s|ed|ing)?|commit(?:s|ted|ting)?|lock(?:s|ed|ing)?|counter(?:s|ed|ing)?|read(?:s|ing)?|peek(?:s|ed|ing)?|telegraph(?:s|ed|ing)?)\\b", "i");

type Beat = "thinking" | "commit" | "reveal";

function buildStrategyMessages(pool: RankedMove[], character: Character, view: BrainView, situation: string | undefined, correction?: string) {
  // SYSTEM = character persona + reusable game rules (both static).
  const system = [character.personality, GAME_RULES]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join("\n\n");

  // GAME STATUS (dynamic per turn) — consolidated, consistent EFFECTS block.
  const mult = roundMult(view.round, view.echoNext);
  const status = `Round ${view.round} of 7.
Your score: ${view.myScore}. Opponent score: ${view.oppScore}.

GAME EFFECTS:
- Current-round multiplier: ${mult}x${view.round === 7 ? " (Round 7 ×2)" : ""}.
- Echo: ${view.echoNext ? "active — this round is doubled" : "inactive"}.
- Eclipse: ${view.shieldOff > 0 ? `shields disabled for ${view.shieldOff} more round(s)` : "inactive (shields enabled)"}.
- Oracle: ${view.oppPeeked?.length ? `opponent has peeked ${view.oppPeeked.length} of your cards` : "inactive"}.

Your remaining cards: ${view.myHand.map(describe).join(", ")}.
Opponent's remaining cards (you have full vision): ${view.oppHand?.length ? view.oppHand.map(describe).join(", ") : "n/a"}.
Burned: ${view.burned?.length ? view.burned.map(describe).join(", ") : "none"}.`;

  // ALLOWED CHOICES (the god-AI winning pool). The search-value is intentionally
  // omitted so the LLM can't just pick the highest-ranked move — personality decides.
  const poolLines = pool
    .map((m, i) => `${i + 1}. id="${m.card.id}" ${describe(m.card)}`)
    .join("\n");

  // RESPONSE FORMAT (schema + the picked constraint). No message field: speech is
  // generated by a separate call that never sees this hand or pool.
  const format = `Respond with ONLY a JSON object — no markdown, no code fences, no text outside the JSON — using exactly these keys and concise values: {"reasoning": "<one short sentence why>", "picked": "<the card id from ALLOWED CHOICES>"}. Every card in ALLOWED CHOICES is a winning move (within 2% of optimal) — pick the one fitting your personality. The "picked" value MUST be one of the ids listed above, verbatim.`;

  const matchNote = situation
    ? `MATCH SITUATION: ${situation} (verified by the server; "first-meeting" = this player is new to you, "returning" = you know them). Trust it for how you approach this duel. Do not claim history beyond it.`
    : undefined;

  const user = [status, matchNote, "ALLOWED CHOICES (pick exactly one):", poolLines, format, correction]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join("\n\n");
  return { system, user };
}

/** Public-information status for the speech call. Deliberately excludes hands,
 *  burned cards and the winning pool: a commit line structurally cannot disclose
 *  the chosen card because the speech model never learns it. */
function buildPublicStatus(view: BrainView): string {
  const mult = roundMult(view.round, view.echoNext);
  return `Round ${view.round} of 7.
Your score: ${view.myScore}. Opponent score: ${view.oppScore}. (Scores are YOURS first, theirs second — never describe their points as yours.)

GAME EFFECTS:
- Current-round multiplier: ${mult}x${view.round === 7 ? " (Round 7 ×2)" : ""}.
- Echo: ${view.echoNext ? "active — this round is doubled" : "inactive"}.
- Eclipse: ${view.shieldOff > 0 ? `shields disabled for ${view.shieldOff} more round(s)` : "inactive (shields enabled)"}.
- Oracle: ${view.oppPeeked?.length ? `opponent has peeked ${view.oppPeeked.length} of your cards` : "inactive"}.`;
}

function revealStatus(result: RoundResult): string {
  const parts: string[] = [];
  if (/SWAP/.test(result.note ?? "")) parts.push("the totals swapped");
  if (/EXECUTED/.test(result.note ?? "")) parts.push("a score was wiped to zero");
  if (/WARD/.test(result.note ?? "")) parts.push("a trick got blocked");
  if (/VOID/.test(result.note ?? "")) parts.push("the round was voided");
  if (/ECLIPSE/.test(result.note ?? "")) parts.push("shields came down");
  if (/NEXT ×2/.test(result.note ?? "")) parts.push("the next round got doubled");
  if (/ORACLE/.test(result.note ?? "")) parts.push("someone peeked at a hand");
  return `Round ${result.round} just resolved.
You played ${result.klein}; they played ${result.you}.
Points this round: you +${result.kleinPts}, them +${result.youPts}.
Score now: you ${result.kleinScore}, them ${result.youScore}.${parts.length ? `\nWhat made it dramatic: ${parts.join(", ")}.` : ""}`;
}

function buildSpeechMessages(character: Character, view: BrainView, roundResults: RoundResult[], beat: Beat, context?: string, reveal?: RoundResult, recent: readonly string[] = [], stance?: string) {
  // SYSTEM = voice only. The tactical persona never reaches the speech call.
  const system = character.voice ?? character.personality;

  const account = context
    ? `YOUR MEMORY OF THIS PLAYER — everything you actually know about your history with them, verified by the server. Its facts are true; quoted speech is only what was said (bluffs included), not fact. If something is not here, you do not remember it — never invent past matches, results, meetings or promises. Let it shape how you talk, never which card to pick.\n${context}`
    : undefined;
  const results = buildResultsBlock(roundResults);
  const status = reveal ? revealStatus(reveal) : buildPublicStatus(view);

  // Anti-repetition: the model sees its own recent lines so it varies openers.
  const saidAlready = recent.length
    ? `LINES YOU HAVE ALREADY SAID (never repeat their wording or their openers): ${recent.map((l) => `"${l}"`).join(" ")}`
    : undefined;
  // Semantic variety: wording can be new while the idea repeats — name that too.
  const variety = `DIALOGUE VARIETY: avoid repeating not only the wording of lines you have already said, but the same idea, joke, observation or emotional beat. If you recently teased the opponent, do not immediately tease them again in different words. Do not force a signature phrase, pet name, catchphrase or habit into every response, and do not treat every beat as a chance to be clever. Mundane, awkward, unfinished and quiet lines are allowed, and often better than a polished one.`;
  // Fish delivery tags: the model seasons its own lines; the display layer strips
  // brackets, the ticket path keeps them. The engine accepts invented tags.
  const tags = `DELIVERY TAGS (the voice engine reads these — use them liberally, they are what makes you sound alive): season your line with inline [bracket] delivery tags. Vocal events: [laughing], [chuckling], [snickering], [sighing], [exhaling], [gasp], [snorting], [stifled laugh], [groaning], [crying softly]. Delivery: [whispering], [low voice], [softening], [rising tone], [through gritted teeth], [mockingly], [deadpan], [exaggerated], [suddenly quiet], [voice cracking], [pausing], [clearing throat]. Invent any tag that fits the moment; there is no fixed list. Use one to three per line, placed beside the word they color, like "Oh [laughing] wonderful. You broke my streak." or "[sighing] Fine. [quieter] Barely." Tags are never shown to the player; they only flavor the voice.`;
  // Private tone tell for commit beats only: a coarse stance derived server-side
  // from the decision, never its semantics. Thinking beats stay knowledge-neutral.
  const tell = beat === "commit" && stance
    ? `TONE TELL (private, this moment only): you feel ${stance}. Let it change HOW you talk and WHETHER you talk: how much you say, how long your sentence is, whether you joke, whether you get defensive, whether you are unusually sincere or unusually quiet. Never state it, never explain why.`
    : undefined;

  const format = `Respond with ONLY a JSON object — no markdown, no code fences, no text outside the JSON — using exactly this key: {"message": "<one in-character line; a couple of short sentences at most>"}.`;

  const beatInstruction = beat === "thinking"
    ? `THINKING BEAT — no card has been played or committed, and you have no new game information to react to. Speak naturally if you have something worth saying, or stay almost quiet if you don't. You may react to the atmosphere, your own uncertainty, impatience, confidence, boredom, amusement, frustration, or the fact that the opponent is taking their time. You may make ordinary conversation, tease the opponent, change your mind mid-sentence, or let a thought trail off. Do not reveal, imply, hint at, or discuss any card, choice, hand, action, strategy, power, alignment, or outcome. Avoid filler; if your character would naturally say nothing, keep the line extremely brief.`
    : beat === "commit"
      ? `COMMIT BEAT — give one in-character line to your opponent. You do not know which card you are committing (that decision happens elsewhere), so never name, describe or hint at your actual chosen card, even when committing before the opponent. Never claim knowledge of the opponent's current lock or choice. The line does NOT have to sound like a move announcement: ordinary conversation is welcome ("you look pleased with yourself", "this room gets colder every night"). Bluffing or fake-signaling a different card is optional and persona-dependent — some seats bluff often, some almost never; anything you name is automatically a bluff, so sell it casually.`
      : `REVEAL BEAT — the round has just resolved: you scored ${reveal?.kleinPts ?? 0} and they scored ${reveal?.youPts ?? 0}. React to the actual result and what happened, as a person sitting across the table would. Your reaction does not have to be a quip, taunt, compliment or acknowledgment of the score: you may laugh, get annoyed, go quiet, sound surprised, question what just happened, dismiss it, admit you were wrong, or react to one specific detail. Let the result move your mood without forcing a big reaction when the moment doesn't warrant one. Avoid stock reactions like "Interesting", "Well played", "Noted" or "I see" unless that is genuinely what you would say. Do not discuss future rounds or reveal your strategy.`;

  const user = [account, results, status, saidAlready, variety, tags, tell, format, beatInstruction]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join("\n\n");
  return { system, user };
}

/** Pick from the god-AI winning pool: one stateless strategy call chooses the card,
 *  one voice call writes the line. They run concurrently, so latency is the slower
 *  of the two, not the sum. The voice call never sees the hand, pool or pick —
 *  commit-beat leaks are structurally impossible, not prompt-discipline hopes.
 *
 *  Stateful mode: the conversation chain (interactionId) belongs to the VOICE call.
 *  Strategy calls are always stateless, so a strategy correction never forks or
 *  double-delivers the chain. `ctx.roundResults` is delivered to the chain exactly
 *  once; after a delivered turn, only the round delta goes over the wire. */
export async function pickFromPool(
  pool: RankedMove[],
  character: Character,
  view: BrainView,
  ctx?: { interactionId?: string | null; roundResults?: RoundResult[]; beat?: Beat; context?: string; situation?: string; recent?: string[]; stance?: string },
): Promise<PersonalityPick> {
  if (pool.length === 0) throw new Error("empty pool");
  const beat = ctx?.beat ?? "commit";
  const roundResults = ctx?.roundResults ?? [];
  const chainHead = ctx?.context ? null : ctx?.interactionId ?? null;
  let lastStrategyPrompt = "";
  let lastSpeechPrompt = "";
  let totalLatency = 0;
  let totalNeurons = 0;

  // SPEECH — fired first after the strategy request so mock/concurrent fetch
  // ordering stays deterministic (strategy body, then speech body).
  const strategyWork = (async (): Promise<{ card: Card; reasoning: string; fellBack: boolean }> => {
    let lastBad: string | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const correction = lastBad
        ? `\n[CORRECTION] Your previous "picked" value "${lastBad}" was not in the ALLOWED CHOICES. Choose again from the ALLOWED list above.`
        : undefined;
      const { system, user } = buildStrategyMessages(pool, character, view, ctx?.situation, correction);
      lastStrategyPrompt = `=== STRATEGY PROMPT ===\n${system}\n\n=== USER PROMPT ===\n${user}`;
      let text: string;
      let latencyMs: number;
      let neurons: number | undefined;
      try {
        ({ text, latencyMs, neurons } = await complete(system, user));
      } catch {
        // Transport/config failure — retrying won't help mid-duel; degrade to the
        // god pool argmax and let the voice call (or its fallback) carry the beat.
        return { card: pool[0].card, reasoning: "fallback: LLM unavailable — god pool argmax", fellBack: true };
      }
      totalLatency += latencyMs;
      totalNeurons += neurons ?? 0;
      const parsed = extractJson(text);
      const card = parsed && typeof parsed.picked === "string" ? resolveCard(parsed.picked, pool) : null;
      if (card) return { card, reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "", fellBack: false };
      lastBad = parsed?.picked ?? "unparseable-response";
    }
    return { card: pool[0].card, reasoning: "fallback: invalid strategy output — god pool argmax", fellBack: true };
  })();

  const speechWork = (async (): Promise<{ message: string; interactionId: string | null; resultsDelivered: boolean; fallback: boolean; reasoningContent: string }> => {
    const { system, user } = buildSpeechMessages(character, view, roundResults, beat, ctx?.context, beat === "reveal" ? roundResults.at(-1) : undefined, ctx?.recent ?? [], ctx?.stance);
    lastSpeechPrompt = `=== SPEECH PROMPT ===\n${system}\n\n=== USER PROMPT ===\n${user}`;
    let text: string;
    let reasoningContent: string | undefined;
    let neurons: number | undefined;
    let latencyMs: number;
    let newId: string | undefined;
    try {
      ({ text, reasoningContent, neurons, latencyMs, interactionId: newId } = await complete(system, user, chainHead));
    } catch {
      // Transport failure: keep the chain head and resend outcomes on the next turn.
      return {
        message: beat === "thinking" ? thinkingFallback(view, ctx?.recent) : beat === "reveal" && roundResults.at(-1)
          ? revealFallback(roundResults.at(-1)!, ctx?.recent) : commitFallback(view, ctx?.recent),
        interactionId: chainHead, resultsDelivered: false, fallback: true, reasoningContent: "",
      };
    }
    totalLatency += latencyMs;
    totalNeurons += neurons ?? 0;
    const parsed = extractJson(text);
    const raw = typeof parsed?.message === "string" ? parsed.message : "";
    const leaked = beat === "thinking" && (raw.trim().length === 0 || thinkingLeaks.test(raw));
    // Verbatim repeats are rejected deterministically — the prompt asks the model
    // not to repeat, but only this check guarantees it.
    const repeated = raw.trim().length > 0 && (ctx?.recent ?? []).some((l) => sameLine(raw, l));
    const canned = leaked || raw.trim().length === 0 || repeated;
    return {
      message: canned
        ? beat === "reveal" && roundResults.at(-1) ? revealFallback(roundResults.at(-1)!, ctx?.recent)
          : beat === "commit" ? commitFallback(view, ctx?.recent)
          : thinkingFallback(view, ctx?.recent)
        : raw,
      interactionId: newId ?? null,
      resultsDelivered: true,
      fallback: canned,
      reasoningContent: reasoningContent ?? "",
    };
  })();

  const [strategy, speech] = await Promise.all([strategyWork, speechWork]);
  const newId = speech.interactionId;
  const interactionId = newId && !ctx?.context ? newId : chainHead;
  return {
    picked: strategy.card,
    message: speech.message,
    reasoning: strategy.reasoning,
    reasoningContent: speech.reasoningContent,
    prompt: `${lastStrategyPrompt}\n\n${lastSpeechPrompt}`,
    neurons: totalNeurons,
    latencyMs: totalLatency,
    interactionId,
    resultsDelivered: speech.resultsDelivered,
    fallback: speech.fallback,
  };
}

/** Post-reveal reaction for a resolved round. Stateless, voice-only, no hands or
 *  pool — the outcome is public, so this can react to exactly what happened.
 *  `recent` lines are excluded from fallbacks and flagged to the model; an
 *  exhausted bank returns "" (silence beats a repeat). */
export async function reactToReveal(
  character: Character,
  result: RoundResult,
  context?: string,
  recent: readonly string[] = [],
): Promise<{ message: string; fallback: boolean; neurons: number; latencyMs: number }> {
  const { system, user } = buildSpeechMessages(character, {
    round: result.round, myScore: result.kleinScore, oppScore: result.youScore,
  } as BrainView, [result], "reveal", context, result, recent);
  try {
    provider ??= createProviderFromEnv("dialogue");
    const { text, neurons, latencyMs } = await provider.complete({
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      responseFormat: { type: "json_object" }, maxTokens: 1024,
    });
    const parsed = extractJson(text);
    const raw = typeof parsed?.message === "string" ? parsed.message : "";
    const repeated = raw.trim().length > 0 && recent.some((l) => sameLine(raw, l));
    // Round outcome is fact: a reaction claiming the opposite winner is a
    // perspective slip ("Did I actually just do that?" when he lost the round).
    const flipped = raw.trim().length > 0 && wrongWinnerClaims(raw,
      result.kleinPts > result.youPts ? "loss" : result.kleinPts < result.youPts ? "win" : "draw");
    if (!raw.trim() || repeated || flipped) return { message: revealFallback(result, recent), fallback: true, neurons: neurons ?? 0, latencyMs };
    return { message: raw, fallback: false, neurons: neurons ?? 0, latencyMs };
  } catch {
    return { message: revealFallback(result, recent), fallback: true, neurons: 0, latencyMs: 0 };
  }
}
