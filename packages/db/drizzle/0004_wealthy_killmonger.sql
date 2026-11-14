CREATE TABLE "character_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"student_id" integer NOT NULL,
	"encounter_id" uuid NOT NULL,
	"result" text NOT NULL,
	"summary" text NOT NULL,
	"moments" jsonb NOT NULL,
	"player_label" text NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "character_memories_encounter_id_unique" UNIQUE("encounter_id")
);
--> statement-breakpoint
ALTER TABLE "character_memories" ADD CONSTRAINT "character_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_memories" ADD CONSTRAINT "character_memories_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_memories_account_idx" ON "character_memories" USING btree ("user_id","student_id");