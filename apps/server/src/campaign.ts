import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";import jwt from "jsonwebtoken";
import { db, matches, progress, stats, users } from "@pacify/db";

const SECRET = process.env.JWT_SECRET ?? "pacify-dev-secret-change-me";
const COOKIE = "pacify_token";

function uidFromReq(req: any): string | null {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return null;
    return (jwt.verify(token, SECRET) as any)?.uid ?? null;
  } catch {
    return null;
  }
}

export type CampaignStudent = { id: number; seat: string; title: string; tier: number };

// Campaign grid names — real character names, mirrored in
// apps/web/src/data/roster.ts (that file is the refusal-scene source of truth;
// keep the two in sync when a name changes). Only Klein's story/duel exists —
// every other seat refuses.
export const STUDENTS: CampaignStudent[] = [
  { id: 1, seat: "SEAT_01", title: "KLEIN", tier: 1 },
  { id: 2, seat: "SEAT_02", title: "SATO", tier: 2 },
  { id: 3, seat: "SEAT_03", title: "NATHALIE", tier: 3 },
  { id: 4, seat: "SEAT_04", title: "JAXEN", tier: 4 },
  { id: 5, seat: "SEAT_05", title: "HAYDEN", tier: 5 },
  { id: 6, seat: "SEAT_06", title: "HYACINTH", tier: 6 },
  { id: 7, seat: "SEAT_07", title: "YANA", tier: 7 },
  { id: 8, seat: "SEAT_08", title: "TRISTAN", tier: 8 },
  { id: 9, seat: "SEAT_09", title: "NOIR", tier: 9 },
  { id: 10, seat: "SEAT_10", title: "ANTHONY", tier: 10 },
  { id: 11, seat: "SEAT_11", title: "CECILIA", tier: 11 },
  { id: 12, seat: "SEAT_12", title: "REEVE", tier: 12 },
  { id: 13, seat: "SEAT_13", title: "CROWN", tier: 13 },
];

export async function campaignRoutes(app: FastifyInstance) {
  app.get("/campaign", async (req, reply) => {
    const uid = uidFromReq(req);
    if (!uid) return reply.code(401).send({ error: "NOT LOGGED IN" });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, uid)).limit(1);
    if (!user) return reply.code(401).send({ error: "NOT LOGGED IN" });

    const progRows = await db
      .select()
      .from(progress)
      .where(eq(progress.userId, uid));

    const byStudent = new Map(progRows.map((p) => [p.studentId, p]));

    return {
      students: STUDENTS.map((s) => {
        const p = byStudent.get(s.id);
        return {
          ...s,
          cleared: p?.cleared ?? false,
          attempts: p?.attempts ?? 0,
          wins: p?.wins ?? 0,
          losses: p?.losses ?? 0,
          bestScore: p?.bestScore ?? 0,
        };
      }),
      clearedCount: STUDENTS.filter((s) => byStudent.get(s.id)?.cleared).length,
    };
  });

  // GLOBAL SEAT STATS — how the whole world has fared against each of the
  // Thirteen, aggregated from verified match rows. These are the CHARACTER's
  // numbers: `wins` = players the seat beat (player losses), `losses` = times
  // the seat was beaten. 0 matches = 100% (untouched); every player win drags
  // the seat's rate down. Public: global data, no session needed.
  app.get("/campaign/characters", async () => {
    const rows = await db
      .select({
        studentId: matches.studentId,
        wins: sql<number>`count(*) filter (where ${matches.result} = 'lose')::int`,
        losses: sql<number>`count(*) filter (where ${matches.result} = 'win')::int`,
        draws: sql<number>`count(*) filter (where ${matches.result} = 'draw')::int`,
      })
      .from(matches)
      .groupBy(matches.studentId);

    const out: Record<string, { wins: number; losses: number; draws: number; matches: number; winRate: number }> = {};
    for (const st of STUDENTS) out[st.id] = { wins: 0, losses: 0, draws: 0, matches: 0, winRate: 100 };
    for (const r of rows) {
      const total = r.wins + r.losses + r.draws;
      if (!out[r.studentId]) continue;
      out[r.studentId] = {
        wins: r.wins, losses: r.losses, draws: r.draws, matches: total,
        winRate: total === 0 ? 100 : Math.round((r.wins / total) * 1000) / 10,
      };
    }
    return { stats: out };
  });

  // Duel result — the client sends the finished duel's scores; per-student progress
  // and the player's global stats are upserted in one shot. Scores come from the
  // client for now; replay verification against the seed lands with /match-result.
  app.post("/campaign/result", async (req, reply) => {
    const uid = uidFromReq(req);
    if (!uid) return reply.code(401).send({ error: "NOT LOGGED IN" });

    const { studentId, p1Score, p2Score, rounds, seed, transcript } = (req.body ?? {}) as {
      studentId?: number;
      p1Score?: number;
      p2Score?: number;
      rounds?: number;
      seed?: number;
      transcript?: unknown[];
    };
    if (
      typeof studentId !== "number" || !STUDENTS.some((s) => s.id === studentId) ||
      typeof p1Score !== "number" || typeof p2Score !== "number" ||
      p1Score < 0 || p2Score < 0 || p1Score > 200 || p2Score > 200
    ) {
      return reply.code(400).send({ error: "INVALID RESULT" });
    }
    const result = p1Score > p2Score ? "win" : p2Score > p1Score ? "loss" : "draw";
    const won = result === "win";

    await db
      .insert(progress)
      .values({
        userId: uid,
        studentId,
        attempts: 1,
        wins: won ? 1 : 0,
        losses: result === "loss" ? 1 : 0,
        draws: result === "draw" ? 1 : 0,
        bestScore: p1Score,
        cleared: won,
        firstClearedAt: won ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [progress.userId, progress.studentId],
        set: {
          attempts: sql`${progress.attempts} + 1`,
          wins: sql`${progress.wins} + ${won ? 1 : 0}`,
          losses: sql`${progress.losses} + ${result === "loss" ? 1 : 0}`,
          draws: sql`${progress.draws} + ${result === "draw" ? 1 : 0}`,
          bestScore: sql`GREATEST(${progress.bestScore}, ${p1Score})`,
          cleared: sql`${progress.cleared} OR ${won}`,
          firstClearedAt: sql`COALESCE(${progress.firstClearedAt}, CASE WHEN ${won} THEN now() END)`,
        },
      });

    await db
      .insert(stats)
      .values({
        userId: uid,
        wins: won ? 1 : 0,
        losses: result === "loss" ? 1 : 0,
        draws: result === "draw" ? 1 : 0,
        streak: won ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: stats.userId,
        set: {
          wins: sql`${stats.wins} + ${won ? 1 : 0}`,
          losses: sql`${stats.losses} + ${result === "loss" ? 1 : 0}`,
          draws: sql`${stats.draws} + ${result === "draw" ? 1 : 0}`,
          streak: result === "loss" ? sql`0` : won ? sql`${stats.streak} + 1` : sql`${stats.streak}`,
          updatedAt: new Date(),
        },
      });

    return { ok: true, result, cleared: won };
  });
}
