import { and, desc, eq, ne, sql } from "drizzle-orm";
import { characterMemories, db, encounters, matches, progress, stats, users } from "@pacify/db";
import type { EncounterData, EncounterRecord, EncounterStore, KleinMemory } from "./encounter-types.js";
import { EncounterError } from "./encounters.js";
import { replayEncounter } from "./encounter-replay.js";

const record = (row: typeof encounters.$inferSelect): EncounterRecord => ({ ...row, data: row.data as unknown as EncounterData });
const key = (userId: string, id: string) => and(eq(encounters.userId, userId), eq(encounters.id, id));
const freshData = (): EncounterData => ({
  scene: null, readCount: 0, started: false, transcript: [], locks: {}, commits: [], speech: [], result: null,
  epilogue: null, epilogueReadCount: 0, replies: [], generation: {},
});

export function createEncounterStore(database: typeof db): EncounterStore & {
  saveMemory(userId: string, id: string, memory: { summary: string; moments: { round: number; text: string }[] }): Promise<boolean>;
} {
  // executor defaults to the pool; callers inside a transaction MUST pass tx —
  // the pool has max:1, so a pool query while the tx holds the connection deadlocks.
  async function playerLabel(userId: string, exec: Pick<typeof database, "select"> = database): Promise<string> {
    const [user] = await exec.select({ displayName: users.displayName, username: users.username })
      .from(users).where(eq(users.id, userId)).limit(1);
    return user?.displayName ?? user?.username ?? "the challenger";
  }
  return {
  async create(userId, id, seed) {
    const [existing] = await database.select().from(encounters).where(eq(encounters.id, id)).limit(1);
    if (existing) return existing.userId === userId ? record(existing) : null;
    const [rate] = await database.select({ count: sql<number>`count(*)::int` }).from(encounters)
      .where(and(eq(encounters.userId, userId), sql`${encounters.createdAt} > now() - interval '1 minute'`));
    if (rate.count >= 8) throw new EncounterError(429, "Take a moment before starting another encounter");
    await database.insert(encounters).values({ id, userId, studentId: 1, seed, data: freshData() }).onConflictDoNothing();
    return this.read(userId, id);
  },
  async read(userId, id) {
    const [row] = await database.select().from(encounters).where(key(userId, id)).limit(1);
    return row ? record(row) : null;
  },
  async change(userId, id, edit) {
    return database.transaction(async (tx) => {
      const [row] = await tx.select().from(encounters).where(key(userId, id)).for("update");
      if (!row) return null;
      const current = record(row);
      const wasComplete = !!current.completedAt;
      edit(current);
      await tx.update(encounters).set({ data: current.data, completedAt: current.completedAt }).where(key(userId, id));
      if (!wasComplete && current.completedAt) {
        const verified = replayEncounter(current.seed, current.data.transcript, current.data.commits);
        const won = current.data.result === "win", lost = current.data.result === "loss", draw = current.data.result === "draw";
        await tx.insert(matches).values({ id, userId, studentId: 1, seed: current.seed,
          result: won ? "win" : lost ? "lose" : "draw", totalScore: verified.state.p1Score, oppScore: verified.state.p2Score });
        await tx.insert(progress).values({ userId, studentId: 1, attempts: 1, wins: +won, losses: +lost, draws: +draw,
          cleared: won, bestScore: verified.state.p1Score, firstClearedAt: won ? current.completedAt : null })
          .onConflictDoUpdate({ target: [progress.userId, progress.studentId], set: {
            attempts: sql`${progress.attempts} + 1`, wins: sql`${progress.wins} + ${+won}`,
            losses: sql`${progress.losses} + ${+lost}`, draws: sql`${progress.draws} + ${+draw}`,
            cleared: sql`${progress.cleared} OR ${won}`, bestScore: sql`GREATEST(${progress.bestScore}, ${verified.state.p1Score})`,
            firstClearedAt: sql`COALESCE(${progress.firstClearedAt}, ${won ? current.completedAt : null})`,
          } });
        await tx.insert(stats).values({ userId, wins: +won, losses: +lost, draws: +draw, streak: +won })
          .onConflictDoUpdate({ target: stats.userId, set: {
            wins: sql`${stats.wins} + ${+won}`, losses: sql`${stats.losses} + ${+lost}`, draws: sql`${stats.draws} + ${+draw}`,
            streak: won ? sql`${stats.streak} + 1` : lost ? 0 : stats.streak, updatedAt: current.completedAt,
          } });
        // Claim the episodic memory exactly once (unique encounter_id). The LLM
        // writer fills it after commit; pending rows are invisible and retried.
        await tx.insert(characterMemories).values({
          userId, studentId: 1, encounterId: id, result: current.data.result ?? "draw",
          summary: "", moments: [], playerLabel: await playerLabel(userId, tx),
          occurredAt: current.completedAt, status: "pending",
        }).onConflictDoNothing();
      }
      return current;
    });
  },
  async history(userId, excludeId) {
    const scope = and(eq(encounters.userId, userId), eq(encounters.studentId, 1), ne(encounters.id, excludeId));
    const [counts] = await database.select({
      games: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${encounters.data}->>'result' = 'win')::int`,
      losses: sql<number>`count(*) filter (where ${encounters.data}->>'result' = 'loss')::int`,
      draws: sql<number>`count(*) filter (where ${encounters.data}->>'result' = 'draw')::int`,
    }).from(encounters).where(and(scope, sql`${encounters.completedAt} IS NOT NULL`));
    const [legacy] = await database.select({ attempts: sql<number>`coalesce(sum(${progress.attempts}), 0)::int`,
      kleinAttempts: sql<number>`coalesce(sum(${progress.attempts}) filter (where ${progress.studentId} = 1), 0)::int` })
      .from(progress).where(eq(progress.userId, userId));
    const recent = await database.select().from(encounters).where(and(scope, sql`(${encounters.data}->>'started' = 'true' OR (${encounters.data}->>'readCount')::int > 0)`))
      .orderBy(desc(encounters.createdAt)).limit(3);
    const finished = await database.select().from(encounters).where(and(scope, sql`${encounters.completedAt} IS NOT NULL`))
      .orderBy(desc(encounters.completedAt)).limit(3);
    const memoryRows = await database.select().from(characterMemories)
      .where(and(eq(characterMemories.userId, userId), eq(characterMemories.studentId, 1), eq(characterMemories.status, "ready"), ne(characterMemories.encounterId, excludeId)))
      .orderBy(desc(characterMemories.occurredAt)).limit(5);
    const memories: KleinMemory[] = memoryRows.map((row) => ({
      summary: row.summary, moments: row.moments, playerResult: row.result, occurredAt: row.occurredAt.toISOString(),
    }));
    const chronological = [...recent].reverse(); // newest-first query → oldest-first prose
    return {
      verified: counts, hasLegacyHistory: legacy.attempts > counts.games,
      hasMet: recent.length > 0 || legacy.kleinAttempts > 0,
      playerName: await playerLabel(userId),
      lastPlayedAt: finished[0]?.completedAt?.toISOString() ?? null,
      recentMatches: finished.map((row) => {
        const r = record(row), verified = replayEncounter(r.seed, r.data.transcript, r.data.commits);
        return { result: r.data.result!, playerScore: verified.state.p1Score, kleinScore: verified.state.p2Score,
          rounds: verified.results, occurredAt: row.completedAt?.toISOString() ?? "" };
      }),
      playerReplies: chronological.flatMap((row) => record(row).data.replies.map((reply) => reply.text)).slice(-4),
      recentSpeech: chronological.flatMap((row) => {
        const r = record(row);
        return [...(r.data.scene?.lines.slice(0, r.data.readCount).map((l) => l.text) ?? []), ...r.data.speech.map((s) => s.message)];
      }).slice(-8),
      memories,
    };
  },
  async saveMemory(userId, id, memory) {
    const [row] = await database.select().from(encounters).where(key(userId, id)).limit(1);
    if (!row?.completedAt) return false;
    await database.insert(characterMemories).values({
      userId, studentId: 1, encounterId: id, result: (row.data as EncounterData).result ?? "draw",
      summary: memory.summary, moments: memory.moments, playerLabel: await playerLabel(userId),
      occurredAt: row.completedAt, status: "ready",
    }).onConflictDoUpdate({ target: characterMemories.encounterId, set: {
      summary: memory.summary, moments: memory.moments, status: "ready",
    } });
    return true;
  },
  };
}

export const encounterStore = createEncounterStore(db);
