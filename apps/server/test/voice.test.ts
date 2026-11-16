import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { createVoiceService, registerVoiceRoutes } from "../src/voice.js";

const origin = "https://game.example";
const config = { apiKey: "test-key", model: "s2.1-pro-free", voices: { 2: "thoma-id" }, origins: [origin] };

function setup(fetcher: typeof fetch, overrides: Partial<Parameters<typeof createVoiceService>[0]> = {}) {
  const app = Fastify();
  const voice = createVoiceService({ ...config, ...overrides }, { fetch: fetcher });
  registerVoiceRoutes(app, voice, async (req) => req.headers["x-test-user"] as string | undefined ?? null);
  const post = (ticket: string, user = "alice", from = origin) => app.inject({ method: "POST", url: "/voice", headers: { origin: from, "x-test-user": user }, payload: { ticket } });
  return { app, voice, post };
}

test("streams only server-issued speech to its owner with the pinned Fish model", async (t) => {
  const f = setup(async (url, init) => {
    assert.equal(url, "https://api.fish.audio/v1/tts");
    assert.equal((init!.headers as Record<string, string>).model, "s2.1-pro-free");
    assert.deepEqual(JSON.parse(String(init!.body)), { text: "Welcome to the table.", reference_id: "thoma-id", format: "mp3", latency: "balanced" });
    return new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2])); c.enqueue(new Uint8Array([3])); c.close(); } }), { status: 200 });
  });
  t.after(() => f.app.close());
  const ticket = f.voice.issue("alice", 2, "Welcome to the table.")!;
  assert.equal((await f.post(ticket, "bob")).statusCode, 403);
  assert.equal((await f.post(ticket, "alice", "https://evil.example")).statusCode, 403);
  assert.equal((await f.post(ticket + "x")).statusCode, 403);
  const result = await f.post(ticket);
  assert.equal(result.statusCode, 200);
  assert.match(result.headers["content-type"]!, /audio\/mpeg/);
  assert.deepEqual([...result.rawPayload], [1, 2, 3]);
});

test("rejects expired tickets, missing authentication, and disabled model configuration", async (t) => {
  let now = 1000;
  const f = setup(async () => new Response("audio"), { clock: () => now });
  t.after(() => f.app.close());
  const ticket = f.voice.issue("alice", 2, "Hello.")!;
  assert.equal((await f.post(ticket, "")).statusCode, 401);
  now += 31 * 60_000;
  assert.equal((await f.post(ticket)).statusCode, 403);
  const disabled = createVoiceService({ ...config, model: "s2.1-pro-fre" });
  assert.equal(disabled.issue("alice", 2, "Hello."), null);
});

test("reuses completed speech and enforces per-user request limits", async (t) => {
  let calls = 0;
  const f = setup(async () => { calls++; return new Response(new Uint8Array([4, 5])); }, { rateLimit: 2 });
  t.after(() => f.app.close());
  const ticket = f.voice.issue("alice", 2, "Again.")!;
  assert.equal((await f.post(ticket)).statusCode, 200);
  assert.equal((await f.post(ticket)).statusCode, 200);
  assert.equal(calls, 1);
  assert.equal((await f.post(ticket)).statusCode, 429);
});

test("returns text-only failure when Fish rejects a request", async (t) => {
  const f = setup(async () => new Response("secret provider error", { status: 500 }));
  t.after(() => f.app.close());
  const response = await f.post(f.voice.issue("alice", 2, "Hello.")!);
  assert.equal(response.statusCode, 502);
  assert.ok(!response.body.includes("secret provider error"));
});

test("concurrent callers of one line share a single upstream request", async (t) => {
  let calls = 0;
  const f = setup(async () => {
    calls++;
    return new Response(new ReadableStream({
      start(c) { c.enqueue(new Uint8Array([1])); setTimeout(() => { c.enqueue(new Uint8Array([2, 3])); c.close(); }, 30); },
    }), { status: 200 });
  });
  t.after(() => f.app.close());
  const ticket = f.voice.issue("alice", 2, "Shared line.")!;
  const [a, b] = await Promise.all([f.post(ticket), f.post(ticket)]);
  assert.equal(a.statusCode, 200);
  assert.equal(b.statusCode, 200);
  assert.equal(calls, 1);
  assert.deepEqual([...a.rawPayload], [1, 2, 3]);
  assert.deepEqual([...b.rawPayload], [1, 2, 3]);
});

test("abandoning the only listener aborts the upstream request", async (t) => {
  let aborted = false;
  const f = setup((_url, init) => {
    const upstream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array([9]));
        (init!.signal as AbortSignal).addEventListener("abort", () => { aborted = true; c.close(); });
      },
    });
    return new Response(upstream, { status: 200 });
  });
  t.after(() => f.app.close());
  const ticket = f.voice.issue("alice", 2, "Cut short.")!;
  const stream = await f.voice.open(f.voice.verify(ticket, "alice")!);
  assert.ok(stream);
  assert.equal(aborted, false);
  f.voice.abandon(stream);
  assert.equal(aborted, true);
  // The torn-down group frees its slot: a fresh open starts a new upstream call.
  const again = await f.voice.open(f.voice.verify(ticket, "alice")!);
  assert.ok(again);
});

test("an account's cached clips are bounded so one account cannot evict the world", async (t) => {
  const f = setup(async () => new Response(new Uint8Array([7])), { rateLimit: 1000 });
  t.after(() => f.app.close());
  for (let i = 0; i < 30; i++) {
    const res = await f.post(f.voice.issue("alice", 2, `Line ${i}.`)!);
    assert.equal(res.statusCode, 200);
  }
  // Alice's 30th entry pushed her older ones out (24 per account)...
  assert.equal(f.voice.getCached(f.voice.verify(f.voice.issue("alice", 2, "Line 0.")!, "alice")!), null);
  assert.ok(f.voice.getCached(f.voice.verify(f.voice.issue("alice", 2, "Line 29.")!, "alice")!));
  // ...and Bob's single entry is untouched by the flood.
  const bobTicket = f.voice.issue("bob", 2, "Bob line.")!;
  assert.equal((await f.post(bobTicket, "bob")).statusCode, 200);
  assert.ok(f.voice.getCached(f.voice.verify(bobTicket, "bob")!));
});

test("a stream that never produces a byte fails fast without leaking provider state", async (t) => {
  const f = setup(async () => new Response(new ReadableStream({ start() { /* stalls forever */ } }), { status: 200 }), { timeoutMs: 60 });
  t.after(() => f.app.close());
  const started = Date.now();
  const response = await f.post(f.voice.issue("alice", 2, "Silent stream.")!);
  assert.equal(response.statusCode, 502);
  assert.ok(Date.now() - started < 5000);
});

test("a vocal tag is inserted right before its supporting word", async (t) => {
  let spoken = "";
  const f = setup(async (_url, init) => { spoken = JSON.parse(String(init!.body)).text; return new Response(new Uint8Array([1])); });
  t.after(() => f.app.close());
  const ticket = f.voice.issue("alice", 2, "Okay. Heh, sure.", { tag: "chuckling", before: "Heh" })!;
  assert.equal(f.voice.verify(ticket, "alice")!.text, "Okay. [chuckling] Heh, sure.");
  assert.equal((await f.post(ticket)).statusCode, 200);
  assert.equal(spoken, "Okay. [chuckling] Heh, sure.");
});

test("a style tag prepends to the whole line", async (t) => {
  let spoken = "";
  const f = setup(async (_url, init) => { spoken = JSON.parse(String(init!.body)).text; return new Response(new Uint8Array([1])); });
  t.after(() => f.app.close());
  const ticket = f.voice.issue("alice", 2, "I know what you did.", { tag: "low voice" })!;
  assert.equal((await f.post(ticket)).statusCode, 200);
  assert.equal(spoken, "[low voice] I know what you did.");
});

test("different deliveries of one line are distinct cached clips", async (t) => {
  let calls = 0;
  const f = setup(async () => { calls++; return new Response(new Uint8Array([1])); }, { rateLimit: 100 });
  t.after(() => f.app.close());
  const plain = f.voice.issue("alice", 2, "Heh. Okay.")!;
  const tagged = f.voice.issue("alice", 2, "Heh. Okay.", { tag: "chuckling", before: "Heh" })!;
  assert.equal((await f.post(plain)).statusCode, 200);
  assert.equal((await f.post(tagged)).statusCode, 200);
  assert.equal(calls, 2);
  assert.equal((await f.post(tagged)).statusCode, 200);
  assert.equal(calls, 2);
});

test("a tag that would exceed the speakable length is refused", async (t) => {
  const f = setup(async () => new Response(new Uint8Array([1])));
  t.after(() => f.app.close());
  assert.equal(f.voice.issue("alice", 2, "x".repeat(595), { tag: "chuckling" }), null);
  assert.ok(f.voice.issue("alice", 2, "x".repeat(580), { tag: "chuckling" }));
});
