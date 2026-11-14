import "dotenv/config";
import { createProvider } from "../../apps/server/src/llm/providers.js";

const provider = createProvider({
  provider: "openai",
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.river.ai/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_DIALOGUE_MODEL ?? "zai-org/GLM-5.3-Flash",
    reasoningEffort: "low",
  },
});
for (let i = 1; i <= 3; i++) {
  const t0 = new Date();
  const res = await provider.complete({
    messages: [
      { role: "system", content: "You are Klein Pierce, a cheerful card-game opponent. One short casual spoken line, JSON {\"message\":\"...\"}." },
      { role: "user", content: `Traffic-proof call ${i} of 3 at ${t0.toISOString()}. Say one playful line about the current score: you 2, them 3. JSON only.` },
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 300,
  });
  console.log(`call ${i}: sent at ${t0.toISOString()} -> ${res.latencyMs}ms, ${res.neurons ?? "?"} tok:`, res.text.slice(0, 140));
}
process.exit(0);
