import assert from "node:assert/strict";
import { test } from "node:test";
import { createProvider, createProviderFromEnv } from "../src/llm/providers.js";

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

test("openai-compatible provider honors per-call reasoning effort over the configured default", async () => {
  const original = globalThis.fetch;
  const bodies: any[] = [];
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init!.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
  };
  try {
    const provider = createProvider({ provider: "openai", openai: { baseUrl: "https://x/v1", apiKey: "k", model: "m", reasoningEffort: "low" } });
    await provider.complete({ messages: [{ role: "user", content: "hi" }] });
    await provider.complete({ messages: [{ role: "user", content: "hi" }], reasoningEffort: "high" });
    await provider.complete({ messages: [{ role: "user", content: "hi" }], reasoningEffort: null });
    assert.equal(bodies[0].reasoning_effort, "low");
    assert.equal(bodies[1].reasoning_effort, "high");
    assert.equal(bodies[2].reasoning_effort, undefined);
  } finally { globalThis.fetch = original; }
});

test("openai-compatible provider aborts requests that exceed the timeout", async () => {
  const original = globalThis.fetch;
  let captured: AbortSignal | undefined;
  globalThis.fetch = async (_url, init) => {
    captured = init!.signal;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 150);
      captured!.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("This operation was aborted")); });
    });
    return new Response(JSON.stringify({ choices: [{ message: { content: "late" } }] }), { status: 200 });
  };
  try {
    const provider = createProvider({ provider: "openai", openai: { baseUrl: "https://x/v1", apiKey: "k", model: "m", timeoutMs: 30 } });
    await assert.rejects(() => provider.complete({ messages: [{ role: "user", content: "hi" }] }), /timed out|abort/i);
    assert.ok(captured);
  } finally { globalThis.fetch = original; }
});

test("createProviderFromEnv resolves role overrides for story and dialogue", async () => {
  const original = { ...process.env };
  process.env.LLM_PROVIDER = "openai";
  process.env.OPENAI_BASE_URL = "https://api.river.ai/v1";
  process.env.OPENAI_API_KEY = "k";
  process.env.OPENAI_MODEL = "zai-org/GLM-5.3";
  process.env.OPENAI_STORY_MODEL = "deepseek-ai/DeepSeek-V4";
  process.env.OPENAI_STORY_EFFORT = "high";
  process.env.OPENAI_DIALOGUE_MODEL = "zai-org/GLM-5.3-Flash";
  process.env.OPENAI_DIALOGUE_EFFORT = "low";
  process.env.OPENAI_REQUEST_TIMEOUT_MS = "1234";
  const bodies: any[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init!.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
  };
  try {
    const story = createProviderFromEnv("story");
    await story.complete({ messages: [{ role: "user", content: "hi" }] });
    const dialogue = createProviderFromEnv("dialogue");
    await dialogue.complete({ messages: [{ role: "user", content: "hi" }] });
    assert.equal(bodies[0].model, "deepseek-ai/DeepSeek-V4");
    assert.equal(bodies[0].reasoning_effort, "high");
    assert.equal(bodies[1].model, "zai-org/GLM-5.3-Flash");
    assert.equal(bodies[1].reasoning_effort, "low");
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
