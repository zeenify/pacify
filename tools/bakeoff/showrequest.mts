import "dotenv/config";
import { createProvider } from "../../apps/server/src/llm/providers.js";
import { CHARACTERS } from "@pacify/ai-brain";

// Wrap fetch to dump the exact request the game makes, then run ONE real
// commit-beat dialogue call through the production provider code path.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const headers = init?.headers as Record<string, string>;
  console.log("=========== REQUEST ===========");
  console.log("METHOD:", init?.method);
  console.log("URL   :", url);
  console.log("HEADERS:");
  for (const [k, v] of Object.entries(headers ?? {})) {
    const shown = k.toLowerCase() === "authorization" ? v.slice(0, 14) + "...<masked>" : v;
    console.log("  " + k + ": " + shown);
  }
  const body = JSON.parse(String(init?.body));
  const preview = body.messages.map((m: any) => {
    const c = String(m.content);
    const trimmed = c.length > 300 ? c.slice(0, 300) + " …[truncated, total " + c.length + " chars]" : c;
    return { role: m.role, content: trimmed };
  });
  console.log("BODY (pretty):");
  console.log(JSON.stringify({ ...body, messages: preview }, null, 2));
  console.log("=========== END REQUEST ===========");
  return originalFetch(url, init);
};

const provider = createProvider({
  provider: "openai",
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.river.ai/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_DIALOGUE_MODEL ?? "zai-org/GLM-5.3-Flash",
    reasoningEffort: process.env.OPENAI_DIALOGUE_EFFORT ?? "low",
  },
});

const res = await provider.complete({
  messages: [
    { role: "system", content: (CHARACTERS[2].voice ?? "").slice(0, 400) + " …[full voice prompt]" },
    { role: "user", content: `YOUR MEMORY OF THIS PLAYER — …(prose memory brief)\n\nRound 2 of 7.\nYour score: 0. Opponent score: 5.\n\nRespond with ONLY a JSON object — using exactly this key: {"message": "<one short in-character line>"}.\n\nCOMMIT BEAT — give one in-character line to your opponent. You do not know which card you are committing…` },
  ],
  responseFormat: { type: "json_object" },
  maxTokens: 1024,
});

console.log("=========== RESPONSE ===========");
console.log("text:", res.text.slice(0, 300));
console.log("latencyMs:", res.latencyMs, "| tokens:", res.neurons ?? null);
process.exit(0);
