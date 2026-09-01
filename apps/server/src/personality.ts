import type { Card, BrainView } from "@pacify/engine";
import type { RankedMove, Character } from "@pacify/ai-brain";
import { GAME_RULES } from "./gameRules.js";
import { createProviderFromEnv, type ChatCompletionOptions } from "./llm/providers.js";

const MAX_ATTEMPTS = 3;
const provider = createProviderFromEnv();

export type PersonalityPick = {
  picked: Card;
  message: string;
  reasoning: string;
  reasoningContent: string;
  prompt: string;
  neurons: number;
  latencyMs: number;
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

async function complete(system: string, user: string): Promise<{ text: string; reasoningContent?: string; neurons?: number; latencyMs: number }> {
  const options: ChatCompletionOptions = {
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    responseFormat: { type: "json_object" },
    maxTokens: 2048,
  };
  return provider.complete(options);
}

function buildMessages(pool: RankedMove[], character: Character, view: BrainView, correction?: string) {
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

  // RESPONSE FORMAT (schema + the picked constraint).
  const format = `Respond with ONLY a JSON object — no markdown, no code fences, no text outside the JSON — using exactly these keys and concise values: {"reasoning": "<one short sentence why>", "picked": "<the card id from ALLOWED CHOICES>", "message": "<one short in-character line to your opponent>"}. Every card in ALLOWED CHOICES is a winning move (within 2% of optimal) — pick the one fitting your personality. The "picked" value MUST be one of the ids listed above, verbatim.`;

  const user = [status, "ALLOWED CHOICES (pick exactly one):", poolLines, format, correction]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join("\n\n");
  return { system, user };
}

/** Pick from the god-AI winning pool using the character's LLM persona.
 *  On an invalid pick, resends the prompt with the bad pick noted (up to MAX_ATTEMPTS).
 *  No deterministic fallback: if the LLM never returns a valid card, it throws. */
export async function pickFromPool(pool: RankedMove[], character: Character, view: BrainView): Promise<PersonalityPick> {
  if (pool.length === 0) throw new Error("empty pool");
  let lastBad: string | null = null;
  let lastPrompt = "";
  let totalLatency = 0;
  let totalNeurons = 0;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const correction = lastBad
      ? `\n[CORRECTION] Your previous "picked" value "${lastBad}" was not in the ALLOWED CHOICES. Choose again from the ALLOWED list above.`
      : undefined;
    const { system, user } = buildMessages(pool, character, view, correction);
    lastPrompt = `=== SYSTEM PROMPT ===\n${system}\n\n=== USER PROMPT ===\n${user}`;
    const { text, reasoningContent, neurons, latencyMs } = await complete(system, user);
    totalLatency += latencyMs;
    totalNeurons += neurons ?? 0;
    const parsed = extractJson(text);
    if (!parsed || typeof parsed.picked !== "string") {
      lastBad = parsed?.picked ?? "unparseable-response";
      continue;
    }
    const card = resolveCard(parsed.picked, pool);
    if (!card) {
      lastBad = parsed.picked;
      continue;
    }
    return {
      picked: card,
      message: typeof parsed.message === "string" ? parsed.message : "",
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      reasoningContent: reasoningContent ?? "",
      prompt: lastPrompt,
      neurons: totalNeurons,
      latencyMs: totalLatency,
    };
  }
  throw new Error(`LLM did not return a valid pick after ${MAX_ATTEMPTS} attempts (lastInvalid=${lastBad})`);
}
