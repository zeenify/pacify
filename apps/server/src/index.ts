import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { db, users } from "@pacify/db";
import { CHARACTERS } from "@pacify/ai-brain";
import { authRoutes, uidFromReq } from "./auth.js";
import { shameRoutes } from "./shame.js";
import { campaignRoutes } from "./campaign.js";
import { registerAiPickRoutes } from "./ai-pick.js";
import { registerEncounterRoutes, prepareEncounterPick, type EncounterDependencies } from "./encounters.js";
import { registerVoiceRoutes, voiceFromEnv } from "./voice.js";
import { encounterStore } from "./encounter-store.js";
import { generateKleinScene, generateKleinEpilogue, generateKleinMemory, kleinMemoryBrief } from "./klein-context.js";
import { storyProfile } from "./story-profiles.js";
import { reactToReveal } from "./personality.js";

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

// One shared voice service: /voice streams from it, encounter routes and the
// encounter ai-pick beats issue its tickets. uidFromReq scopes every ticket.
const voice = voiceFromEnv();
registerVoiceRoutes(app, voice, uidFromReq);

const encounterDeps: EncounterDependencies = {
  store: encounterStore,
  authenticate: uidFromReq,
  generateScene: (history, studentId) => generateKleinScene(history, undefined, storyProfile(studentId)),
  generateEpilogue: (history, match, studentId) => generateKleinEpilogue(history, match, undefined, storyProfile(studentId)),
  generateMemory: (history, match, studentId) => generateKleinMemory(history, match, undefined, storyProfile(studentId)),
  react: (history, moment, result, studentId) => reactToReveal(CHARACTERS[storyProfile(studentId).characterId], result, kleinMemoryBrief(history, moment),
    moment.speech.map((s) => s.message).slice(-8)),
  voice,
};
registerEncounterRoutes(app, encounterDeps);
registerAiPickRoutes(app, { prepare: (req) => prepareEncounterPick(req, encounterDeps), voice });

const port = Number(process.env.PORT ?? 3001);
const host = "0.0.0.0";
try {
  await app.listen({ port, host });
  console.log(`pacify-server listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
