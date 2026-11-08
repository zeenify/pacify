import assert from "node:assert/strict";
import { test } from "node:test";
import { createProvider } from "../src/llm/providers.js";

test("openai-compatible provider posts chat/completions to the configured base and parses the reply", async () => {
  const original = globalThis.fetch;
  let sent: any;
  globalThis.fetch = async (url, init) => {
    sent = { url: String(url), body: JSON.parse(String(init!.body)), auth: (init!.headers as any).Authorization };
    return new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}", reasoning_content: "thought" } }], usage: { total_tokens: 42 } }), { status: 200 });
  };
  try {
    const provider = createProvider({ provider: "openai", openai: { baseUrl: "https://api.river.ai/v1/", apiKey: "k", model: "zai-org/GLM-5.3-Flash", temperature: 0.8 } });
    const res = await provider.complete({ messages: [{ role: "user", content: "hi" }], responseFormat: { type: "json_object" }, maxTokens: 100 });
    assert.equal(sent.url, "https://api.river.ai/v1/chat/completions");
    assert.equal(sent.auth, "Bearer k");
    assert.equal(sent.body.model, "zai-org/GLM-5.3-Flash");
    assert.equal(sent.body.temperature, 0.8);
    assert.equal(sent.body.max_tokens, 100);
    assert.deepEqual(sent.body.response_format, { type: "json_object" });
    assert.equal(res.text, "{\"ok\":true}");
    assert.equal(res.reasoningContent, "thought");
    assert.equal(res.neurons, 42);
  } finally { globalThis.fetch = original; }
});

test("openai-compatible provider surfaces HTTP errors and refuses missing config", async () => {
  assert.throws(() => createProvider({ provider: "openai", openai: { baseUrl: undefined, apiKey: "k", model: "m" } }), /not configured/);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("nope", { status: 429 });
  try {
    const provider = createProvider({ provider: "openai", openai: { baseUrl: "https://x/v1", apiKey: "k", model: "m" } });
    await assert.rejects(() => provider.complete({ messages: [{ role: "user", content: "hi" }] }), /HTTP 429/);
  } finally { globalThis.fetch = original; }
});
