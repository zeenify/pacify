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
  index,
} from "drizzle-orm/pg-core";

// Users — auth + coins
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique(), // registered login (guests are null)
  email: text("email").unique(), // optional — recovery + name harvest
  passwordHash: text("password_hash"),
  displayName: text("display_name"), // real-ish name parsed from email
  nameSource: text("name_source", { enum: ["typed", "email", "google"] }), // how displayName was obtained
  isGuest: boolean("is_guest").default(true).notNull(),
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

export const encounters = pgTable("encounters", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull(),
  seed: bigint("seed", { mode: "number" }).notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (t) => [index("encounters_account_created_idx").on(t.userId, t.createdAt)]);

// One verified episodic memory per finished encounter. Claimed (pending) inside the
// completion transaction, then filled outside any transaction by the LLM writer;
// pending rows are invisible to prompts and retried idempotently by the epilogue route.
export const characterMemories = pgTable("character_memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull(),
  encounterId: uuid("encounter_id")
    .notNull()
    .references(() => encounters.id, { onDelete: "cascade" })
    .unique(),
  result: text("result", { enum: ["win", "loss", "draw"] }).notNull(),
  summary: text("summary").notNull(),
  moments: jsonb("moments").$type<{ round: number; text: string }[]>().notNull(),
  playerLabel: text("player_label").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  status: text("status", { enum: ["pending", "ready"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("character_memories_account_idx").on(t.userId, t.studentId)]);

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
