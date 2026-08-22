ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name_source" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");