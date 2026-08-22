import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

// Users — auth + coins
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  isGuest: boolean("is_guest").default(true).notNull(),
  coins: integer("coins").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

// Per-student progress — singleton hands, stats for gossip
export const progress = pgTable(
  "progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: integer("student_id").notNull(),
    cleared: boolean("cleared").default(false).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    wins: integer("wins").default(0).notNull(),
    losses: integer("losses").default(0).notNull(),
    draws: integer("draws").default(0).notNull(),
    bestScore: integer("best_score").default(0).notNull(),
    firstClearedAt: timestamp("first_cleared_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.studentId] })],
);

// Global playstyle stats — no favorite_card (random hands)
export const stats = pgTable("stats", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  streak: integer("streak").default(0).notNull(),
  // { saves_tricks_late:0.7, high_early:0.2, risky:0.6, ward_hold_rate:0.5 }
  playstyle: jsonb("playstyle").$type<Record<string, number>>().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Loadouts — 5-card hands
export const loadouts = pgTable("loadouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  deckJson: jsonb("deck_json").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Matches — seed replay for sanity check new_wins <= old_wins+1
export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull(),
  result: text("result", { enum: ["win", "lose", "draw"] }).notNull(),
  totalScore: integer("total_score").notNull(),
  oppScore: integer("opp_score").notNull(),
  seed: bigint("seed", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cosmetics = pgTable(
  "cosmetics",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    acquiredAt: timestamp("acquired_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);

// Per-account per-Student dialogue history — 15-turn window sent to Gemini
export const dialogueHistory = pgTable("dialogue_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull(),
  role: text("role").notNull(), // 'ai'
  line: text("line").notNull(),
  goal: text("goal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prompt hash -> 3 variants cache
export const dialogueCache = pgTable("dialogue_cache", {
  key: text("key").primaryKey(),
  line: text("line").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
