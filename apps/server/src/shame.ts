import type { FastifyInstance } from "fastify";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db, stats, users } from "@pacify/db";

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
};

export async function shameRoutes(app: FastifyInstance) {
  // PUBLIC global wall — EVERY registered user appears here, even at 0 games.
  // This is shared world data (not the client's own cached profile), so it is
  // fetched fresh whenever the Hall of Shame opens.
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
      };
    });

    // THE WALL: most losses on top; ties broken by worse rate, then newer players
    mapped.sort((a, b) => b.losses - a.losses || a.winRate - b.winRate);
    mapped.forEach((r, i) => (r.rank = i + 1));

    return { rows: mapped };
  });
}
