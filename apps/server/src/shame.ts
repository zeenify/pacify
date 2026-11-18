import type { FastifyInstance } from "fastify";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { db, matches, stats, users } from "@pacify/db";

type SeatRecord = { id: number; w: number; l: number; d: number };

type Row = {
  rank: number;
  name: string;
  isNpc: boolean;
  isMe: boolean;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  played: number;
  winRate: number;
  seatsFought: number;
  /* weighted scores — the wall ranks by these, not raw counts:
     SHAME = losses weighted by (14 - seat tier); losing to the tutorial
     seat is the deepest shame, losing to the Ace is almost respectable.
     CROWN = wins weighted by seat tier; the Ace is worth 13 Kleins. */
  shameScore: number;
  crownScore: number;
  /* per-seat record (PLAYER perspective: w = player beat the seat) for the
     expandable roster rows */
  seats: SeatRecord[];
};

export async function shameRoutes(app: FastifyInstance) {
  // PUBLIC global wall — EVERY registered user appears here, even at 0 games.
  // This is shared world data (not the client's own cached profile), so it is
  // fetched fresh whenever the hall opens. Both boards ride one response —
  // the client flips between Shame and Fame without a refetch.
  app.get("/shame", async (req) => {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        streak: stats.streak,
      })
      .from(users)
      .leftJoin(stats, eq(stats.userId, users.id))
      .where(isNotNull(users.username))
      .orderBy(desc(stats.losses), desc(users.createdAt))
      .limit(100);

    // weighted aggregates from the verified matches table
    const weighted = await db
      .select({
        userId: matches.userId,
        shamePts: sql<number>`coalesce(sum(case when ${matches.result} = 'lose' then 14 - ${matches.studentId} else 0 end), 0)::int`,
        crownPts: sql<number>`coalesce(sum(case when ${matches.result} = 'win' then ${matches.studentId} else 0 end), 0)::int`,
        seats: sql<number>`count(distinct ${matches.studentId})::int`,
      })
      .from(matches)
      .groupBy(matches.userId);
    const byUser = new Map(weighted.map((w) => [w.userId, w]));

    // per-seat records (player perspective) for the expandable roster rows
    const seatRows = await db
      .select({
        userId: matches.userId,
        studentId: matches.studentId,
        w: sql<number>`count(*) filter (where ${matches.result} = 'win')::int`,
        l: sql<number>`count(*) filter (where ${matches.result} = 'lose')::int`,
        d: sql<number>`count(*) filter (where ${matches.result} = 'draw')::int`,
      })
      .from(matches)
      .groupBy(matches.userId, matches.studentId);
    const seatsByUser = new Map<string, SeatRecord[]>();
    for (const s of seatRows) {
      const list = seatsByUser.get(s.userId) ?? [];
      list.push({ id: s.studentId, w: s.w, l: s.l, d: s.d });
      seatsByUser.set(s.userId, list);
    }

    // who am I? (optional)
    let myId: string | null = null;
    try {
      const token = (req.cookies as any)?.pacify_token;
      if (token) {
        const jwt = await import("jsonwebtoken");
        const p = jwt.verify(token, process.env.JWT_SECRET ?? "pacify-dev-secret-change-me") as any;
        myId = p?.uid ?? null;
      }
    } catch {}

    const mapped: Row[] = rows.map((r) => {
      const wins = r.wins ?? 0;
      const losses = r.losses ?? 0;
      const draws = r.draws ?? 0;
      const played = wins + losses + draws;
      const w = byUser.get(r.id);
      return {
        rank: 0,
        name: r.username ?? "UNCLAIMED",
        isNpc: false,
        isMe: !!myId && myId === r.id,
        wins,
        losses,
        draws,
        streak: r.streak ?? 0,
        played,
        winRate: played ? Math.round((wins / played) * 100) : 0,
        seatsFought: w?.seats ?? 0,
        shameScore: w?.shamePts ?? 0,
        crownScore: w?.crownPts ?? 0,
        seats: seatsByUser.get(r.id) ?? [],
      };
    });

    // THE SHAME WALL: weighted shame on top; ties by raw losses, then worse rate
    const shame = [...mapped].sort((a, b) => b.shameScore - a.shameScore || b.losses - a.losses || a.winRate - b.winRate);
    shame.forEach((r, i) => (r.rank = i + 1));

    // THE FAME WALL: weighted crown points; ties by raw wins, then better rate
    const fame = [...mapped].sort((a, b) => b.crownScore - a.crownScore || b.wins - a.wins || b.winRate - a.winRate);

    return { rows: shame, fame };
  });
}
