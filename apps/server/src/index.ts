import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { db, users } from "@pacify/db";
import { authRoutes } from "./auth.js";
import { shameRoutes } from "./shame.js";
import { campaignRoutes } from "./campaign.js";
import { rankMoves, CHARACTERS } from "../../../packages/ai-brain/src/index.js";
import { pickFromPool } from "./personality.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true, credentials: true });
await app.register(cookie);
   await app.register(authRoutes);
   await app.register(shameRoutes);
   await app.register(campaignRoutes);

// Health — Render checks this
app.get("/health", async () => ({ ok: true, service: "pacify-server" }));

// Guest auth — creates a real guest row so progress can attach later
app.post("/auth/guest", async () => {
  const [g] = await db.insert(users).values({ isGuest: true }).returning();
  return { id: g.id, displayName: "Guest", isGuest: true };
});

// Progress — fetch once at loading screen (client cache pattern)
app.get("/progress/:userId", async (req) => {
  const { userId } = req.params as any;
  return { userId, progress: [], stats: { wins: 0, losses: 0, draws: 0, playstyle: {} } };
});

// Progress write-through — sanity check new <= old+1 (async, never blocks UI)
app.put("/progress", async (req) => {
  const body = req.body as any;
  // TODO: validate wins/losses increment <=1, else reject
  return { ok: true, received: body };
});

// Dialogue proxy — Gemini key stays server-side, 15-turn memory + gossip + caching
app.post("/dialogue", async (req) => {
  const { studentId, goal, history } = req.body as any;
  // TODO: call Gemini 3.5 Flash Lite, cache 3 variants, fallback to canned
  return { line: `[Student ${studentId} — goal: ${goal}] (stub — Gemini not yet wired)`, historyLength: history?.length ?? 0 };
});

// Match result — seed replay sanity check
app.post("/match-result", async (req) => {
  const body = req.body as any;
  // TODO: replay seed through @pacify/engine, verify score, apply wins+1 check
  return { ok: true };
});

// AI pick — god AI computes the winning pool; the character's LLM persona picks from it.
app.post("/ai-pick", async (req, reply) => {
  const { view, characterId } = (req.body ?? {}) as { view: any; characterId: number };
  if (!view || typeof characterId !== "number") {
    return reply.code(400).send({ error: "view and characterId required" });
  }
  const character = CHARACTERS[characterId];
  if (!character) return reply.code(404).send({ error: `unknown character ${characterId}` });
  const pool = rankMoves(view, { skill: character.skill });
  if (pool.length === 0) return reply.code(400).send({ error: "empty pool" });
  // No ties to break — the single winning move stands (no LLM call needed).
  if (pool.length === 1) {
    return reply.send({ picked: pool[0].card, message: "", reasoning: "Only one winning move.", reasoningContent: "", prompt: "", neurons: 0, latencyMs: 0, pool });
  }
  try {
    const result = await pickFromPool(pool, character, view);
    return reply.send({ ...result, pool });
  } catch (e: any) {
    return reply.code(502).send({ error: e?.message ?? "personality pick failed" });
  }
});

const port = Number(process.env.PORT ?? 3001);
const host = "0.0.0.0";
try {
  await app.listen({ port, host });
  console.log(`pacify-server listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
