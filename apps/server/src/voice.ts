import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Readable, Transform } from "node:stream";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { VoiceDirection } from "./voice-direction.js";

const MODEL = "s2.1-pro-free";
const TICKET_MS = 30 * 60_000;
const MAX_TEXT = 600;
const MAX_AUDIO = 2 * 1024 * 1024;
const CACHE_MS = 10 * 60_000;
const MAX_CACHE = 100;
/** Per-account completed-audio cap — one noisy account cannot evict the world. */
const MAX_CACHE_PER_USER = 24;
/** Upstream inactivity watchdog for an OPEN stream (headers already arrived). */
const STALL_MS = 45_000;

type VoiceConfig = {
  apiKey: string;
  model: string;
  voices: Record<number, string>;
  origins: string[];
  enabled?: boolean;
  clock?: () => number;
  rateLimit?: number;
  concurrency?: number;
  timeoutMs?: number;
};
type Ticket = { uid: string; character: number; text: string; exp: number };
type CacheEntry = { data: Buffer; expires: number };
/** One upstream Fish request shared by every concurrent caller of the same line. */
type Group = {
  key: string;
  ctrl: AbortController;
  members: Set<Transform>;
  chunks: Buffer[];
  bytes: number;
  stall: ReturnType<typeof setInterval> | null;
  /** First-byte gate: resolved true on the first upstream byte, false on failure. */
  gate: ((ok: boolean) => void) | null;
};

/** Tickets are issued only from trusted dialogue responses, never from a TTS request body. */
export function createVoiceService(config: VoiceConfig, dependencies: { fetch?: typeof fetch } = {}) {
  const fetchFish = dependencies.fetch ?? fetch;
  const clock = config.clock ?? Date.now;
  const secret = randomBytes(32);
  const enabled = config.enabled !== false && !!config.apiKey && config.model === MODEL && config.origins.length > 0;
  const rates = new Map<string, { count: number; until: number }>();
  const cache = new Map<string, CacheEntry>();
  const cacheByUser = new Map<string, Set<string>>();
  /** cache key -> in-flight upstream group (coalesces duplicate concurrent requests). */
  const groups = new Map<string, Group>();
  const memberGroup = new WeakMap<Transform, Group>();
  const stallMs = () => Math.max(STALL_MS, (config.timeoutMs ?? 20_000) * 2);
  let active = 0;

  function signature(payload: string) { return createHmac("sha256", secret).update(payload).digest("base64url"); }
  /** Bake a Fish delivery tag into the spoken text only — the displayed line is a
   *  separate field, so brackets never reach the bubble or persisted memory. A
   *  vocal tag hugs its supporting word; a style tag prepends to the whole line. */
  function applyDirection(text: string, direction?: VoiceDirection | null): string {
    if (!direction?.tag) return text;
    const tag = `[${direction.tag}] `;
    if (direction.before) {
      const at = text.toLowerCase().indexOf(direction.before.toLowerCase());
      if (at >= 0) return text.slice(0, at) + tag + text.slice(at);
    }
    return tag + text;
  }
  function issue(uid: string, character: number, text: string, direction?: VoiceDirection | null): string | null {
    if (!enabled || !uid || !config.voices[character] || typeof text !== "string" || !text.trim()) return null;
    const spoken = applyDirection(text, direction);
    if (spoken.length > MAX_TEXT) return null;
    const payload = Buffer.from(JSON.stringify({ uid, character, text: spoken, exp: clock() + TICKET_MS })).toString("base64url");
    return `${payload}.${signature(payload)}`;
  }
  function verify(token: unknown, uid: string): Ticket | null {
    if (typeof token !== "string" || token.length > 4096) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = Buffer.from(signature(parts[0]));
    const actual = Buffer.from(parts[1]);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    try {
      const data = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as Ticket;
      if (data.uid !== uid || data.exp <= clock() || !config.voices[data.character] || typeof data.text !== "string" || !data.text.trim() || data.text.length > MAX_TEXT) return null;
      return data;
    } catch { return null; }
  }
  function permitted(uid: string): boolean {
    const now = clock();
    for (const [key, value] of rates) if (value.until <= now) rates.delete(key);
    let entry = rates.get(uid);
    if (!entry) {
      if (rates.size >= 5000) return false;
      entry = { count: 0, until: now + 60_000 };
      rates.set(uid, entry);
    }
    if (entry.count >= (config.rateLimit ?? 30)) return false;
    entry.count++;
    return true;
  }
  function key(ticket: Ticket) { return createHmac("sha256", secret).update(JSON.stringify([ticket.uid, ticket.character, ticket.text])).digest("hex"); }

  function storeCache(id: string, ticket: Ticket, data: Buffer) {
    cache.set(id, { data, expires: clock() + CACHE_MS });
    const mine = cacheByUser.get(ticket.uid) ?? new Set<string>();
    mine.add(id);
    cacheByUser.set(ticket.uid, mine);
    while (mine.size > MAX_CACHE_PER_USER) {
      const oldest = mine.values().next().value!;
      mine.delete(oldest);
      cache.delete(oldest);
    }
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
  }

  /** Tears the group down: abort upstream, fail every attached member. */
  function failGroup(group: Group, error?: Error) {
    if (groups.get(group.key) === group) { groups.delete(group.key); active--; }
    if (group.stall) { clearInterval(group.stall); group.stall = null; }
    group.gate?.(false);
    group.gate = null;
    if (!group.ctrl.signal.aborted) group.ctrl.abort();
    for (const member of group.members) member.destroy(error);
    group.members.clear();
  }

  function armStall(group: Group) {
    if (group.stall) clearInterval(group.stall);
    group.stall = setInterval(() => failGroup(group, new Error("Voice upstream stalled")), stallMs());
  }

  const branchOf = (group: Group) => {
    const branch = new Transform({ transform(chunk: Buffer, _enc, cb) { cb(null, chunk); } });
    // A branch can be destroyed before the route ever pipes it (silent upstream,
    // coalesce loser) — the no-op keeps that from becoming an uncaught 'error'.
    branch.on("error", () => {});
    memberGroup.set(branch, group);
    group.members.add(branch);
    return branch;
  };

  /** Streams the ticket's audio. Concurrent callers of the same line share ONE
   *  upstream request (the first caller's stream is tee'd to later members, who
   *  also receive everything buffered so far); a completed clip is served from
   *  the bounded cache before this is ever reached. Resolves only once the
   *  upstream has produced its first byte — a silent provider fails fast here
   *  (null), so the route never sends headers it cannot back with audio. */
  async function open(ticket: Ticket): Promise<Transform | null> {
    const id = key(ticket);
    const existing = groups.get(id);
    if (existing) {
      const branch = branchOf(existing);
      for (const chunk of existing.chunks) branch.write(chunk);
      return branch;
    }
    if (active >= (config.concurrency ?? 5)) return null;
    const group: Group = { key: id, ctrl: new AbortController(), members: new Set(), chunks: [], bytes: 0, stall: null, gate: null };
    try {
      const response = await fetchFish("https://api.fish.audio/v1/tts", {
        method: "POST", signal: group.ctrl.signal,
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", model: config.model },
        body: JSON.stringify({ text: ticket.text, reference_id: config.voices[ticket.character], format: "mp3", latency: "balanced" }),
      });
      if (!response.ok || !response.body) return null;
      active++;
      groups.set(id, group);
      armStall(group);
      const source = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
      source.on("data", (chunk: Buffer) => {
        armStall(group); // upstream is alive — restart the inactivity window
        if (group.ctrl.signal.aborted) return;
        group.bytes += chunk.length;
        if (group.bytes > MAX_AUDIO) { failGroup(group, new Error("Voice response too large")); return; }
        group.chunks.push(Buffer.from(chunk));
        group.gate?.(true);
        for (const member of group.members) member.write(chunk);
      });
      source.on("error", () => failGroup(group));
      source.on("end", () => {
        // A failed group already tore itself down; only a live one completes.
        if (groups.get(id) !== group) return;
        groups.delete(id);
        active--;
        if (group.stall) { clearInterval(group.stall); group.stall = null; }
        group.gate?.(true);
        group.gate = null;
        storeCache(id, ticket, Buffer.concat(group.chunks));
        for (const member of group.members) member.end();
        group.members.clear();
      });
      const branch = branchOf(group);
      // FIRST-BYTE GATE — hold the response until audio (or failure) is proven.
      const opened = await new Promise<boolean>((resolveGate) => {
        const timer = setTimeout(() => resolveGate(false), config.timeoutMs ?? 20_000);
        group.gate = (ok) => { clearTimeout(timer); group.gate = null; resolveGate(ok); };
        if (group.bytes > 0) group.gate(true); // first byte flew by during setup
      });
      if (!opened) { failGroup(group, new Error("Voice upstream silent")); return null; }
      return branch;
    } catch {
      if (groups.get(id) === group) failGroup(group);
      return null;
    }
  }

  /** Caller went away (navigation/disconnect): drop its branch; abort the shared
   *  upstream only when nobody is still listening. Incomplete audio is never cached. */
  function abandon(stream: Transform) {
    const group = memberGroup.get(stream);
    if (!group) return;
    group.members.delete(stream);
    stream.destroy();
    if (group.members.size === 0 && groups.get(group.key) === group) failGroup(group);
  }

  return {
    issue,
    enabled,
    origins: config.origins,
    verify,
    permitted,
    getCached(ticket: Ticket) {
      const id = key(ticket);
      const entry = cache.get(id);
      if (!entry) return null;
      if (entry.expires <= clock()) { cache.delete(id); return null; }
      cache.delete(id); cache.set(id, entry);
      return entry.data;
    },
    open,
    abandon,
    timeoutMs: config.timeoutMs ?? 20_000,
  };
}

export type VoiceService = ReturnType<typeof createVoiceService>;

/** Structural slice dialogue routes depend on: issue a signed TTS ticket for one
 *  line, or null when voice is disabled / the character has no voice / the text
 *  is not speakable. VoiceService satisfies it; tests may stub it. */
export type VoiceIssuer = Pick<VoiceService, "issue">;

export function registerVoiceRoutes(app: FastifyInstance, voice: VoiceService, authenticate: (req: FastifyRequest) => string | null | Promise<string | null>) {
  app.post("/voice", { bodyLimit: 8192 }, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    const uid = await authenticate(req);
    if (!uid) return reply.code(401).send({ error: "NOT LOGGED IN" });
    if (!voice.enabled) return reply.code(503).send({ error: "Voice unavailable" });
    if (!req.headers.origin || !voice.origins.includes(req.headers.origin)) return reply.code(403).send({ error: "Origin not allowed" });
    const body = req.body as { ticket?: unknown } | null;
    const ticket = voice.verify(body?.ticket, uid);
    if (!ticket) return reply.code(403).send({ error: "Invalid voice ticket" });
    if (!voice.permitted(uid)) return reply.code(429).send({ error: "Voice rate limit" });
    const cached = voice.getCached(ticket);
    if (cached) return reply.type("audio/mpeg").send(cached);
    // open() resolves only once the upstream has PROVEN it can produce audio
    // (first byte) — pre-audio failures (provider error, silence, deadline)
    // surface here as 502 before any headers are sent. Mid-stream hangs are the
    // upstream stall watchdog's job; client disconnects abandon the branch.
    const stream = await voice.open(ticket).catch(() => null);
    if (!stream) return reply.code(502).send({ error: "Voice unavailable" });
    const disconnect = () => { if (!reply.raw.writableEnded) voice.abandon(stream); };
    reply.raw.on("close", disconnect);
    stream.on("close", () => reply.raw.off("close", disconnect));
    return reply.type("audio/mpeg").send(stream);
  });
}

export function voiceFromEnv() {
  return createVoiceService({
    enabled: process.env.FISH_ENABLED === "true",
    apiKey: process.env.FISH_API_KEY ?? "",
    model: process.env.FISH_MODEL ?? "",
    voices: { 2: process.env.FISH_KLEIN_VOICE_ID ?? "ec47a6d54dbe4e1481f66e1d6a94b849" },
    origins: (process.env.FISH_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  });
}
